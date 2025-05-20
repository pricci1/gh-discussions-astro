import type { Loader, LoaderContext } from "astro/loaders";
import { z } from "astro/zod";

import { Octokit } from "octokit";
import { buildGetDiscussionsQuery } from "./getDiscussionsQueryBuilder";

type RenderedContent = NonNullable<
  ReturnType<LoaderContext["store"]["entries"]>[number][1]["rendered"]
>;

type LoaderOptions = {
  repoUrl: string;
  apiKey: string;
  categoryIds?: string[];
  renderer?: (body: string) => RenderedContent | Promise<RenderedContent>;
};

const repoUrlSchema = z
  .string()
  .url()
  .transform((url) => {
    const urlParts = url.split("/");
    return {
      owner: z.string().min(1).parse(urlParts.at(-2)),
      repo: z.string().min(1).parse(urlParts.at(-1)),
    };
  });

const discussionAuthorSchema = z.object({
  login: z.string(),
  url: z.string().url(),
});

const discussionLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const discussionCategorySchema = z.object({
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
  category: discussionCategorySchema,
});

export function ghDiscussionsLoader(options: LoaderOptions): Loader {
  return {
    name: "gh-discussions-loader",
    load: async (context) => {
      const octokit = new Octokit({ auth: options.apiKey });
      const { owner, repo } = repoUrlSchema.parse(options.repoUrl);
      const categoryIds = options.categoryIds || [null];

      const { query, variables } = buildGetDiscussionsQuery({
        owner,
        repo,
        categoryIds,
      });

      try {
        const { repository } = await octokit.graphql<{
          repository: Record<string, { nodes: Record<string, unknown>[] }>;
        }>(query, variables);

        Object.values(repository)
          .flatMap((cat) => cat.nodes)
          .forEach(async (rawDiscussion) => {
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
