import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import {
  buildScanComparison,
  getPreviousScan,
  getScanHistoryById,
} from "../services/history/scan-history.server.js";
import "../styles/dashboard.css";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const scan = await getScanHistoryById(
    session.shop,
    params.id,
  );

  if (!scan) {
    throw new Response("Scan report not found.", {
      status: 404,
    });
  }

  const previousScan = await getPreviousScan(
    session.shop,
    params.id,
  );

  const comparison = previousScan
    ? buildScanComparison(scan, previousScan)
    : null;

  return {
    scan,
    previousScan,
    comparison,
  };
};

export default function ScanReportPage() {
  const {
    scan,
    previousScan,
    comparison,
  } = useLoaderData();

  const productIssues =
    scan.fullResult?.productIssues || [];

  const formattedDate = formatScanDate(
    scan.createdAt,
  );

  const previousDate = previousScan
    ? formatScanDate(previousScan.createdAt)
    : null;

  const reportItems = [
    {
      label: "Products scanned",
      value: scan.totalProducts,
    },
    {
      label: "Images scanned",
      value: scan.totalImages,
    },
    {
      label: "Total issues",
      value: scan.totalIssues,
    },
    {
      label: "Affected products",
      value: scan.affectedProducts,
    },
    {
      label: "Missing descriptions",
      value: scan.productsWithoutDescription,
    },
    {
      label: "Missing SEO titles",
      value: scan.productsWithoutSeoTitle,
    },
    {
      label: "Missing SEO descriptions",
      value: scan.productsWithoutSeoDescription,
    },
    {
      label: "Missing image alt text",
      value: scan.imagesWithoutAltText,
    },
    {
      label: "Large images",
      value: scan.largeImages,
    },
    {
      label: "Pages scanned",
      value: scan.pagesScanned,
    },
  ];

  const comparisonItems = comparison
    ? [
        {
          label: "SEO score",
          metric: comparison.seoScore,
          suffix: "/100",
        },
        {
          label: "Total issues",
          metric: comparison.totalIssues,
        },
        {
          label: "Affected products",
          metric: comparison.affectedProducts,
        },
        {
          label: "Missing descriptions",
          metric: comparison.productsWithoutDescription,
        },
        {
          label: "Missing SEO titles",
          metric: comparison.productsWithoutSeoTitle,
        },
        {
          label: "Missing SEO descriptions",
          metric: comparison.productsWithoutSeoDescription,
        },
        {
          label: "Missing alt text",
          metric: comparison.imagesWithoutAltText,
        },
        {
          label: "Large images",
          metric: comparison.largeImages,
        },
      ]
    : [];

    const handlePdfExport = async () => {
  try {
    const response = await fetch(
      `/app/report/${scan.id}/pdf`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(
        `PDF export failed (${response.status})`,
      );
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `themepilot-report-${scan.id}.pdf`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF export error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "PDF export failed.",
    );
  }
};

  return (
    <main className="tp-dashboard">
      <section className="tp-report-header">
        <div>
          <p className="tp-eyebrow">
            THEMEPILOT AI REPORT
          </p>

          <h1 className="tp-main-heading">
            Scan report
          </h1>

          <p className="tp-section-subtitle">
            {scan.shopName || scan.shop}
          </p>

          <p className="tp-report-date">
            {formattedDate}
          </p>
        </div>
          <div className="tp-report-actions">
            <a
              href={`/app/report/${scan.id}/export`}
              target="_blank"
              rel="noreferrer"
              className="tp-button tp-button--secondary"
            >
              Export CSV
            </a>
            <button
              type="button"
              onClick={handlePdfExport}
              className="tp-button tp-button--primary"
            >
              Export PDF
            </button>
            <Link
              to="/app"
              className="tp-button tp-button--secondary"
            >
              Back to dashboard
            </Link>
          </div>
      </section>

      <section>
        <h2 className="tp-section-heading">
          Store health
        </h2>

        <div className="tp-report-score-card">
          <div>
            <p className="tp-stat-card__label">
              SEO score
            </p>

            <h2 className="tp-report-score">
              {scan.seoScore}/100
            </h2>
          </div>

          <div
            className={`tp-report-grade ${getScoreClass(
              scan.seoScore,
            )}`}
          >
            {getScoreLabel(scan.seoScore)}
          </div>
        </div>
      </section>

      {comparison && previousScan && (
        <section>
          <div className="tp-table-heading">
            <div>
              <h2 className="tp-section-heading tp-section-heading--compact">
                Compare with previous scan
              </h2>

              <p className="tp-section-subtitle">
                Previous scan: {previousDate}
              </p>
            </div>
          </div>

          <div className="tp-comparison-grid">
            {comparisonItems.map((item) => (
              <article
                key={item.label}
                className="tp-comparison-card"
              >
                <p className="tp-comparison-card__label">
                  {item.label}
                </p>

                <div className="tp-comparison-values">
                  <span>
                    {item.metric.previous}
                    {item.suffix || ""}
                  </span>

                  <span className="tp-comparison-arrow">
                    →
                  </span>

                  <strong>
                    {item.metric.current}
                    {item.suffix || ""}
                  </strong>
                </div>

                <div
                  className={`tp-comparison-change tp-comparison-change--${item.metric.status}`}
                >
                  {getDifferenceLabel(item.metric)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!previousScan && (
        <section>
          <div className="tp-empty-state">
            <h3>No previous scan to compare</h3>

            <p className="tp-section-subtitle">
              Run another store scan to unlock progress comparison.
            </p>
          </div>
        </section>
      )}

      <section>
        <h2 className="tp-section-heading">
          Scan details
        </h2>

        <div className="tp-report-grid">
          {reportItems.map((item) => (
            <article
              key={item.label}
              className="tp-stat-card"
            >
              <p className="tp-stat-card__label">
                {item.label}
              </p>

              <h3 className="tp-stat-card__value">
                {item.value}
              </h3>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="tp-table-heading">
          <div>
            <h2 className="tp-section-heading tp-section-heading--compact">
              Products with issues
            </h2>

            <p className="tp-section-subtitle">
              Issues recorded during this scan.
            </p>
          </div>

          <span className="tp-count-badge">
            {productIssues.length} products
          </span>
        </div>

        {productIssues.length === 0 ? (
          <div className="tp-empty-state">
            <h3>No product issues found</h3>

            <p className="tp-section-subtitle">
              This scan recorded no product issues.
            </p>
          </div>
        ) : (
          <div className="tp-table-wrapper">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Issues</th>
                  <th>Count</th>
                </tr>
              </thead>

              <tbody>
                {productIssues.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.title}</strong>
                    </td>

                    <td>
                      <div className="tp-issue-list">
                        {product.issues.map((issue) => (
                          <span
                            key={`${product.id}-${issue.type}`}
                            className={`tp-issue-badge tp-issue-badge--${issue.severity}`}
                          >
                            {issue.label}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <strong>
                        {product.issues.length}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
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
    return "tp-report-grade--good";
  }

  if (score >= 50) {
    return "tp-report-grade--medium";
  }

  return "tp-report-grade--bad";
}

function getScoreLabel(score) {
  if (score >= 80) {
    return "Good";
  }

  if (score >= 50) {
    return "Needs improvement";
  }

  return "Poor";
}

function getDifferenceLabel(metric) {
  if (metric.status === "same") {
    return "No change";
  }

  const sign =
    metric.difference > 0 ? "+" : "-";

  return `${sign}${metric.absoluteDifference} ${
    metric.status === "improved"
      ? "improvement"
      : "decline"
  }`;
}