import { fetchAllProducts } from "./product-fetcher.server.js";
import { saveScanHistory } from "../history/scan-history.server.js";

export async function scanStore(admin) {
  const {
    shop,
    products,
    pagesScanned,
  } = await fetchAllProducts(admin);

  let productsWithoutDescription = 0;
  let productsWithoutSeoTitle = 0;
  let productsWithoutSeoDescription = 0;
  let totalImages = 0;
  let imagesWithoutAltText = 0;
  let largeImages = 0;

  const productIssues = [];

  for (const product of products) {
    const issues = [];
    const missingAltImages = [];

    const cleanDescription = product.descriptionHtml
      ?.replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanDescription) {
      productsWithoutDescription += 1;

      issues.push({
        type: "missing-description",
        label: "Missing product description",
        severity: "high",
      });
    }

    if (!product.seo?.title?.trim()) {
      productsWithoutSeoTitle += 1;

      issues.push({
        type: "missing-seo-title",
        label: "Missing SEO title",
        severity: "medium",
      });
    }

    if (!product.seo?.description?.trim()) {
      productsWithoutSeoDescription += 1;

      issues.push({
        type: "missing-seo-description",
        label: "Missing SEO description",
        severity: "medium",
      });
    }

    let productLargeImageCount = 0;

    for (const media of product.media?.nodes || []) {
      if (!media?.id || !media?.image) {
        continue;
      }

      totalImages += 1;

      if (!media.alt?.trim()) {
        imagesWithoutAltText += 1;

        missingAltImages.push({
          id: media.id,
          status: media.fileStatus,
          suggestedAlt: buildImageAltText(
            product.title,
            missingAltImages.length + 1,
          ),
        });
      }

      if (
        Number(media.image.width || 0) > 2500 ||
        Number(media.image.height || 0) > 2500
      ) {
        largeImages += 1;
        productLargeImageCount += 1;
      }
    }

    if (missingAltImages.length > 0) {
      issues.push({
        type: "missing-alt-text",
        label: `${missingAltImages.length} image${
          missingAltImages.length === 1 ? "" : "s"
        } missing alt text`,
        severity: "high",
      });
    }

    if (productLargeImageCount > 0) {
      issues.push({
        type: "large-images",
        label: `${productLargeImageCount} large image${
          productLargeImageCount === 1 ? "" : "s"
        }`,
        severity: "low",
      });
    }

    if (issues.length > 0) {
      productIssues.push({
        id: product.id,
        title: product.title,
        previewUrl: product.onlineStorePreviewUrl,
        issues,
        missingAltImages,
      });
    }
  }

  const totalProducts = products.length;

  const totalChecks =
    totalProducts * 3 + totalImages;

  const totalIssues =
    productsWithoutDescription +
    productsWithoutSeoTitle +
    productsWithoutSeoDescription +
    imagesWithoutAltText;

  const seoScore =
    totalChecks === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            ((totalChecks - totalIssues) /
              totalChecks) *
              100,
          ),
        );

  const scanResult = {
    success: true,
    type: "scan",
    message: "Store scan completed successfully.",
    scannedAt: new Date().toISOString(),

    shop: {
      name: shop?.name || "",
      url: shop?.primaryDomain?.url || "",
    },

    summary: {
      seoScore,
      totalProducts,
      totalImages,
      totalIssues,
      affectedProducts: productIssues.length,
      productsWithoutDescription,
      productsWithoutSeoTitle,
      productsWithoutSeoDescription,
      imagesWithoutAltText,
      largeImages,
      pagesScanned,
    },

    productIssues,

    productsForAI: products.map((product) => ({
      id: product.id,
      title: product.title,
      descriptionHtml:
        product.descriptionHtml || "",
      previewUrl:
        product.onlineStorePreviewUrl || null,

      seo: {
        title: product.seo?.title || "",
        description:
          product.seo?.description || "",
      },

      images:
        product.media?.nodes
          ?.filter(
            (media) =>
              media?.id && media?.image,
          )
          .map((media) => ({
            id: media.id,
            alt: media.alt || "",
            status: media.fileStatus,
            width:
              Number(media.image?.width || 0),
            height:
              Number(media.image?.height || 0),
            url: media.image?.url || "",
          })) || [],
    })),
  };

  const historyShop =
    await getShopMyshopifyDomain(
      admin,
      shop,
    );

  await saveScanHistory(
    historyShop,
    scanResult,
  );

  return scanResult;
}

