import {
  Link,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";

import {
  useEffect,
  useState,
} from "react";

import { authenticate } from "../shopify.server";

import {
  getAllScans,
} from "../services/history/scan-history.server.js";

import "../styles/dashboard.css";

const SCANS_PER_PAGE = 10;

export const loader = async ({
  request,
}) => {
  const { session } =
    await authenticate.admin(request);

  const scans =
    await getAllScans(
      session.shop,
    );

  return {
    scans,
  };
};

export const action = async ({
  request,
}) => {
  const { session } =
    await authenticate.admin(request);

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  try {
    if (
      intent ===
      "delete-scan"
    ) {
      const scanId =
        Number(
          formData.get(
            "scanId",
          ),
        );

      if (
        !Number.isInteger(
          scanId,
        )
      ) {
        return {
          success: false,
          type: "delete-scan",
          message:
            "Invalid scan ID.",
        };
      }

      const {
        deleteScanHistory,
      } = await import(
        "../services/history/scan-history.server.js"
      );

      await deleteScanHistory(
        session.shop,
        scanId,
      );

      return {
        success: true,
        type: "delete-scan",
        message:
          "Scan deleted successfully.",
      };
    }

    if (
      intent ===
      "delete-all-scans"
    ) {
      const {
        deleteAllScanHistory,
      } = await import(
        "../services/history/scan-history.server.js"
      );

      await deleteAllScanHistory(
        session.shop,
      );

      return {
        success: true,
        type: "delete-all-scans",
        message:
          "All scan history deleted successfully.",
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
      "ThemePilot Scan History error:",
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

export default function ScanHistoryPage() {
  const { scans } =
    useLoaderData();

  const deleteFetcher =
    useFetcher();

  const revalidator =
    useRevalidator();

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pendingDeleteId,
    setPendingDeleteId,
  ] = useState(null);

  const [
    confirmDeleteAll,
    setConfirmDeleteAll,
  ] = useState(false);

  const isDeleting =
    deleteFetcher.state !==
    "idle";

  const totalScans =
    scans.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalScans /
          SCANS_PER_PAGE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const startIndex =
    (safePage - 1) *
    SCANS_PER_PAGE;

  const pageScans =
    scans.slice(
      startIndex,
      startIndex +
        SCANS_PER_PAGE,
    );

  const handleDeleteScan = (
    scanId,
  ) => {
    if (
      !scanId ||
      isDeleting
    ) {
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "intent",
      "delete-scan",
    );

    formData.append(
      "scanId",
      String(scanId),
    );

    setPendingDeleteId(
      scanId,
    );

    deleteFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const handleDeleteAll =
    () => {
      if (isDeleting) {
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "intent",
        "delete-all-scans",
      );

      deleteFetcher.submit(
        formData,
        {
          method: "post",
        },
      );

      setConfirmDeleteAll(
        false,
      );
    };

  useEffect(() => {
    if (
      !deleteFetcher.data
    ) {
      return;
    }

    if (
      deleteFetcher.data
        .success
    ) {
      setPendingDeleteId(
        null,
      );

      revalidator.revalidate();
    }
  }, [
    deleteFetcher.data,
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

  return (
    <main className="tp-dashboard tp-scan-history-page">
      <section className="tp-all-products-header">
        <div>
          <p className="tp-eyebrow">
            THEMEPILOT AI
          </p>

          <h1 className="tp-main-heading">
            Scan History
          </h1>

          <p className="tp-section-subtitle">
            Review previous store scans,
            health scores and issue reports.
          </p>
        </div>

        <Link
          to="/app"
          className="tp-button tp-button--secondary"
        >
          Back to dashboard
        </Link>
      </section>

      <section>
        <div className="tp-history-heading">
          <div>
            <h2 className="tp-section-heading tp-section-heading--compact">
              All scans
            </h2>

            <p className="tp-section-subtitle">
              Showing{" "}
              {totalScans === 0
                ? 0
                : startIndex +
                  1}
              {" - "}
              {Math.min(
                startIndex +
                  SCANS_PER_PAGE,
                totalScans,
              )}{" "}
              of {totalScans} scans
            </p>
          </div>

          <div className="tp-history-header-actions">
            <span className="tp-count-badge">
              {totalScans} scans
            </span>

            {totalScans > 0 && (
              <button
                type="button"
                disabled={
                  isDeleting
                }
                onClick={() =>
                  setConfirmDeleteAll(
                    true,
                  )
                }
                className="tp-button tp-button--danger"
              >
                Delete all
              </button>
            )}
          </div>
        </div>

        {deleteFetcher.data && (
          <div
            className={
              deleteFetcher.data
                .success
                ? "tp-message tp-message--success"
                : "tp-message tp-message--error"
            }
          >
            {deleteFetcher.data
              .message ||
              deleteFetcher.data
                .error}
          </div>
        )}

        {pageScans.length ===
        0 ? (
          <div className="tp-empty-state">
            <h3>
              No scan history yet
            </h3>

            <p className="tp-section-subtitle">
              Run a store scan to create
              your first report.
            </p>
          </div>
        ) : (
          <div className="tp-history-list">
            {pageScans.map(
              (scan) => (
                <article
                  key={
                    scan.id
                  }
                  className="tp-history-card"
                >
                  <div className="tp-history-card__top">
                    <div>
                      <p className="tp-history-card__date">
                        {formatScanDate(
                          scan.createdAt,
                        )}
                      </p>

                      <h3 className="tp-history-card__title">
                        {scan.shopName ||
                          "Shopify store"}
                      </h3>
                    </div>

                    <div
                      className={`tp-score-badge ${getScoreClass(
                        scan.seoScore,
                      )}`}
                    >
                      {scan.seoScore}
                      /100
                    </div>
                  </div>

                  <div className="tp-history-card__stats">
                    <div>
                      <span>
                        Products
                      </span>

                      <strong>
                        {
                          scan.totalProducts
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total issues
                      </span>

                      <strong>
                        {
                          scan.totalIssues
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Affected products
                      </span>

                      <strong>
                        {
                          scan.affectedProducts
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Missing alt text
                      </span>

                      <strong>
                        {
                          scan.imagesWithoutAltText
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="tp-history-card__footer">
                    <Link
                      to={`/app/report/${scan.id}`}
                      className="tp-button tp-button--small tp-button--secondary"
                    >
                      View report
                    </Link>

                    <button
                      type="button"
                      disabled={
                        isDeleting
                      }
                      onClick={() =>
                        handleDeleteScan(
                          scan.id,
                        )
                      }
                      className="tp-button tp-button--small tp-button--danger"
                    >
                      {pendingDeleteId ===
                        scan.id &&
                      isDeleting
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {totalPages > 1 && (
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

      {confirmDeleteAll && (
        <div className="tp-modal-overlay">
          <div className="tp-modal">
            <div className="tp-modal__header">
              <div>
                <p className="tp-modal__eyebrow">
                  THEMEPILOT AI
                </p>

                <h2 className="tp-modal__title">
                  Delete all history?
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteAll(
                    false,
                  )
                }
                className="tp-modal__close"
              >
                ×
              </button>
            </div>

            <div className="tp-modal__body">
              <p className="tp-section-subtitle">
                This will permanently delete
                all saved scan history.
              </p>
            </div>

            <div className="tp-modal__footer">
              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteAll(
                    false,
                  )
                }
                className="tp-button tp-button--secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteAll
                }
                className="tp-button tp-button--danger"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
        ).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() =>
              onChange(page)
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
        ))}
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

function formatScanDate(
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

function getScoreClass(
  score,
) {
  if (score >= 80) {
    return "tp-score-badge--good";
  }

  if (score >= 50) {
    return "tp-score-badge--medium";
  }

  return "tp-score-badge--low";
}