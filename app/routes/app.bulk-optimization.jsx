import {
  Link,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { authenticate } from "../shopify.server";

import {
  fetchAllProducts,
} from "../services/scanner/product-fetcher.server.js";

import {
  applyProductFix,
} from "../services/scanner/scanner.server.js";

import {
  buildAIFixes,
  generateAIContent,
} from "../services/ai/openai.server.js";

import {
  getAppSettings,
} from "../services/settings/app-settings.server.js";

import "../styles/dashboard.css";

/* =========================================
   LOADER
========================================= */

export const loader = async ({ request }) => {
  const { admin, session } =
  await authenticate.admin(request);

const settings =
  await getAppSettings(
    session.shop,
  );

  const { products } =
    await fetchAllProducts(admin);

  const formattedProducts =
    products.map((product) => {
      const mediaNodes =
        product.media?.nodes || [];

      const firstImage =
        mediaNodes.find(
          (media) =>
            media?.image?.url,
        ) || null;

      return {
        id: product.id,

        title:
          product.title ||
          "Product",

        image:
          firstImage?.image?.url ||
          null,

        featuredImageUrl:
          firstImage?.image?.url ||
          null,

        seoTitle:
          product.seo?.title ||
          "",

        seoDescription:
          product.seo?.description ||
          "",

        currentSeoTitle:
          product.seo?.title ||
          "",

        currentSeoDescription:
          product.seo?.description ||
          "",

        descriptionHtml:
          product.descriptionHtml ||
          "",

        previewUrl:
          product.onlineStorePreviewUrl ||
          null,

        seo: {
          title:
            product.seo?.title ||
            "",

          description:
            product.seo?.description ||
            "",
        },

        images: mediaNodes
          .filter(
            (media) =>
              media?.id &&
              media?.image,
          )
          .map((media) => ({
            id: media.id,

            alt:
              media.alt ||
              "",

            altText:
              media.alt ||
              "",

            status:
              media.fileStatus,

            url:
              media.image?.url ||
              "",

            width:
              Number(
                media.image?.width ||
                  0,
              ),

            height:
              Number(
                media.image?.height ||
                  0,
              ),
          })),
      };
    });

  return {
    products:
      formattedProducts,
  };
};

/* =========================================
   ACTION
========================================= */

export const action = async ({
  request,
}) => {
  const { admin, session } =
    await authenticate.admin(request);

  const settings =
    await getAppSettings(
      session.shop,
    );

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  try {
    /* =====================================
       GENERATE BULK AI
    ====================================== */

    if (
      intent ===
      "generate-bulk-ai"
    ) {
      const productsValue =
        formData.get("products");

      const optionsValue =
        formData.get("options");

      if (
        !productsValue ||
        typeof productsValue !==
          "string"
      ) {
        return {
          success: false,
          type: "bulk-ai",
          message:
            "Selected products are missing.",
        };
      }

      if (
        !optionsValue ||
        typeof optionsValue !==
          "string"
      ) {
        return {
          success: false,
          type: "bulk-ai",
          message:
            "Optimization options are missing.",
        };
      }

      const selectedProducts =
        JSON.parse(
          productsValue,
        );

      const options =
        JSON.parse(
          optionsValue,
        );

      if (
        !Array.isArray(
          selectedProducts,
        ) ||
        selectedProducts.length ===
          0
      ) {
        return {
          success: false,
          type: "bulk-ai",
          message:
            "Select at least one product.",
        };
      }

      const hasOption =
        Object.values(
          options,
        ).some(Boolean);

      if (!hasOption) {
        return {
          success: false,
          type: "bulk-ai",
          message:
            "Select at least one improvement type.",
        };
      }

      const results = [];

      let successCount = 0;
      let failedCount = 0;

      for (
        const product of
        selectedProducts
      ) {
        try {
          const result =
  await generateAIContent(
    product,
    {
      mode: "generate",
      settings,
    },
  );

          const filteredContent =
            filterAIContent(
              result.content,
              options,
            );

          results.push({
            success: true,

            productId:
              product.id,

            productTitle:
              product.title,

            product,

            content:
              filteredContent,
          });

          successCount += 1;
        } catch (error) {
          console.error(
            `ThemePilot bulk AI failed for ${product.title}:`,
            error,
          );

          results.push({
            success: false,

            productId:
              product.id,

            productTitle:
              product.title,

            product,

            content: null,

            error:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });

          failedCount += 1;
        }
      }

      return {
        success:
          successCount > 0,

        type: "bulk-ai",

        message:
          failedCount === 0
            ? `ThemePilot AI generated improvements for ${successCount} product${
                successCount === 1
                  ? ""
                  : "s"
              }.`
            : `Generated ${successCount} product${
                successCount === 1
                  ? ""
                  : "s"
              }. ${failedCount} product${
                failedCount === 1
                  ? ""
                  : "s"
              } failed.`,

        total:
          selectedProducts.length,

        successCount,

        failedCount,

        options,

        results,
      };
    }

    /* =====================================
       APPLY BULK AI
    ====================================== */

    if (
      intent ===
      "apply-bulk-ai"
    ) {
      const resultsValue =
        formData.get("results");

      if (
        !resultsValue ||
        typeof resultsValue !==
          "string"
      ) {
        return {
          success: false,
          type: "bulk-apply",
          message:
            "Generated AI results are missing.",
        };
      }

      const generatedResults =
        JSON.parse(
          resultsValue,
        );

      if (
        !Array.isArray(
          generatedResults,
        )
      ) {
        return {
          success: false,
          type: "bulk-apply",
          message:
            "Invalid bulk AI results.",
        };
      }

      const applicableResults =
        generatedResults.filter(
          (result) =>
            result?.success &&
            result?.product &&
            result?.content,
        );

      if (
        applicableResults.length ===
        0
      ) {
        return {
          success: false,
          type: "bulk-apply",
          message:
            "There are no generated results ready to apply.",
        };
      }

      const applyResults = [];

      let successCount = 0;
      let failedCount = 0;

      for (
        const result of
        applicableResults
      ) {
        try {
          const fixes =
            buildAIFixes(
              result.product,
              result.content,
            );

          const applyResult =
            await applyProductFix(
              admin,
              fixes,
            );

          if (
            applyResult?.success
          ) {
            successCount += 1;

            applyResults.push({
              success: true,

              productId:
                result.productId,

              productTitle:
                result.productTitle,

              message:
                applyResult.message ||
                "Updated successfully.",
            });
          } else {
            failedCount += 1;

            applyResults.push({
              success: false,

              productId:
                result.productId,

              productTitle:
                result.productTitle,

              message:
                applyResult?.message ||
                "No applicable update was found.",
            });
          }
        } catch (error) {
          console.error(
            `ThemePilot bulk apply failed for ${result.productTitle}:`,
            error,
          );

          failedCount += 1;

          applyResults.push({
            success: false,

            productId:
              result.productId,

            productTitle:
              result.productTitle,

            message:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });
        }
      }

      return {
        success:
          successCount > 0,

        type:
          "bulk-apply",

        message:
          failedCount === 0
            ? `${successCount} product${
                successCount === 1
                  ? ""
                  : "s"
              } updated successfully in Shopify.`
            : `${successCount} product${
                successCount === 1
                  ? ""
                  : "s"
              } updated. ${failedCount} product${
                failedCount === 1
                  ? ""
                  : "s"
              } failed.`,

        total:
          applicableResults.length,

        successCount,

        failedCount,

        results:
          applyResults,
      };
    }

    return {
      success: false,
      type: "unknown",
      message:
        "Invalid request.",
    };
  } catch (error) {
    console.error(
      "ThemePilot Bulk Optimization error:",
      error,
    );

    return {
      success: false,

      type:
        intent ||
        "unknown",

      message:
        "The request could not be completed.",

      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
};

/* =========================================
   MAIN PAGE
========================================= */

export default function BulkOptimizationPage() {
  const { products } =
    useLoaderData();

  const revalidator =
    useRevalidator();

  const bulkFetcher =
    useFetcher();

  const applyFetcher =
    useFetcher();

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState([]);

  const [
    optimizationOptions,
    setOptimizationOptions,
  ] = useState({
    seoTitle: true,
    seoDescription: true,
    description: true,
    altText: true,
  });

  const [
    generatedResults,
    setGeneratedResults,
  ] = useState([]);

  const [
    generationSummary,
    setGenerationSummary,
  ] = useState(null);

  const [
    applySummary,
    setApplySummary,
  ] = useState(null);

  const filteredProducts =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter(
        (product) =>
          product.title
            .toLowerCase()
            .includes(query),
      );
    }, [
      products,
      searchTerm,
    ]);

  const selectedCount =
    selectedProducts.length;

  const selectedProductObjects =
    useMemo(
      () =>
        products.filter(
          (product) =>
            selectedProducts.includes(
              product.id,
            ),
        ),
      [
        products,
        selectedProducts,
      ],
    );

  const isGenerating =
    bulkFetcher.state !==
    "idle";

  const isApplying =
    applyFetcher.state !==
    "idle";

  const isBusy =
    isGenerating ||
    isApplying;

  const isAllSelected =
    filteredProducts.length >
      0 &&
    filteredProducts.every(
      (product) =>
        selectedProducts.includes(
          product.id,
        ),
    );

  const hasOptimizationSelected =
    Object.values(
      optimizationOptions,
    ).some(Boolean);

  const improvementCount =
    Object.values(
      optimizationOptions,
    ).filter(Boolean).length;

  const successfulResults =
    generatedResults.filter(
      (result) =>
        result.success,
    );

  /* =========================================
     PRODUCT SELECT
  ========================================= */

  const toggleProduct = (
    productId,
  ) => {
    if (isBusy) {
      return;
    }

    setSelectedProducts(
      (current) => {
        if (
          current.includes(
            productId,
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              productId,
          );
        }

        return [
          ...current,
          productId,
        ];
      },
    );

    clearGeneratedState();
  };

  /* =========================================
     SELECT ALL
  ========================================= */

  const toggleSelectAll =
    () => {
      if (
        isBusy ||
        filteredProducts.length ===
          0
      ) {
        return;
      }

      if (isAllSelected) {
        const visibleIds =
          new Set(
            filteredProducts.map(
              (product) =>
                product.id,
            ),
          );

        setSelectedProducts(
          (current) =>
            current.filter(
              (id) =>
                !visibleIds.has(
                  id,
                ),
            ),
        );
      } else {
        setSelectedProducts(
          (current) => {
            const next =
              new Set(current);

            for (
              const product of
              filteredProducts
            ) {
              next.add(
                product.id,
              );
            }

            return [
              ...next,
            ];
          },
        );
      }

      clearGeneratedState();
    };

  /* =========================================
     OPTION
  ========================================= */

  const toggleOption = (
    key,
  ) => {
    if (isBusy) {
      return;
    }

    setOptimizationOptions(
      (current) => ({
        ...current,

        [key]:
          !current[key],
      }),
    );

    clearGeneratedState();
  };

  /* =========================================
     CLEAR GENERATED STATE
  ========================================= */

  function clearGeneratedState() {
    setGeneratedResults([]);
    setGenerationSummary(null);
    setApplySummary(null);
  }

  /* =========================================
     GENERATE AI
  ========================================= */

  const handleGenerateAI =
    () => {
      if (
        selectedCount ===
          0 ||
        !hasOptimizationSelected ||
        isBusy
      ) {
        return;
      }

      clearGeneratedState();

      const formData =
        new FormData();

      formData.append(
        "intent",
        "generate-bulk-ai",
      );

      formData.append(
        "products",
        JSON.stringify(
          selectedProductObjects,
        ),
      );

      formData.append(
        "options",
        JSON.stringify(
          optimizationOptions,
        ),
      );

      bulkFetcher.submit(
        formData,
        {
          method: "post",
        },
      );
    };

  /* =========================================
     APPLY ALL
  ========================================= */

  const handleApplyAll =
    () => {
      if (
        successfulResults.length ===
          0 ||
        isBusy
      ) {
        return;
      }

      setApplySummary(null);

      const formData =
        new FormData();

      formData.append(
        "intent",
        "apply-bulk-ai",
      );

      formData.append(
        "results",
        JSON.stringify(
          successfulResults,
        ),
      );

      applyFetcher.submit(
        formData,
        {
          method: "post",
        },
      );
    };

  /* =========================================
     GENERATE RESPONSE
  ========================================= */

  useEffect(() => {
    if (
      !bulkFetcher.data
    ) {
      return;
    }

    if (
      bulkFetcher.data
        .type !==
      "bulk-ai"
    ) {
      return;
    }

    const results =
      Array.isArray(
        bulkFetcher.data.results,
      )
        ? bulkFetcher.data.results
        : [];

    setGeneratedResults(
      results,
    );

    setGenerationSummary({
      success:
        Boolean(
          bulkFetcher.data.success,
        ),

      message:
        bulkFetcher.data.message ||
        bulkFetcher.data.error ||
        "",

      total:
        Number(
          bulkFetcher.data.total ||
            0,
        ),

      successCount:
        Number(
          bulkFetcher.data
            .successCount ||
            0,
        ),

      failedCount:
        Number(
          bulkFetcher.data
            .failedCount ||
            0,
        ),
    });
  }, [
    bulkFetcher.data,
  ]);

  /* =========================================
     APPLY RESPONSE
  ========================================= */

  useEffect(() => {
    if (
      !applyFetcher.data
    ) {
      return;
    }

    if (
      applyFetcher.data
        .type !==
      "bulk-apply"
    ) {
      return;
    }

    setApplySummary({
      success:
        Boolean(
          applyFetcher.data.success,
        ),

      message:
        applyFetcher.data.message ||
        applyFetcher.data.error ||
        "",

      total:
        Number(
          applyFetcher.data.total ||
            0,
        ),

      successCount:
        Number(
          applyFetcher.data
            .successCount ||
            0,
        ),

      failedCount:
        Number(
          applyFetcher.data
            .failedCount ||
            0,
        ),

      results:
        Array.isArray(
          applyFetcher.data.results,
        )
          ? applyFetcher.data.results
          : [],
    });

    if (
      applyFetcher.data
        .success
    ) {
      revalidator.revalidate();
    }
  }, [
    applyFetcher.data,
    revalidator,
  ]);

  return (
    <main className="tp-dashboard tp-bulk-page">
      <section className="tp-all-products-header">
        <div>
          <p className="tp-eyebrow">
            THEMEPILOT AI
          </p>

          <h1 className="tp-main-heading">
            Bulk Optimization
          </h1>

          <p className="tp-section-subtitle">
            Select multiple products and generate
            AI-powered SEO and content improvements
            in one workflow.
          </p>
        </div>

        <Link
          to="/app"
          className="tp-button tp-button--secondary"
        >
          Back to dashboard
        </Link>
      </section>

      {generationSummary && (
        <div
          className={
            generationSummary.success
              ? "tp-message tp-message--success"
              : "tp-message tp-message--error"
          }
        >
          {
            generationSummary.message
          }
        </div>
      )}

      {applySummary && (
        <div
          className={
            applySummary.success
              ? "tp-message tp-message--success"
              : "tp-message tp-message--error"
          }
        >
          {
            applySummary.message
          }
        </div>
      )}

      <section className="tp-bulk-layout">
        <div className="tp-bulk-main">
          <div className="tp-bulk-panel">
            <div className="tp-table-heading">
              <div>
                <h2 className="tp-section-heading tp-section-heading--compact">
                  Select products
                </h2>

                <p className="tp-section-subtitle">
                  Choose the products you want
                  ThemePilot AI to optimize.
                </p>
              </div>

              <span className="tp-count-badge">
                {selectedCount} selected
              </span>
            </div>

            <div className="tp-bulk-toolbar">
              <input
                type="search"
                value={
                  searchTerm
                }
                disabled={
                  isBusy
                }
                onChange={(
                  event,
                ) =>
                  setSearchTerm(
                    event.target
                      .value,
                  )
                }
                placeholder="Search products..."
                className="tp-bulk-search"
              />

              <button
                type="button"
                disabled={
                  isBusy
                }
                onClick={
                  toggleSelectAll
                }
                className="tp-button tp-button--secondary"
              >
                {isAllSelected
                  ? "Clear visible"
                  : "Select visible"}
              </button>
            </div>

            {filteredProducts.length ===
            0 ? (
              <div className="tp-empty-state">
                <h3>
                  No products found
                </h3>

                <p className="tp-section-subtitle">
                  Try a different product search.
                </p>
              </div>
            ) : (
              <div className="tp-bulk-product-list">
                {filteredProducts.map(
                  (product) => {
                    const isSelected =
                      selectedProducts.includes(
                        product.id,
                      );

                    return (
                      <label
                        key={
                          product.id
                        }
                        className={
                          isSelected
                            ? "tp-bulk-product tp-bulk-product--selected"
                            : "tp-bulk-product"
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={
                            isBusy
                          }
                          checked={
                            isSelected
                          }
                          onChange={() =>
                            toggleProduct(
                              product.id,
                            )
                          }
                        />

                        <div className="tp-bulk-product__image">
                          {product.image ? (
                            <img
                              src={
                                product.image
                              }
                              alt={
                                product.title
                              }
                              loading="lazy"
                            />
                          ) : (
                            <span>
                              TP
                            </span>
                          )}
                        </div>

                        <div className="tp-bulk-product__content">
                          <strong>
                            {
                              product.title
                            }
                          </strong>

                          <div className="tp-bulk-product__status">
                            <span
                              className={
                                product.seoTitle
                                  ? "tp-ai-status tp-ai-status--ready"
                                  : "tp-ai-status tp-ai-status--missing"
                              }
                            >
                              SEO title
                            </span>

                            <span
                              className={
                                product.seoDescription
                                  ? "tp-ai-status tp-ai-status--ready"
                                  : "tp-ai-status tp-ai-status--missing"
                              }
                            >
                              SEO description
                            </span>

                            <span
                              className={
                                hasDescription(
                                  product.descriptionHtml,
                                )
                                  ? "tp-ai-status tp-ai-status--ready"
                                  : "tp-ai-status tp-ai-status--missing"
                              }
                            >
                              Description
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="tp-bulk-sidebar">
          <div className="tp-bulk-panel tp-bulk-panel--sticky">
            <p className="tp-analytics__eyebrow">
              OPTIMIZATION
            </p>

            <h2 className="tp-section-heading tp-section-heading--compact">
              What should AI improve?
            </h2>

            <p className="tp-section-subtitle">
              Select the content types to include
              in this bulk generation.
            </p>

            <div className="tp-bulk-options">
              <OptimizationOption
                label="SEO title"
                description="Generate optimized page titles."
                checked={
                  optimizationOptions.seoTitle
                }
                disabled={
                  isBusy
                }
                onChange={() =>
                  toggleOption(
                    "seoTitle",
                  )
                }
              />

              <OptimizationOption
                label="SEO description"
                description="Generate search-friendly meta descriptions."
                checked={
                  optimizationOptions.seoDescription
                }
                disabled={
                  isBusy
                }
                onChange={() =>
                  toggleOption(
                    "seoDescription",
                  )
                }
              />

              <OptimizationOption
                label="Product description"
                description="Generate improved product page copy."
                checked={
                  optimizationOptions.description
                }
                disabled={
                  isBusy
                }
                onChange={() =>
                  toggleOption(
                    "description",
                  )
                }
              />

              <OptimizationOption
                label="Image alt text"
                description="Generate optimized image alt text."
                checked={
                  optimizationOptions.altText
                }
                disabled={
                  isBusy
                }
                onChange={() =>
                  toggleOption(
                    "altText",
                  )
                }
              />
            </div>

            <div className="tp-bulk-summary">
              <div>
                <span>
                  Selected products
                </span>

                <strong>
                  {selectedCount}
                </strong>
              </div>

              <div>
                <span>
                  Improvements
                </span>

                <strong>
                  {
                    improvementCount
                  }
                </strong>
              </div>
            </div>

            <button
              type="button"
              disabled={
                selectedCount ===
                  0 ||
                !hasOptimizationSelected ||
                isBusy
              }
              onClick={
                handleGenerateAI
              }
              className="tp-button tp-button--ai tp-bulk-generate-button"
            >
              {isGenerating
                ? "Generating AI Improvements..."
                : "Generate AI Improvements"}
            </button>

            {isGenerating && (
              <div className="tp-bulk-generation-status">
                <div className="tp-spinner" />

                <div>
                  <strong>
                    ThemePilot AI is working
                  </strong>

                  <p>
                    Generating product improvements.
                  </p>
                </div>
              </div>
            )}

            {isApplying && (
              <div className="tp-bulk-generation-status">
                <div className="tp-spinner" />

                <div>
                  <strong>
                    Updating Shopify
                  </strong>

                  <p>
                    Applying generated improvements
                    product by product.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {generatedResults.length >
        0 && (
        <section className="tp-bulk-preview-section">
          <div className="tp-table-heading">
            <div>
              <p className="tp-analytics__eyebrow">
                AI RESULTS
              </p>

              <h2 className="tp-section-heading tp-section-heading--compact">
                Generated Preview
              </h2>

              <p className="tp-section-subtitle">
                Review ThemePilot AI improvements
                before applying them to Shopify.
              </p>
            </div>

            <span className="tp-count-badge">
              {
                successfulResults.length
              }{" "}
              ready
            </span>
          </div>

          <div className="tp-bulk-preview-list">
            {generatedResults.map(
              (result) =>
                result.success ? (
                  <GeneratedProductCard
                    key={
                      result.productId
                    }
                    result={
                      result
                    }
                    applyResult={
                      applySummary
                        ?.results
                        ?.find(
                          (item) =>
                            item.productId ===
                            result.productId,
                        ) ||
                      null
                    }
                  />
                ) : (
                  <FailedProductCard
                    key={
                      result.productId
                    }
                    result={
                      result
                    }
                  />
                ),
            )}
          </div>

          {successfulResults.length >
            0 && (
            <div className="tp-bulk-apply-panel">
              <div>
                <h3>
                  Ready to apply
                </h3>

                <p>
                  {
                    successfulResults.length
                  }{" "}
                  generated product
                  {successfulResults.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  ready for Shopify.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isBusy
                }
                onClick={
                  handleApplyAll
                }
                className="tp-button tp-button--ai"
              >
                {isApplying
                  ? "Applying..."
                  : "Apply All to Shopify"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

/* =========================================
   GENERATED PRODUCT CARD
========================================= */

function GeneratedProductCard({
  result,
  applyResult,
}) {
  const content =
    result.content || {};

  const product =
    result.product || {};

  const image =
    product.image ||
    product.featuredImageUrl ||
    product.images?.[0]?.url ||
    null;

  return (
    <article className="tp-bulk-preview-card">
      <div className="tp-bulk-preview-card__header">
        <div className="tp-bulk-preview-card__product">
          <div className="tp-bulk-preview-card__image">
            {image ? (
              <img
                src={image}
                alt={
                  result.productTitle
                }
                loading="lazy"
              />
            ) : (
              <span>
                TP
              </span>
            )}
          </div>

          <div>
            <p className="tp-bulk-preview-card__eyebrow">
              AI GENERATED
            </p>

            <h3>
              {
                result.productTitle
              }
            </h3>
          </div>
        </div>

        {applyResult ? (
          <span
            className={
              applyResult.success
                ? "tp-bulk-preview-ready"
                : "tp-bulk-preview-failed"
            }
          >
            {applyResult.success
              ? "Applied"
              : "Failed"}
          </span>
        ) : (
          <span className="tp-bulk-preview-ready">
            Ready
          </span>
        )}
      </div>

      {applyResult &&
        !applyResult.success && (
          <div className="tp-message tp-message--error">
            {
              applyResult.message
            }
          </div>
        )}

      <div className="tp-bulk-preview-grid">
        {content.seoTitle !==
          null && (
          <PreviewField
            label="SEO title"
            value={
              content.seoTitle
            }
          />
        )}

        {content.seoDescription !==
          null && (
          <PreviewField
            label="SEO description"
            value={
              content.seoDescription
            }
          />
        )}

        {content.altText !==
          null && (
          <PreviewField
            label="Image alt text"
            value={
              content.altText
            }
          />
        )}

        {content.descriptionHtml !==
          null && (
          <div className="tp-bulk-preview-field tp-bulk-preview-field--full">
            <span>
              Product description
            </span>

            <div
              className="tp-ai-description"
              dangerouslySetInnerHTML={{
                __html:
                  content.descriptionHtml ||
                  "<p>No description generated.</p>",
              }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function FailedProductCard({
  result,
}) {
  return (
    <article className="tp-bulk-preview-card tp-bulk-preview-card--failed">
      <div className="tp-bulk-preview-card__header">
        <div>
          <p className="tp-bulk-preview-card__eyebrow">
            GENERATION FAILED
          </p>

          <h3>
            {
              result.productTitle
            }
          </h3>
        </div>

        <span className="tp-bulk-preview-failed">
          Failed
        </span>
      </div>

      <div className="tp-message tp-message--error">
        {result.error ||
          "ThemePilot AI could not generate content for this product."}
      </div>
    </article>
  );
}

function PreviewField({
  label,
  value,
}) {
  return (
    <div className="tp-bulk-preview-field">
      <span>
        {label}
      </span>

      <p>
        {value ||
          "No content generated."}
      </p>
    </div>
  );
}

function OptimizationOption({
  label,
  description,
  checked,
  disabled,
  onChange,
}) {
  return (
    <label
      className={
        checked
          ? "tp-bulk-option tp-bulk-option--selected"
          : "tp-bulk-option"
      }
    >
      <input
        type="checkbox"
        checked={
          checked
        }
        disabled={
          disabled
        }
        onChange={
          onChange
        }
      />

      <div>
        <strong>
          {label}
        </strong>

        <p>
          {description}
        </p>
      </div>
    </label>
  );
}

/* =========================================
   HELPERS
========================================= */

function filterAIContent(
  content,
  options,
) {
  if (!content) {
    return null;
  }

  return {
    seoTitle:
      options.seoTitle
        ? content.seoTitle ||
          ""
        : null,

    seoDescription:
      options.seoDescription
        ? content.seoDescription ||
          ""
        : null,

    descriptionHtml:
      options.description
        ? content.descriptionHtml ||
          ""
        : null,

    altText:
      options.altText
        ? content.altText ||
          ""
        : null,

    keywords:
      Array.isArray(
        content.keywords,
      )
        ? content.keywords
        : [],
  };
}

function hasDescription(
  descriptionHtml,
) {
  return (
    String(
      descriptionHtml ||
        "",
    )
      .replace(
        /<[^>]*>/g,
        "",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim().length >
    0
  );
}