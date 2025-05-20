interface QueryOptions {
  owner: string;
  repo: string;
  categoryIds?: (string | null)[];
  first?: number;
}

const DISCUSSION_ATTRIBUTES = `
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
  category {
    id
    name
  }
`;

export function buildGetDiscussionsQuery({
  owner,
  repo,
  categoryIds = [null],
  first = 100,
}: QueryOptions) {
  const variables: Record<string, any> = { owner, repo, first };
  const categories = categoryIds.length > 0 ? categoryIds : [null];

  const queryParts = categories.map(
    (categoryId, index) => `
      cat_${index}: discussions(first: $first, categoryId: ${categoryId === null ? "null" : `"${categoryId}"`}) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          ${DISCUSSION_ATTRIBUTES}
        }
      }
    `,
  );

  const query = `
    query GetMultipleCategoryDiscussions($owner: String!, $repo: String!, $first: Int!) {
      repository(owner: $owner, name: $repo) {
        ${queryParts.join("\n")}
      }
    }
  `;

  return { query, variables };
}
