import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";

import { Octokit } from "octokit";

type RenderedContent = NonNullable<
  ReturnType<LoaderContext["store"]["entries"]>[number][1]["rendered"]
>;

type LoaderOptions = {
  repoUrl: string;
  apiKey: string;
  renderer?: (body: string) => RenderedContent | Promise<RenderedContent>;
};

const discussionAuthorSchema = z.object({
  login: z.string(),
  url: z.string().url(),
});

const discussionLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const discussionSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  body: z.string(),
  url: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: discussionAuthorSchema,
  labels: z
    .union([
      z.object({
        nodes: z.array(discussionLabelSchema),
      }),
      z.array(discussionLabelSchema),
    ])
    .transform((data) => (Array.isArray(data) ? data : data.nodes)),
});

export function ghDiscussionsLoader(options: LoaderOptions): Loader {
  return {
    name: "gh-discussions-loader",
    load: async (context) => {
      const octokit = new Octokit({ auth: options.apiKey });
      const urlParts = options.repoUrl.split("/");
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];

      try {
        const { repository } = await octokit.graphql<{
          repository: { discussions: { nodes: Record<string, unknown>[] } };
        }>(
          `
          query getDiscussions($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              discussions(first: 100) {
                nodes {
                  id
                  number
                  title
                  body
                  url
                  labels(first: 100) {
                    nodes {
                      id
                      name
                    }
                  }
                  createdAt
                  updatedAt
                  author {
                    login
                    url
                  }
                }
              }
            }
          }
        `,
          {
            owner,
            repo,
          },
        );

        repository.discussions.nodes.forEach(async (rawDiscussion) => {
          const discussion = z
            .object({ id: z.string(), body: z.string() })
            .passthrough()
            .parse(rawDiscussion);
          const renderedBody = await options.renderer?.(discussion.body);
          const data = await context.parseData({ id: discussion.id, data: discussion });
          context.store.set({ id: data.id, data, rendered: renderedBody });
        });
      } catch (error) {
        console.error("Error fetching GitHub discussions:", error);
        context.store.set({ id: "error", data: { error: "Failed to fetch discussions" } });
      }
    },
    schema: discussionSchema,
  };
}
