import { defineCollection } from "astro:content";
import { ghDiscussionsLoader } from "@repo/gh-discussions-astro-loader";

const blog = defineCollection({
  loader: ghDiscussionsLoader({
    repoUrl: "https://github.com/pricci1/discussions-playground",
    apiKey: import.meta.env.GH_API_KEY,
  }),
});

export const collections = { blog };
