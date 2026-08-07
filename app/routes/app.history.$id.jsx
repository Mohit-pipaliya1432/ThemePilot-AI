import {
  Link,
  useLoaderData,
} from "react-router";

import { authenticate } from "../shopify.server.js";

import {
  getScanHistoryById,
} from "../services/history/scan-history.server.js";

import "../styles/dashboard.css";

export const loader = async ({
  request,
  params,
}) => {
  const { session } =
    await authenticate.admin(request);

  const scan = await getScanHistoryById(
    session.shop,
    params.id,
  );

  if (!scan) {
    throw new Response(
      "Scan report not found.",
      {
        status: 404,
      },
    );
  }

  return {
    scan,
  };
};

export default function ScanHistoryReport() {
  const { scan } = useLoaderData();

  const details = [
    {
      label: "SEO score",
      value: `${scan.seoScore}/100`,
    },
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
      label: "Missing product descriptions",
      value:
        scan.productsWithoutDescription,
    },
    {
      label: "Missing SEO titles",
      value:
        scan.productsWithoutSeoTitle,
    },
    {
      label: "Missing SEO descriptions",
      value:
        scan.productsWithoutSeoDescription,
    },
    {
      label: "Missing image alt text",
      value:
        scan.imagesWithoutAltText,
    },
    {
      label: "Large images",
      value: scan.largeImages,
    },
  ];

  const productIssues =
    scan.fullResult?.productIssues || [];

  return (
    <main className="tp-dashboard">
      <div className="tp-report-navigation">
        <Link
          to="/app"
          className="tp-button tp-button--small tp-button--secondary"
        >
          ← Back to dashboard
        </Link>
      </div>

      <section className="tp-hero">
        <p className="tp-eyebrow">
          SAVED SCAN REPORT
        </p>

        <h1 className="tp-main-heading">
          {scan.shopName || "Shopify store"}
        </h1>

        <p className="tp-intro">
          Scan completed on{" "}
          {formatScanDate(scan.createdAt)}.
        </p>

        <div
          className={`tp-score-badge tp-report-score ${getScoreClass(
            scan.seoScore,
          )}`}
        >
          SEO score: {scan.seoScore}/100
        </div>
      </section>

      <section>
        <h2 className="tp-section-heading">
          Scan summary
        </h2>

        <div className="tp-details">
          {details.map((item) => (
            <div
              key={item.label}
              className="tp-details__row"
            >
              <span>{item.label}</span>

              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="tp-table-heading">
          <div>
            <h2 className="tp-section-heading tp-section-heading--compact">
              Products requiring attention
            </h2>

            <p className="tp-section-subtitle">
              Issues stored when this scan
              was completed.
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
              All products passed the
              available checks.
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
                {productIssues.map(
                  (product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>
                          {product.title}
                        </strong>
                      </td>

                      <td>
                        <div className="tp-issue-list">
                          {product.issues.map(
                            (issue) => (
                              <span
                                key={`${product.id}-${issue.type}`}
                                className={`tp-issue-badge tp-issue-badge--${issue.severity}`}
                              >
                                {issue.label}
                              </span>
                            ),
                          )}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {product.issues.length}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
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

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(date);
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