export function generateAISuggestion(product) {
  const fixes = {
    productId: product.id,
    productTitle: product.title,
    descriptionHtml: null,
    seoTitle: null,
    seoDescription: null,
    imageAltUpdates: [],
    unsupportedIssues: [],
  };

  const suggestions = [];

  for (const issue of product.issues || []) {
    if (issue.type === "missing-description") {
      fixes.descriptionHtml = stripIndent(`
        <p>
          Discover ${escapeHtml(
            product.title,
          )}, designed to deliver dependable quality,
          practical value and a better everyday experience.
        </p>

        <p>
          This product is a great choice for customers
          looking for quality, convenience and reliable
          performance.
        </p>

        <ul>
          <li>Premium-quality product</li>
          <li>Designed for everyday use</li>
          <li>Easy and convenient to use</li>
          <li>Reliable performance</li>
        </ul>
      `);

      suggestions.push({
        type: "descriptionHtml",
        label: "Product description",
        value: fixes.descriptionHtml,
      });
    }

    if (issue.type === "missing-seo-title") {
      fixes.seoTitle = limitText(
        `${product.title} | Shop Online`,
        70,
      );

      suggestions.push({
        type: "seoTitle",
        label: "SEO title",
        value: fixes.seoTitle,
      });
    }

    if (
      issue.type ===
      "missing-seo-description"
    ) {
      fixes.seoDescription = limitText(
        `Shop ${product.title} online. Discover dependable quality, practical value and a convenient shopping experience.`,
        160,
      );

      suggestions.push({
        type: "seoDescription",
        label: "SEO description",
        value: fixes.seoDescription,
      });
    }

    if (issue.type === "missing-alt-text") {
      fixes.imageAltUpdates = (
        product.missingAltImages || []
      )
        .filter(
          (image) =>
            image.id &&
            image.status === "READY",
        )
        .map((image) => ({
          id: image.id,
          alt: limitText(
            image.suggestedAlt ||
              `${product.title} product image`,
            512,
          ),
        }));

      suggestions.push({
        type: "imageAltText",
        label: "Image alt text",
        value:
          fixes.imageAltUpdates.length > 0
            ? `${fixes.imageAltUpdates.length} product image alt text value${
                fixes.imageAltUpdates.length === 1
                  ? ""
                  : "s"
              } will be added automatically.`
            : "The product images are not ready for automatic alt-text updates yet.",
      });
    }

    if (issue.type === "large-images") {
      fixes.unsupportedIssues.push(
        "large-images",
      );

      suggestions.push({
        type: "information",
        label: "Large images",
        value:
          "Image compression will be added as a separate optimization feature.",
      });
    }
  }

  return {
    suggestions,
    fixes,
  };
}

