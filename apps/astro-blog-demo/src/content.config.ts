import { defineCollection } from "astro:content";
import { createMarkdownProcessor, parseFrontmatter } from "@astrojs/markdown-remark";
import { ghDiscussionsLoader } from "@repo/gh-discussions-astro-loader";
import remarkFrontmatter from "remark-frontmatter";

const processor = await createMarkdownProcessor({
  gfm: true,
  remarkPlugins: [remarkFrontmatter],
});

const blog = defineCollection({
  loader: ghDiscussionsLoader({
    repoUrl: "https://github.com/pricci1/gh-discussions-astro",
    apiKey: import.meta.env.GH_API_KEY,
    categoryIds: ["DIC_kwDOOrPQBs4CqOrX", "DIC_kwDOOrPQBs4CqOq-", "DIC_kwDOOrPQBs4CqOqs"],
    renderer: async (content) => {
      const processed = await processor.render(content);
      const { frontmatter } = parseFrontmatter(content);
      return {
        html: String(processed.code),
        metadata: { frontmatter },
      };
    },
  }),
});

export const collections = { blog };
