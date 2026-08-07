const PRODUCTS_PER_PAGE = 50;
const MAX_PAGES = 200;

export async function fetchAllProducts(admin) {
  const products = [];

  let shop = null;
  let cursor = null;
  let hasNextPage = true;
  let pageNumber = 0;

  while (hasNextPage) {
    pageNumber += 1;

    if (pageNumber > MAX_PAGES) {
      throw new Error(
        `Product scan stopped after ${MAX_PAGES} pages for safety.`,
      );
    }

    const response = await admin.graphql(
      `
        #graphql
        query ThemePilotProductsPage(
          $first: Int!
          $after: String
        ) {
          shop {
            name
            myshopifyDomain

            primaryDomain {
              url
            }
          }

          products(
            first: $first
            after: $after
            sortKey: ID
          ) {
            nodes {
              id
              title
              descriptionHtml
              onlineStorePreviewUrl

              seo {
                title
                description
              }

              media(first: 100) {
                nodes {
                  ... on MediaImage {
                    id
                    alt
                    fileStatus

                    image {
                      width
                      height
                      url
                    }
                  }
                }
              }
            }

            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      {
        variables: {
          first: PRODUCTS_PER_PAGE,
          after: cursor,
        },
      },
    );

    const responseJson = await response.json();

    if (responseJson.errors) {
      throw new Error(
        responseJson.errors
          .map((error) => error.message)
          .join(", "),
      );
    }

    if (!shop) {
      shop = responseJson.data.shop;
    }

    const productsConnection =
      responseJson.data.products;

    products.push(
      ...(productsConnection.nodes || []),
    );

    hasNextPage =
      productsConnection.pageInfo.hasNextPage;

    cursor =
      productsConnection.pageInfo.endCursor;

    if (hasNextPage && !cursor) {
      throw new Error(
        "Shopify returned another page without a valid cursor.",
      );
    }
  }

  return {
    shop,
    products,
    pagesScanned: pageNumber,
  };
}