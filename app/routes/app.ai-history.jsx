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

import {
  authenticate,
} from "../shopify.server";

import {
  buildRestorePayload,
  deleteAIContentHistoryForProduct,
  deleteAIContentVersion,
  deleteAllAIContentHistory,
  getAIContentVersionById,
  getAllAIContentHistory,
  markAIContentVersionAsCurrent,
} from "../services/history/ai-history.server.js";

import {
  applyProductFix,
} from "../services/scanner/scanner.server.js";

import "../styles/dashboard.css";

const ITEMS_PER_PAGE = 12;

/* =========================================
   LOADER
========================================= */

export const loader = async ({
  request,
}) => {
  const { session } =
    await authenticate.admin(
      request,
    );

  const history =
    await getAllAIContentHistory(
      session.shop,
    );

  return {
    history,
  };
};

/* =========================================
   ACTION
========================================= */

export const action = async ({
  request,
}) => {
  const { admin, session } =
    await authenticate.admin(
      request,
    );

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  try {
    if (
      intent ===
      "restore-version"
    ) {
      const historyId =
        formData.get(
          "historyId",
        );

      const version =
        await getAIContentVersionById(
          session.shop,
          historyId,
        );

      if (!version) {
        return {
          success: false,
          type: "restore-version",
          message:
            "AI history version was not found.",
        };
      }

      const restorePayload =
        buildRestorePayload(
          version,
        );

      const imageAltUpdates =
        await buildRestoreImageAltUpdates(
          admin,
          restorePayload.productId,
          restorePayload.altText,
        );

      const fixes = {
        productId:
          restorePayload.productId,

        productTitle:
          restorePayload.productTitle,

        descriptionHtml:
          restorePayload.descriptionHtml,

        seoTitle:
          restorePayload.seoTitle,

        seoDescription:
          restorePayload.seoDescription,

        imageAltUpdates,

        unsupportedIssues: [],
      };

      const result =
        await applyProductFix(
          admin,
          fixes,
        );

      if (result.success) {
        await markAIContentVersionAsCurrent(
          session.shop,
          version.id,
        );
      }

      return {
        ...result,
        type: "restore-version",
        historyId:
          version.id,
        version:
          version.version,
        productId:
          version.productId,
        message:
          result.success
            ? `Version ${version.version} restored successfully for ${version.productTitle}.`
            : result.message,
      };
    }

    if (
      intent ===
      "delete-version"
    ) {
      const historyId =
        formData.get(
          "historyId",
        );

      return await deleteAIContentVersion(
        session.shop,
        historyId,
      );
    }

    if (
      intent ===
      "delete-product-history"
    ) {
      const productId =
        formData.get(
          "productId",
        );

      return await deleteAIContentHistoryForProduct(
        session.shop,
        productId,
      );
    }

    if (
      intent ===
      "delete-all-history"
    ) {
      return await deleteAllAIContentHistory(
        session.shop,
      );
    }

    return {
      success: false,
      type: "history",
      message:
        "Invalid AI history request.",
    };
  } catch (error) {
    console.error(
      "ThemePilot AI History error:",
      error,
    );

    return {
      success: false,
      type:
        intent ||
        "history",

      message:
        "AI history request could not be completed.",

      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
};

/* =========================================
   PAGE
========================================= */

export default function AIHistoryPage() {
  const { history } =
    useLoaderData();

  const historyFetcher =
    useFetcher();

  const revalidator =
    useRevalidator();

  const [
    selectedVersion,
    setSelectedVersion,
  ] = useState(null);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    message,
    setMessage,
  ] = useState(null);

  const isWorking =
    historyFetcher.state !==
    "idle";

  const isRestoring =
    isWorking &&
    historyFetcher.formData?.get(
      "intent",
    ) === "restore-version";

  const isDeleting =
    isWorking &&
    !isRestoring;

  /* =========================================
     FILTER
  ========================================= */

  const filteredHistory =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return history;
      }

      return history.filter(
        (item) =>
          item.productTitle
            .toLowerCase()
            .includes(query),
      );
    }, [
      history,
      searchTerm,
    ]);

  /* =========================================
     PRODUCT COUNT
  ========================================= */

  const productCount =
    useMemo(() => {
      const ids =
        new Set(
          history.map(
            (item) =>
              item.productId,
          ),
        );

      return ids.size;
    }, [
      history,
    ]);


  const currentProductIds =
    useMemo(
      () =>
        new Set(
          history
            .filter(
              (item) =>
                item.isCurrent,
            )
            .map(
              (item) =>
                item.productId,
            ),
        ),
      [
        history,
      ],
    );

  /* =========================================
     PAGINATION
  ========================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredHistory.length /
          ITEMS_PER_PAGE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const startIndex =
    (safePage - 1) *
    ITEMS_PER_PAGE;

  const pageHistory =
    filteredHistory.slice(
      startIndex,
      startIndex +
        ITEMS_PER_PAGE,
    );

  /* =========================================
     RESTORE VERSION
  ========================================= */

  const handleRestoreVersion = (
    item,
  ) => {
    if (
      !item ||
      isWorking
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Restore Version ${item.version} for "${item.productTitle}" to Shopify? This will replace the current product description, SEO title, SEO description and image alt text with the saved version.`,
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "restore-version",
    );

    formData.append(
      "historyId",
      String(item.id),
    );

    historyFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* =========================================
     DELETE VERSION
  ========================================= */

  const handleDeleteVersion = (
    item,
  ) => {
    const confirmed =
      window.confirm(
        `Delete Version ${item.version} for "${item.productTitle}"?`,
      );

    if (!confirmed) {
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "intent",
      "delete-version",
    );

    formData.append(
      "historyId",
      String(item.id),
    );

    historyFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* =========================================
     DELETE PRODUCT HISTORY
  ========================================= */

  const handleDeleteProductHistory =
    (item) => {
      const confirmed =
        window.confirm(
          `Delete all AI versions for "${item.productTitle}"?`,
        );

      if (!confirmed) {
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "intent",
        "delete-product-history",
      );

      formData.append(
        "productId",
        item.productId,
      );

      historyFetcher.submit(
        formData,
        {
          method: "post",
        },
      );
    };

  /* =========================================
     DELETE ALL
  ========================================= */

  const handleDeleteAll =
    () => {
      const confirmed =
        window.confirm(
          "Delete all ThemePilot AI content history? This cannot be undone.",
        );

      if (!confirmed) {
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "intent",
        "delete-all-history",
      );

      historyFetcher.submit(
        formData,
        {
          method: "post",
        },
      );
    };

  /* =========================================
     RESPONSE
  ========================================= */

  useEffect(() => {
    if (
      !historyFetcher.data
    ) {
      return;
    }

    const result =
      historyFetcher.data;

    setMessage({
      success:
        Boolean(
          result.success,
        ),

      text:
        result.message ||
        result.error ||
        "Unknown response.",
    });

    if (
      result.success
    ) {
      setSelectedVersion(
        null,
      );

      revalidator.revalidate();
    }
  }, [
    historyFetcher.data,
    revalidator,
  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages,
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  /* =========================================
     RENDER
  ========================================= */

  return (
    <>
      <main className="tp-dashboard tp-ai-history-page">
        {/* HEADER */}

        <section className="tp-all-products-header">
          <div>
            <p className="tp-eyebrow">
              THEMEPILOT AI
            </p>

            <h1 className="tp-main-heading">
              AI Content History
            </h1>

            <p className="tp-section-subtitle">
              Review saved AI content
              versions for your Shopify
              products.
            </p>
          </div>

          <Link
            to="/app"
            className="tp-button tp-button--secondary"
          >
            Back to dashboard
          </Link>
        </section>

        {/* SUMMARY */}

        <section className="tp-ai-history-summary">
          <article className="tp-stat-card">
            <p className="tp-stat-card__label">
              Saved versions
            </p>

            <h3 className="tp-stat-card__value">
              {history.length}
            </h3>
          </article>

          <article className="tp-stat-card">
            <p className="tp-stat-card__label">
              Products
            </p>

            <h3 className="tp-stat-card__value">
              {productCount}
            </h3>
          </article>

          <article className="tp-stat-card">
            <p className="tp-stat-card__label">
              Latest version
            </p>

            <h3 className="tp-stat-card__value">
              {history.length >
              0
                ? `V${Math.max(
                    ...history.map(
                      (item) =>
                        item.version,
                    ),
                  )}`
                : "—"}
            </h3>
          </article>
        </section>

        {/* MESSAGE */}

        {message && (
          <div
            className={
              message.success
                ? "tp-message tp-message--success"
                : "tp-message tp-message--error"
            }
          >
            {message.text}
          </div>
        )}

        {/* HISTORY */}

        <section className="tp-ai-history-panel">
          <div className="tp-table-heading">
            <div>
              <h2 className="tp-section-heading tp-section-heading--compact">
                Saved AI versions
              </h2>

              <p className="tp-section-subtitle">
                Showing{" "}
                {filteredHistory.length ===
                0
                  ? 0
                  : startIndex +
                    1}
                {" - "}
                {Math.min(
                  startIndex +
                    ITEMS_PER_PAGE,
                  filteredHistory.length,
                )}{" "}
                of{" "}
                {
                  filteredHistory.length
                }
              </p>
            </div>

            <div className="tp-ai-history-actions">
              <input
                type="search"
                value={
                  searchTerm
                }
                onChange={(
                  event,
                ) => {
                  setSearchTerm(
                    event.target
                      .value,
                  );

                  setCurrentPage(
                    1,
                  );
                }}
                placeholder="Search products..."
                className="tp-bulk-search"
              />

              {history.length >
                0 && (
                <button
                  type="button"
                  disabled={
                    isDeleting ||
                    history.some(
                      (item) =>
                        item.isCurrent,
                    )
                  }
                  onClick={
                    handleDeleteAll
                  }
                  className="tp-button tp-button--danger"
                >
                  Delete all
                </button>
              )}
            </div>
          </div>

          {pageHistory.length ===
          0 ? (
            <div className="tp-empty-state">
              <h3>
                No AI history yet
              </h3>

              <p className="tp-section-subtitle">
                Generate or regenerate AI
                content to create your
                first saved version.
              </p>
            </div>
          ) : (
            <div className="tp-ai-history-list">
              {pageHistory.map(
                (item) => (
                  <article
                    key={
                      item.id
                    }
                    className="tp-ai-history-card"
                  >
                    <div className="tp-ai-history-card__top">
                      <div>
                        <p className="tp-ai-history-card__eyebrow">
                          VERSION{" "}
                          {
                            item.version
                          }
                        </p>

                        <h3>
                          {
                            item.productTitle
                          }
                        </h3>

                        <p className="tp-ai-history-card__date">
                          Created:{" "}
                          {formatDate(
                            item.createdAt,
                          )}
                        </p>

                        {item.isCurrent &&
                          item.restoredAt && (
                            <p className="tp-ai-history-card__restored">
                              Restored:{" "}
                              {formatDate(
                                item.restoredAt,
                              )}
                            </p>
                          )}
                      </div>

                      <div className="tp-ai-history-card__badges">
                        {item.isCurrent && (
                          <span className="tp-ai-history-current-badge">
                            Current
                          </span>
                        )}

                        <span className="tp-count-badge">
                          V
                          {
                            item.version
                          }
                        </span>
                      </div>
                    </div>

                    <div className="tp-ai-history-card__preview">
                      <HistoryPreviewRow
                        label="SEO title"
                        value={
                          item.seoTitle
                        }
                      />

                      <HistoryPreviewRow
                        label="SEO description"
                        value={
                          item.seoDescription
                        }
                      />
                    </div>

                    <div className="tp-ai-history-card__footer">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVersion(
                            item,
                          )
                        }
                        className="tp-button tp-button--small tp-button--secondary"
                      >
                        View version
                      </button>

                      <button
                        type="button"
                        disabled={
                          isDeleting ||
                          item.isCurrent
                        }
                        onClick={() =>
                          handleDeleteVersion(
                            item,
                          )
                        }
                        className="tp-button tp-button--small tp-button--danger"
                        title={
                          item.isCurrent
                            ? "Restore another version before deleting the current version."
                            : undefined
                        }
                      >
                        {item.isCurrent
                          ? "Current"
                          : "Delete"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          isDeleting ||
                          currentProductIds.has(
                            item.productId,
                          )
                        }
                        onClick={() =>
                          handleDeleteProductHistory(
                            item,
                          )
                        }
                        className="tp-button tp-button--small tp-button--secondary"
                        title={
                          currentProductIds.has(
                            item.productId,
                          )
                            ? "This product has a current restored version."
                            : undefined
                        }
                      >
                        Delete product history
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}

          {totalPages >
            1 && (
            <Pagination
              currentPage={
                safePage
              }
              totalPages={
                totalPages
              }
              onChange={
                setCurrentPage
              }
            />
          )}
        </section>
      </main>

      {/* VERSION MODAL */}

      <HistoryModal
        item={
          selectedVersion
        }
        isRestoring={
          isRestoring
        }
        isWorking={
          isWorking
        }
        onRestore={
          handleRestoreVersion
        }
        onClose={() =>
          setSelectedVersion(
            null,
          )
        }
      />
    </>
  );
}

/* =========================================
   HISTORY MODAL
========================================= */

function HistoryModal({
  item,
  isRestoring,
  isWorking,
  onRestore,
  onClose,
}) {
  if (!item) {
    return null;
  }

  const keywords =
    Array.isArray(
      item.keywords,
    )
      ? item.keywords
      : [];

  return (
    <div
      className="tp-modal-overlay"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !isWorking
        ) {
          onClose();
        }
      }}
    >
      <div className="tp-modal tp-ai-modal">
        <div className="tp-modal__header">
          <div>
            <div className="tp-ai-history-modal-heading">
              <p className="tp-modal__eyebrow">
                AI HISTORY —
                VERSION{" "}
                {item.version}
              </p>

              {item.isCurrent && (
                <span className="tp-ai-history-current-badge">
                  Current
                </span>
              )}
            </div>

            <h2 className="tp-modal__title">
              {item.productTitle}
            </h2>

            <p className="tp-section-subtitle">
              Created:{" "}
              {formatDate(
                item.createdAt,
              )}
            </p>

            {item.isCurrent &&
              item.restoredAt && (
                <p className="tp-ai-history-modal-restored">
                  Restored:{" "}
                  {formatDate(
                    item.restoredAt,
                  )}
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isWorking
            }
            className="tp-modal__close"
          >
            ×
          </button>
        </div>

        <div className="tp-modal__body">
          <div className="tp-ai-result-list">
            <article className="tp-ai-result-card">
              <h3>
                SEO title
              </h3>

              <p>
                {item.seoTitle ||
                  "No SEO title saved."}
              </p>
            </article>

            <article className="tp-ai-result-card">
              <h3>
                SEO description
              </h3>

              <p>
                {item.seoDescription ||
                  "No SEO description saved."}
              </p>
            </article>

            <article className="tp-ai-result-card">
              <h3>
                Product description
              </h3>

              <div
                className="tp-ai-description"
                dangerouslySetInnerHTML={{
                  __html:
                    item.descriptionHtml ||
                    "<p>No description saved.</p>",
                }}
              />
            </article>

            <article className="tp-ai-result-card">
              <h3>
                Image alt text
              </h3>

              <p>
                {item.altText ||
                  "No alt text saved."}
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
                  saved.
                </p>
              )}
            </article>
          </div>
        </div>

        <div className="tp-modal__footer">
          <button
            type="button"
            disabled={
              isWorking ||
              item.isCurrent
            }
            onClick={() =>
              onRestore(
                item,
              )
            }
            className="tp-button tp-button--ai"
          >
            {isRestoring
              ? "Restoring..."
              : item.isCurrent
                ? "Current Version"
                : "Restore This Version"}
          </button>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isWorking
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

/* =========================================
   PREVIEW ROW
========================================= */

function HistoryPreviewRow({
  label,
  value,
}) {
  return (
    <div className="tp-ai-history-preview-row">
      <span>
        {label}
      </span>

      <p>
        {value ||
          "Not generated"}
      </p>
    </div>
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
  return (
    <nav className="tp-pagination">
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
        {Array.from(
          {
            length:
              totalPages,
          },
          (
            _,
            index,
          ) => index + 1,
        ).map(
          (page) => (
            <button
              key={page}
              type="button"
              onClick={() =>
                onChange(
                  page,
                )
              }
              className={
                page ===
                currentPage
                  ? "tp-pagination__number tp-pagination__number--active"
                  : "tp-pagination__number"
              }
            >
              {page}
            </button>
          ),
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
   RESTORE IMAGE ALT TEXT
========================================= */

async function buildRestoreImageAltUpdates(
  admin,
  productId,
  altText,
) {
  if (
    !altText ||
    !productId
  ) {
    return [];
  }

  const response =
    await admin.graphql(
      `
        #graphql
        query ThemePilotRestoreProductImages(
          $id: ID!
        ) {
          product(id: $id) {
            media(first: 100) {
              nodes {
                id
                ... on MediaImage {
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          id: productId,
        },
      },
    );

  const json =
    await response.json();

  if (json.errors) {
    throw new Error(
      json.errors
        .map(
          (error) =>
            error.message,
        )
        .join(", "),
    );
  }

  const mediaNodes =
    json?.data?.product
      ?.media?.nodes ||
    [];

  const imageMedia =
    mediaNodes.filter(
      (media) =>
        media?.id &&
        media?.image?.url,
    );

  return imageMedia.map(
    (
      media,
      index,
    ) => {
      const suffix =
        index === 0
          ? ""
          : ` ${index + 1}`;

      return {
        id:
          media.id,

        alt:
          limitRestoreText(
            `${altText}${suffix}`,
            512,
          ),
      };
    },
  );
}

function limitRestoreText(
  value,
  maximumLength,
) {
  const cleanValue =
    String(
      value || "",
    )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    cleanValue.length <=
    maximumLength
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

/* =========================================
   DATE
========================================= */

function formatDate(
  value,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  ).format(date);
}