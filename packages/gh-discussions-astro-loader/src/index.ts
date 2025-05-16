import type { Loader } from "astro/loaders";

export function ghDiscussionsLoader(options: { repoUrl: string }): Loader {
  return {
    name: "gh-discussions-loader",
    load: async (context) => {
      const response = [
        {
          id: "1",
          title: "My Discussion",
          content: "This is my discussion",
          url: options.repoUrl,
        },
      ];
      response.forEach((v) => {
        context.store.set({ id: v.id, data: v });
      });
    },
  };
}