export async function applyProductFix(
  admin,
  fixes,
) {
  if (!fixes?.productId) {
    throw new Error(
      "Product ID is missing.",
    );
  }

  const updateMessages = [];

  const productInput = {
    id: fixes.productId,
  };

  if (fixes.descriptionHtml) {
    productInput.descriptionHtml =
      fixes.descriptionHtml;
  }

  if (
    fixes.seoTitle ||
    fixes.seoDescription
  ) {
    productInput.seo = {};

    if (fixes.seoTitle) {
      productInput.seo.title =
        fixes.seoTitle;
    }

    if (fixes.seoDescription) {
      productInput.seo.description =
        fixes.seoDescription;
    }
  }

  const hasProductFix =
    Boolean(
      productInput.descriptionHtml,
    ) ||
    Boolean(productInput.seo?.title) ||
    Boolean(
      productInput.seo?.description,
    );

  if (hasProductFix) {
    const productResponse =
      await admin.graphql(
        `
          #graphql
          mutation ThemePilotApplyProductFix(
            $product: ProductUpdateInput!
          ) {
            productUpdate(
              product: $product
            ) {
              product {
                id
                title
                descriptionHtml

                seo {
                  title
                  description
                }
              }

              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            product: productInput,
          },
        },
      );

    const productJson =
      await productResponse.json();

    if (productJson.errors) {
      throw new Error(
        productJson.errors
          .map(
            (error) =>
              error.message,
          )
          .join(", "),
      );
    }

    const productPayload =
      productJson.data.productUpdate;

    if (
      productPayload.userErrors.length >
      0
    ) {
      throw new Error(
        productPayload.userErrors
          .map(
            (error) =>
              error.message,
          )
          .join(", "),
      );
    }

    updateMessages.push(
      "product SEO/content",
    );
  }

  const imageAltUpdates =
    Array.isArray(
      fixes.imageAltUpdates,
    )
      ? fixes.imageAltUpdates.filter(
          (image) =>
            image?.id &&
            image?.alt,
        )
      : [];

  if (imageAltUpdates.length > 0) {
    const fileResponse =
      await admin.graphql(
        `
          #graphql
          mutation ThemePilotUpdateImageAltText(
            $files: [FileUpdateInput!]!
          ) {
            fileUpdate(files: $files) {
              files {
                id
                alt
                fileStatus
              }

              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            files: imageAltUpdates,
          },
        },
      );

    const fileJson =
      await fileResponse.json();

    if (fileJson.errors) {
      throw new Error(
        fileJson.errors
          .map(
            (error) =>
              error.message,
          )
          .join(", "),
      );
    }

    const filePayload =
      fileJson.data.fileUpdate;

    if (
      filePayload.userErrors.length >
      0
    ) {
      throw new Error(
        filePayload.userErrors
          .map(
            (error) =>
              error.message,
          )
          .join(", "),
      );
    }

    updateMessages.push(
      `${filePayload.files.length} image alt text value${
        filePayload.files.length === 1
          ? ""
          : "s"
      }`,
    );
  }

  if (updateMessages.length === 0) {
    return {
      success: false,
      type: "apply-fix",
      message:
        "This product currently has no automatically applicable fixes.",
    };
  }

  return {
    success: true,
    type: "apply-fix",
    message: `${
      fixes.productTitle
    } updated successfully: ${updateMessages.join(
      " and ",
    )}.`,
  };
}

async function getShopMyshopifyDomain(
  admin,
  fallbackShop,
) {
  try {
    const response = await admin.graphql(`
      #graphql
      query ThemePilotShopDomain {
        shop {
          myshopifyDomain
        }
      }
    `);

    const json = await response.json();

    const domain =
      json?.data?.shop?.myshopifyDomain;

    if (domain) {
      return domain;
    }
  } catch (error) {
    console.error(
      "ThemePilot could not fetch myshopify domain:",
      error,
    );
  }

  const fallbackUrl =
    fallbackShop?.primaryDomain?.url;

  if (fallbackUrl) {
    try {
      return new URL(
        fallbackUrl,
      ).hostname;
    } catch {
      // Ignore invalid fallback URL.
    }
  }

  throw new Error(
    "Unable to determine Shopify store domain for scan history.",
  );
}

function buildImageAltText(
  productTitle,
  imageNumber,
) {
  const suffix =
    imageNumber === 1
      ? "product image"
      : `product image ${imageNumber}`;

  return limitText(
    `${productTitle} ${suffix}`,
    512,
  );
}

function limitText(
  value,
  maximumLength,
) {
  const cleanValue = String(
    value || "",
  )
    .replace(/\s+/g, " ")
    .trim();

  if (
    cleanValue.length <= maximumLength
  ) {
    return cleanValue;
  }

  return `${cleanValue
    .slice(
      0,
      maximumLength - 3,
    )
    .trim()}...`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripIndent(value) {
  const lines = String(
    value || "",
  ).split("\n");

  const nonEmptyLines =
    lines.filter(
      (line) =>
        line.trim().length > 0,
    );

  const minimumIndent =
    nonEmptyLines.length
      ? Math.min(
          ...nonEmptyLines.map(
            (line) =>
              line.match(
                /^\s*/,
              )?.[0].length ||
              0,
          ),
        )
      : 0;

  return lines
    .map((line) =>
      line.slice(minimumIndent),
    )
    .join("\n")
    .trim();
}