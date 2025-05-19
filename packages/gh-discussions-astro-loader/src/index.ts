import { z } from "astro:content";
import type { Loader } from "astro/loaders";

import { Octokit } from "octokit";

type LoaderOptions = {
  repoUrl: string;
  apiKey: string;
};

const discussionAuthorSchema = z.object({
  login: z.string(),
  url: z.string().url(),
});

const discussionSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  body: z.string(),
  url: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: discussionAuthorSchema
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
          repository: { discussions: { nodes: unknown[] } };
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

        const discussions = repository.discussions.nodes.map(discussionSchema.parse);
        discussions.forEach((discussion) => {
          context.store.set({ id: discussion.id, data: discussion });
        });
      } catch (error) {
        console.error("Error fetching GitHub discussions:", error);
        context.store.set({ id: "error", data: { error: "Failed to fetch discussions" } });
      }
    },
    schema: discussionSchema,
  };
}
