import { defineCollection } from "astro:content";
import { ghDiscussionsLoader } from "@repo/gh-discussions-astro-loader";

const blog = defineCollection({
  loader: ghDiscussionsLoader({
    repoUrl: "https://github.com/username/repo",
  }),
});

export const collections = { blog };
