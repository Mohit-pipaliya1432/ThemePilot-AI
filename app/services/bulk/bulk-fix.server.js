import {
  applyProductFix,
  generateAISuggestion,
} from "../scanner/scanner.server.js";

const BATCH_DELAY_MS = 150;

export async function bulkFixProducts(
  admin,
  products = [],
) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      success: false,
      type: "bulk-fix",
      message: "No products are available to fix.",
      summary: {
        total: 0,
        fixed: 0,
        skipped: 0,
        failed: 0,
      },
      results: [],
    };
  }

  const results = [];

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const generated =
        generateAISuggestion(product);

      const fixes = generated?.fixes || null;

      if (!hasApplicableFix(fixes)) {
        skipped += 1;

        results.push({
          productId: product.id,
          productTitle: product.title,
          status: "skipped",
          message:
            "No automatically applicable fix was found.",
        });

        continue;
      }

      const result = await applyProductFix(
        admin,
        fixes,
      );

      if (result?.success) {
        fixed += 1;

        results.push({
          productId: product.id,
          productTitle: product.title,
          status: "fixed",
          message: result.message,
        });
      } else {
        skipped += 1;

        results.push({
          productId: product.id,
          productTitle: product.title,
          status: "skipped",
          message:
            result?.message ||
            "No fix was applied.",
        });
      }
    } catch (error) {
      failed += 1;

      console.error(
        `ThemePilot bulk fix failed for ${product.title}:`,
        error,
      );

      results.push({
        productId: product.id,
        productTitle: product.title,
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }

    await wait(BATCH_DELAY_MS);
  }

  return {
    success: failed === 0,
    type: "bulk-fix",

    message:
      failed === 0
        ? `${fixed} product${
            fixed === 1 ? "" : "s"
          } updated successfully.`
        : `Bulk fix completed with ${failed} failed product${
            failed === 1 ? "" : "s"
          }.`,

    summary: {
      total: products.length,
      fixed,
      skipped,
      failed,
    },

    results,
  };
}

function hasApplicableFix(fixes) {
  if (!fixes) {
    return false;
  }

  const hasProductFix =
    Boolean(fixes.descriptionHtml) ||
    Boolean(fixes.seoTitle) ||
    Boolean(fixes.seoDescription);

  const hasImageAltFix =
    Array.isArray(fixes.imageAltUpdates) &&
    fixes.imageAltUpdates.length > 0;

  return hasProductFix || hasImageAltFix;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}