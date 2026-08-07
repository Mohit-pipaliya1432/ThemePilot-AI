import { Link, useFetcher } from "react-router";

export default function ScanHistory({ scans }) {
  const deleteFetcher = useFetcher();
  const deleteAllFetcher = useFetcher();

  const deletingId =
    deleteFetcher.state !== "idle"
      ? Number(deleteFetcher.formData?.get("scanId"))
      : null;

  const isDeletingAll =
    deleteAllFetcher.state !== "idle";

  const handleDelete = (scan) => {
    const confirmed = window.confirm(
      `Delete scan report #${scan.id}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.append("scanId", String(scan.id));

    deleteFetcher.submit(formData, {
      method: "post",
      action: `/app/report/${scan.id}/delete`,
    });
  };

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      "Delete all scan history? This will permanently remove every saved scan report for this store.",
    );

    if (!confirmed) {
      return;
    }

    deleteAllFetcher.submit(
      {},
      {
        method: "post",
        action: "/app/history/delete-all",
      },
    );
  };

  if (!Array.isArray(scans) || scans.length === 0) {
    return (
      <section>
        <div className="tp-table-heading">
          <div>
            <h2 className="tp-section-heading tp-section-heading--compact">
              Recent scans
            </h2>

            <p className="tp-section-subtitle">
              Your latest store scan reports will appear here.
            </p>
          </div>
        </div>

        <div className="tp-empty-state">
          <h3>No scan history yet</h3>

          <p className="tp-section-subtitle">
            Run your first store scan to create a report.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="tp-table-heading">
        <div>
          <h2 className="tp-section-heading tp-section-heading--compact">
            Recent scans
          </h2>

          <p className="tp-section-subtitle">
            Compare your latest store health results.
          </p>
        </div>

        <div className="tp-history-header-actions">
          <span className="tp-count-badge">
            {scans.length} scans
          </span>

          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
            className="tp-button tp-button--small tp-button--danger"
          >
            {isDeletingAll
              ? "Deleting all..."
              : "Delete all history"}
          </button>
        </div>
      </div>

      <div className="tp-history-list">
        {scans.map((scan) => {
          const isDeleting =
            deletingId === scan.id;

          return (
            <article
              key={scan.id}
              className="tp-history-card"
            >
              <div className="tp-history-card__top">
                <div>
                  <p className="tp-history-card__date">
                    {formatScanDate(scan.createdAt)}
                  </p>

                  <h3 className="tp-history-card__title">
                    {scan.shopName || "Shopify store"}
                  </h3>
                </div>

                <div
                  className={`tp-score-badge ${getScoreClass(
                    scan.seoScore,
                  )}`}
                >
                  {scan.seoScore}/100
                </div>
              </div>

              <div className="tp-history-card__stats">
                <div>
                  <span>Products</span>
                  <strong>{scan.totalProducts}</strong>
                </div>

                <div>
                  <span>Total issues</span>
                  <strong>{scan.totalIssues}</strong>
                </div>

                <div>
                  <span>Affected products</span>
                  <strong>{scan.affectedProducts}</strong>
                </div>

                <div>
                  <span>Missing alt text</span>
                  <strong>{scan.imagesWithoutAltText}</strong>
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
                  onClick={() => handleDelete(scan)}
                  disabled={isDeleting}
                  className="tp-button tp-button--small tp-button--danger"
                >
                  {isDeleting
                    ? "Deleting..."
                    : "Delete report"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatScanDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getScoreClass(score) {
  if (score >= 80) {
    return "tp-score-badge--good";
  }

  if (score >= 50) {
    return "tp-score-badge--medium";
  }

  return "tp-score-badge--low";
}