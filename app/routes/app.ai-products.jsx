import {
  Link,
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";

import {
  useEffect,
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

const PRODUCTS_PER_PAGE = 12;

/* =========================================
   LOADER
========================================= */

export const loader = async ({
  request,
}) => {
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

        descriptionHtml:
          product.descriptionHtml ||
          "",

        previewUrl:
          product.onlineStorePreviewUrl ||
          null,

        featuredImageUrl:
          firstImage?.image?.url ||
          null,

        currentSeoTitle:
          product.seo?.title ||
          "",

        currentSeoDescription:
          product.seo?.description ||
          "",

        currentAltText:
          firstImage?.alt ||
          "",

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
              media.alt || "",

            altText:
              media.alt || "",

            status:
              media.fileStatus,

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

            url:
              media.image?.url ||
              "",
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
    /* -----------------------------
       GENERATE AI CONTENT
    ----------------------------- */

    if (
      intent ===
      "generate-ai-content"
    ) {
      const productValue =
        formData.get("product");

      if (
        !productValue ||
        typeof productValue !==
          "string"
      ) {
        return {
          success: false,
          type: "ai-content",
          message:
            "Product information is missing.",
        };
      }

      const product =
        JSON.parse(
          productValue,
        );

      const result =
  await generateAIContent(
    product,
    {
      mode: "generate",
      settings,
    },
  );

      return {
        ...result,
        product,
      };
    }

    /* -----------------------------
       REGENERATE AI CONTENT
    ----------------------------- */

    if (
      intent ===
      "regenerate-ai-content"
    ) {
      const productValue =
        formData.get("product");

      const previousContentValue =
        formData.get(
          "previousContent",
        );

      if (
        !productValue ||
        typeof productValue !==
          "string"
      ) {
        return {
          success: false,
          type: "ai-content",
          message:
            "Product information is missing.",
        };
      }

      const product =
        JSON.parse(
          productValue,
        );

      let previousContent =
        null;

      if (
        previousContentValue &&
        typeof previousContentValue ===
          "string"
      ) {
        try {
          previousContent =
            JSON.parse(
              previousContentValue,
            );
        } catch {
          previousContent =
            null;
        }
      }

      const result =
  await generateAIContent(
    product,
    {
      mode: "regenerate",
      previousContent,
      settings,
    },
  );

      return {
        ...result,
        product,
      };
    }

    /* -----------------------------
       APPLY AI CONTENT
    ----------------------------- */

    if (
      intent ===
      "apply-ai-content"
    ) {
      const productValue =
        formData.get("product");

      const contentValue =
        formData.get("content");

      if (
        !productValue ||
        typeof productValue !==
          "string"
      ) {
        return {
          success: false,
          type: "apply-ai",
          message:
            "Product information is missing.",
        };
      }

      if (
        !contentValue ||
        typeof contentValue !==
          "string"
      ) {
        return {
          success: false,
          type: "apply-ai",
          message:
            "AI content is missing.",
        };
      }

      const product =
        JSON.parse(
          productValue,
        );

      const content =
        JSON.parse(
          contentValue,
        );

      const fixes =
        buildAIFixes(
          product,
          content,
        );

      const result =
        await applyProductFix(
          admin,
          fixes,
        );

      return {
        ...result,
        type: "apply-ai",
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
      "ThemePilot AI Products error:",
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

export default function AIProductsPage() {
  const { products } =
    useLoaderData();

  const revalidator =
    useRevalidator();

  const aiFetcher =
    useFetcher();

  const applyFetcher =
    useFetcher();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    aiContent,
    setAIContent,
  ] = useState(null);

  const [
    aiError,
    setAIError,
  ] = useState(null);

  const [
    aiMode,
    setAIMode,
  ] = useState(
    "generate",
  );

  const [
    applyResult,
    setApplyResult,
  ] = useState(null);

  const requestedPage =
    Number(
      searchParams.get("page") ||
        1,
    );

  const totalProducts =
    products.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalProducts /
          PRODUCTS_PER_PAGE,
      ),
    );

  const currentPage =
    Math.min(
      Math.max(
        1,
        Number.isInteger(
          requestedPage,
        )
          ? requestedPage
          : 1,
      ),
      totalPages,
    );

  const startIndex =
    (currentPage - 1) *
    PRODUCTS_PER_PAGE;

  const pageProducts =
    products.slice(
      startIndex,
      startIndex +
        PRODUCTS_PER_PAGE,
    );

  const isGenerating =
    aiFetcher.state !==
    "idle";

  const isApplying =
    applyFetcher.state !==
    "idle";

  const isRegenerating =
    isGenerating &&
    aiMode ===
      "regenerate";

  /* =========================================
     PAGINATION
  ========================================= */

  const changePage = (
    page,
  ) => {
    setSearchParams({
      page: String(page),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================
     AI IMPROVE
  ========================================= */

  const handleAIImprove = (
    product,
  ) => {
    setSelectedProduct(
      product,
    );

    setAIContent(null);
    setAIError(null);
    setApplyResult(null);

    setAIMode(
      "generate",
    );

    const formData =
      new FormData();

    formData.append(
      "intent",
      "generate-ai-content",
    );

    formData.append(
      "product",
      JSON.stringify(
        product,
      ),
    );

    aiFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* =========================================
     REGENERATE
  ========================================= */

  const handleRegenerate =
    () => {
      if (
        !selectedProduct ||
        !aiContent ||
        isGenerating
      ) {
        return;
      }

      setAIError(null);
      setApplyResult(null);

      setAIMode(
        "regenerate",
      );

      const formData =
        new FormData();

      formData.append(
        "intent",
        "regenerate-ai-content",
      );

      formData.append(
        "product",
        JSON.stringify(
          selectedProduct,
        ),
      );

      formData.append(
        "previousContent",
        JSON.stringify(
          aiContent,
        ),
      );

      aiFetcher.submit(
        formData,
        {
          method: "post",
        },
      );
    };

  /* =========================================
     APPLY AI CONTENT
  ========================================= */

  const handleApplyAI =
    () => {
      if (
        !selectedProduct ||
        !aiContent ||
        isApplying
      ) {
        return;
      }

      setApplyResult(null);

      const formData =
        new FormData();

      formData.append(
        "intent",
        "apply-ai-content",
      );

      formData.append(
        "product",
        JSON.stringify(
          selectedProduct,
        ),
      );

      formData.append(
        "content",
        JSON.stringify(
          aiContent,
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
     CLOSE MODAL
  ========================================= */

  const closeModal = () => {
    if (
      isGenerating ||
      isApplying
    ) {
      return;
    }

    setSelectedProduct(
      null,
    );

    setAIContent(null);
    setAIError(null);
    setApplyResult(null);

    setAIMode(
      "generate",
    );
  };

  /* =========================================
     AI RESPONSE
  ========================================= */

  useEffect(() => {
    if (!aiFetcher.data) {
      return;
    }

    if (
      aiFetcher.data
        .success &&
      aiFetcher.data
        .type ===
        "ai-content"
    ) {
      setAIContent(
        aiFetcher.data
          .content ||
          null,
      );

      setAIError(null);

      return;
    }

    setAIError(
      [
        aiFetcher.data
          .message,
        aiFetcher.data
          .error,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }, [
    aiFetcher.data,
  ]);

  /* =========================================
     APPLY RESPONSE
  ========================================= */

  useEffect(() => {
    if (
      applyFetcher.data
        ?.type !==
      "apply-ai"
    ) {
      return;
    }

    setApplyResult(
      applyFetcher.data,
    );

    if (
      !applyFetcher.data
        .success
    ) {
      return;
    }

    revalidator.revalidate();
  }, [
    applyFetcher.data,
    revalidator,
  ]);

  return (
    <>
      <main className="tp-dashboard tp-all-products-page">
        {/* =============================
            PAGE HEADER
        ============================== */}

        <section className="tp-all-products-header">
          <div>
            <p className="tp-eyebrow">
              THEMEPILOT AI
            </p>

            <h1 className="tp-main-heading">
              All Products
            </h1>

            <p className="tp-section-subtitle">
              Improve product
              descriptions,
              SEO content,
              image alt text
              and focus keywords
              using ThemePilot AI.
            </p>
          </div>

          <Link
            to="/app"
            className="tp-button tp-button--secondary"
          >
            Back to dashboard
          </Link>
        </section>

        {/* =============================
            PRODUCTS HEADER
        ============================== */}

        <section>
          <div className="tp-table-heading">
            <div>
              <h2 className="tp-section-heading tp-section-heading--compact">
                All products
              </h2>

              <p className="tp-section-subtitle">
                Showing{" "}
                {totalProducts ===
                0
                  ? 0
                  : startIndex +
                    1}
                {" - "}
                {Math.min(
                  startIndex +
                    PRODUCTS_PER_PAGE,
                  totalProducts,
                )}{" "}
                of{" "}
                {totalProducts}{" "}
                products
              </p>
            </div>

            <div className="tp-ai-products-header-actions">
              <span className="tp-count-badge">
                {totalProducts}{" "}
                products
              </span>

              <span className="tp-count-badge">
                Page{" "}
                {currentPage}{" "}
                of{" "}
                {totalPages}
              </span>
            </div>
          </div>

          {/* =============================
              PRODUCTS
          ============================== */}

          {pageProducts.length ===
          0 ? (
            <div className="tp-empty-state">
              <h3>
                No products found
              </h3>

              <p className="tp-section-subtitle">
                No Shopify
                products are
                currently
                available.
              </p>
            </div>
          ) : (
            <div className="tp-ai-product-grid">
              {pageProducts.map(
                (product) => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    isGenerating={
                      isGenerating
                    }
                    activeProductId={
                      selectedProduct
                        ?.id ||
                      null
                    }
                    onAIImprove={
                      handleAIImprove
                    }
                  />
                ),
              )}
            </div>
          )}

          {/* =============================
              PAGINATION
          ============================== */}

          {totalPages > 1 && (
            <Pagination
              currentPage={
                currentPage
              }
              totalPages={
                totalPages
              }
              onChange={
                changePage
              }
            />
          )}
        </section>
      </main>

      {/* =============================
          AI MODAL
      ============================== */}

      <AIImproveModal
        product={
          selectedProduct
        }
        content={
          aiContent
        }
        error={
          aiError
        }
        applyResult={
          applyResult
        }
        isGenerating={
          isGenerating
        }
        isRegenerating={
          isRegenerating
        }
        isApplying={
          isApplying
        }
        onRegenerate={
          handleRegenerate
        }
        onApply={
          handleApplyAI
        }
        onClose={
          closeModal
        }
      />
    </>
  );
}

/* =========================================
   PRODUCT CARD
========================================= */

function ProductCard({
  product,
  onAIImprove,
  isGenerating,
  activeProductId,
}) {
  const image =
    product.featuredImageUrl ||
    product.images?.[0]?.url ||
    null;

  const cleanDescription =
    String(
      product.descriptionHtml ||
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
      .trim();

  const hasDescription =
    cleanDescription.length >
    0;

  const isCurrentProduct =
    activeProductId ===
    product.id;

  return (
    <article className="tp-ai-product-card">
      <div className="tp-ai-product-card__media">
        {image ? (
          <img
            src={image}
            alt={
              product.images?.[0]
                ?.alt ||
              product.title
            }
            loading="lazy"
          />
        ) : (
          <div className="tp-ai-product-card__placeholder">
            <span>TP</span>
          </div>
        )}

        <span className="tp-ai-product-card__badge">
          AI Ready
        </span>
      </div>

      <div className="tp-ai-product-card__content">
        <h3>
          {product.title}
        </h3>

        <div className="tp-ai-product-card__status">
          <span
            className={
              product.currentSeoTitle
                ? "tp-ai-status tp-ai-status--ready"
                : "tp-ai-status tp-ai-status--missing"
            }
          >
            SEO title
          </span>

          <span
            className={
              product.currentSeoDescription
                ? "tp-ai-status tp-ai-status--ready"
                : "tp-ai-status tp-ai-status--missing"
            }
          >
            SEO description
          </span>

          <span
            className={
              hasDescription
                ? "tp-ai-status tp-ai-status--ready"
                : "tp-ai-status tp-ai-status--missing"
            }
          >
            Description
          </span>
        </div>

        <div className="tp-ai-product-card__actions">
          <button
            type="button"
            disabled={
              isGenerating
            }
            onClick={() =>
              onAIImprove(
                product,
              )
            }
            className="tp-button tp-button--ai"
          >
            {isCurrentProduct &&
            isGenerating
              ? "Generating..."
              : "AI Improve"}
          </button>

          {product.previewUrl && (
            <a
              href={
                product.previewUrl
              }
              target="_blank"
              rel="noreferrer"
              className="tp-button tp-button--secondary"
            >
              View product
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================
   PAGINATION
========================================= */

function Pagination({
  currentPage,
  totalPages,
  onChange,
}) {
  const pageNumbers =
    getPaginationPages(
      currentPage,
      totalPages,
    );

  return (
    <nav
      className="tp-pagination"
      aria-label="Product pagination"
    >
      <button
        type="button"
        disabled={
          currentPage === 1
        }
        onClick={() =>
          onChange(
            currentPage - 1,
          )
        }
        className="tp-pagination__button"
      >
        Previous
      </button>

      <div className="tp-pagination__pages">
        {pageNumbers.map(
          (
            item,
            index,
          ) => {
            if (
              item ===
              "ellipsis"
            ) {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="tp-pagination__ellipsis"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  onChange(
                    item,
                  )
                }
                className={
                  item ===
                  currentPage
                    ? "tp-pagination__number tp-pagination__number--active"
                    : "tp-pagination__number"
                }
              >
                {item}
              </button>
            );
          },
        )}
      </div>

      <button
        type="button"
        disabled={
          currentPage ===
          totalPages
        }
        onClick={() =>
          onChange(
            currentPage + 1,
          )
        }
        className="tp-pagination__button"
      >
        Next
      </button>
    </nav>
  );
}

/* =========================================
   PAGINATION NUMBERS
========================================= */

function getPaginationPages(
  currentPage,
  totalPages,
) {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index,
      ) => index + 1,
    );
  }

  if (
    currentPage <= 4
  ) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      totalPages,
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

/* =========================================
   AI MODAL
========================================= */

function AIImproveModal({
  product,
  content,
  error,
  applyResult,
  isGenerating,
  isRegenerating,
  isApplying,
  onRegenerate,
  onApply,
  onClose,
}) {
  if (!product) {
    return null;
  }

  const keywords =
    Array.isArray(
      content?.keywords,
    )
      ? content.keywords
      : [];

  return (
    <div
      className="tp-modal-overlay"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !isGenerating &&
          !isApplying
        ) {
          onClose();
        }
      }}
    >
      <div
        className="tp-modal tp-ai-modal"
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER */}

        <div className="tp-modal__header">
          <div>
            <p className="tp-modal__eyebrow">
              THEMEPILOT AI
              IMPROVEMENT
            </p>

            <h2 className="tp-modal__title">
              {product.title}
            </h2>
          </div>

          <button
            type="button"
            disabled={
              isGenerating ||
              isApplying
            }
            onClick={
              onClose
            }
            className="tp-modal__close"
            aria-label="Close AI popup"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="tp-modal__body">
          {isGenerating ? (
            <div className="tp-modal__loading">
              <div className="tp-spinner" />

              <p>
                {isRegenerating
                  ? "ThemePilot AI is generating a fresh version..."
                  : "ThemePilot AI is improving your product content..."}
              </p>
            </div>
          ) : error ? (
            <div className="tp-message tp-message--error">
              {error}
            </div>
          ) : !content ? (
            <div className="tp-modal__empty">
              AI content is
              not available.
            </div>
          ) : (
            <>
              {applyResult && (
                <div
                  className={
                    applyResult.success
                      ? "tp-message tp-message--success"
                      : "tp-message tp-message--error"
                  }
                >
                  {applyResult.message ||
                    applyResult.error}
                </div>
              )}

              <div className="tp-ai-result-list">
                <article className="tp-ai-result-card">
                  <h3>
                    SEO title
                  </h3>

                  <p>
                    {content.seoTitle ||
                      "No SEO title generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>
                    SEO description
                  </h3>

                  <p>
                    {content.seoDescription ||
                      "No SEO description generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>
                    Product
                    description
                  </h3>

                  <div
                    className="tp-ai-description"
                    dangerouslySetInnerHTML={{
                      __html:
                        content.descriptionHtml ||
                        "<p>No description generated.</p>",
                    }}
                  />
                </article>

                <article className="tp-ai-result-card">
                  <h3>
                    Image alt text
                  </h3>

                  <p>
                    {content.altText ||
                      "No alt text generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>
                    Focus keywords
                  </h3>

                  {keywords.length >
                  0 ? (
                    <div className="tp-ai-keywords">
                      {keywords.map(
                        (
                          keyword,
                        ) => (
                          <span
                            key={
                              keyword
                            }
                            className="tp-ai-keyword"
                          >
                            {
                              keyword
                            }
                          </span>
                        ),
                      )}
                    </div>
                  ) : (
                    <p>
                      No keywords
                      generated.
                    </p>
                  )}
                </article>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}

        <div className="tp-modal__footer">
          {content &&
            !error && (
              <>
                <button
                  type="button"
                  disabled={
                    isGenerating ||
                    isApplying
                  }
                  onClick={
                    onRegenerate
                  }
                  className="tp-button tp-button--secondary"
                >
                  {isRegenerating
                    ? "Regenerating..."
                    : "Regenerate"}
                </button>

                <button
                  type="button"
                  disabled={
                    isGenerating ||
                    isApplying
                  }
                  onClick={
                    onApply
                  }
                  className="tp-button tp-button--ai"
                >
                  {isApplying
                    ? "Applying..."
                    : "Apply AI Content"}
                </button>
              </>
            )}

          <button
            type="button"
            disabled={
              isGenerating ||
              isApplying
            }
            onClick={
              onClose
            }
            className="tp-button tp-button--secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}