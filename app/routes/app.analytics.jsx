import {
  Link,
  useLoaderData,
} from "react-router";

import { authenticate } from "../shopify.server";

import {
  getAllScans,
} from "../services/history/scan-history.server.js";

import {
  getAllAIContentHistory,
} from "../services/history/ai-history.server.js";

import "../styles/dashboard.css";
import "../styles/analytics.css";

/* =========================================
   LOADER
========================================= */

export const loader = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const scans =
    await getAllScans(
      session.shop,
    );

  const aiHistory =
    await getAllAIContentHistory(
      session.shop,
    );

  return {
    scans,
    aiHistory,
  };
};

/* =========================================
   ANALYTICS PAGE
========================================= */

export default function AnalyticsPage() {
  const {
    scans,
    aiHistory,
  } = useLoaderData();

  const validScans =
    Array.isArray(scans)
      ? [...scans].sort(
          (a, b) =>
            new Date(a.createdAt) -
            new Date(b.createdAt),
        )
      : [];

  return (
    <main className="tp-dashboard tp-analytics-page">
      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <section className="tp-all-products-header">
        <div>
          <p className="tp-eyebrow">
            THEMEPILOT AI
          </p>

          <h1 className="tp-main-heading">
            Store Analytics
          </h1>

          <p className="tp-section-subtitle">
            Track SEO health, store issues
            and improvements across your
            scan history.
          </p>
        </div>

        <Link
          to="/app"
          className="tp-button tp-button--secondary"
        >
          Back to dashboard
        </Link>
      </section>

      {validScans.length === 0 ? (
        <>
          <EmptyAnalytics />

          <AIContentAnalytics
            history={
              Array.isArray(aiHistory)
                ? aiHistory
                : []
            }
          />
        </>
      ) : (
        <AnalyticsDashboard
          scans={validScans}
          aiHistory={
            Array.isArray(aiHistory)
              ? aiHistory
              : []
          }
        />
      )}
    </main>
  );
}

/* =========================================
   EMPTY STATE
========================================= */

function EmptyAnalytics() {
  return (
    <section className="tp-analytics">
      <div className="tp-table-heading">
        <div>
          <p className="tp-analytics__eyebrow">
            STORE ANALYTICS
          </p>

          <h2 className="tp-section-heading tp-section-heading--compact">
            Performance analytics
          </h2>

          <p className="tp-section-subtitle">
            Run store scans to start
            building SEO and issue trends.
          </p>
        </div>
      </div>

      <div className="tp-empty-state">
        <h3>
          No analytics available yet
        </h3>

        <p className="tp-section-subtitle">
          Your scan history will be used
          to create performance analytics.
        </p>
      </div>
    </section>
  );
}

/* =========================================
   ANALYTICS DASHBOARD
========================================= */

function AnalyticsDashboard({
  scans,
  aiHistory = [],
}) {
  const scores =
    scans.map(
      (scan) =>
        Number(
          scan.seoScore || 0,
        ),
    );

  const totalScans =
    scans.length;

  const averageScore =
    Math.round(
      scores.reduce(
        (
          total,
          score,
        ) =>
          total + score,
        0,
      ) / totalScans,
    );

  const bestScore =
    Math.max(
      ...scores,
    );

  const worstScore =
    Math.min(
      ...scores,
    );

  const firstScan =
    scans[0];

  const latestScan =
    scans[
      scans.length - 1
    ];

  const scoreChange =
    Number(
      latestScan?.seoScore ||
        0,
    ) -
    Number(
      firstScan?.seoScore ||
        0,
    );

  const issueChange =
    Number(
      latestScan?.totalIssues ||
        0,
    ) -
    Number(
      firstScan?.totalIssues ||
        0,
    );

  const latestIssues =
    Number(
      latestScan?.totalIssues ||
        0,
    );

  const latestAffected =
    Number(
      latestScan
        ?.affectedProducts ||
        0,
    );

  const latestMissingAlt =
    Number(
      latestScan
        ?.imagesWithoutAltText ||
        0,
    );

  const issueDistribution = [
    {
      label:
        "Descriptions",
      value:
        Number(
          latestScan
            ?.productsWithoutDescription ||
            0,
        ),
    },

    {
      label:
        "SEO titles",
      value:
        Number(
          latestScan
            ?.productsWithoutSeoTitle ||
            0,
        ),
    },

    {
      label:
        "SEO descriptions",
      value:
        Number(
          latestScan
            ?.productsWithoutSeoDescription ||
            0,
        ),
    },

    {
      label:
        "Alt text",
      value:
        Number(
          latestScan
            ?.imagesWithoutAltText ||
            0,
        ),
    },

    {
      label:
        "Large images",
      value:
        Number(
          latestScan
            ?.largeImages ||
            0,
        ),
    },
  ];

  const maxDistributionValue =
    Math.max(
      1,
      ...issueDistribution.map(
        (item) =>
          item.value,
      ),
    );

  return (
    <section className="tp-analytics">
      {/* =====================================
          ANALYTICS HEADER
      ====================================== */}

      <div className="tp-table-heading">
        <div>
          <p className="tp-analytics__eyebrow">
            STORE ANALYTICS
          </p>

          <h2 className="tp-section-heading tp-section-heading--compact">
            Performance analytics
          </h2>

          <p className="tp-section-subtitle">
            Performance data from your
            saved store scans.
          </p>
        </div>

        <span className="tp-count-badge">
          {totalScans}{" "}
          {totalScans === 1
            ? "scan"
            : "scans"}
        </span>
      </div>

      {/* =====================================
          SUMMARY STATS
      ====================================== */}

      <div className="tp-analytics-stats">
        <AnalyticsStatCard
          label="Average SEO score"
          value={`${averageScore}/100`}
          description="Average across all scans"
        />

        <AnalyticsStatCard
          label="Best SEO score"
          value={`${bestScore}/100`}
          description="Highest recorded score"
          status="good"
        />

        <AnalyticsStatCard
          label="Worst SEO score"
          value={`${worstScore}/100`}
          description="Lowest recorded score"
        />

        <AnalyticsStatCard
          label="SEO progress"
          value={
            formatSignedNumber(
              scoreChange,
            )
          }
          description="First scan to latest scan"
          status={
            scoreChange > 0
              ? "good"
              : scoreChange < 0
                ? "bad"
                : "neutral"
          }
        />
      </div>

      <AIContentAnalytics
        history={aiHistory}
      />

      {/* =====================================
          CHARTS
      ====================================== */}

      <div className="tp-analytics-chart-grid">
        <TrendChart
          title="SEO score trend"
          subtitle="SEO health across your scans"
          scans={scans}
          valueKey="seoScore"
          maxValue={100}
          suffix="/100"
        />

        <TrendChart
          title="Total issues trend"
          subtitle="Detected issues across your scans"
          scans={scans}
          valueKey="totalIssues"
        />
      </div>

      {/* =====================================
          LATEST HEALTH + DISTRIBUTION
      ====================================== */}

      <div className="tp-analytics-bottom-grid">
        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>
                Latest scan health
              </h3>

              <p>
                Current store issue
                overview.
              </p>
            </div>

            <span className="tp-count-badge">
              {formatScanDate(
                latestScan.createdAt,
              )}
            </span>
          </div>

          <div className="tp-health-grid">
            <HealthItem
              label="SEO score"
              value={`${latestScan.seoScore}/100`}
            />

            <HealthItem
              label="Total issues"
              value={
                latestIssues
              }
            />

            <HealthItem
              label="Affected products"
              value={
                latestAffected
              }
            />

            <HealthItem
              label="Missing alt text"
              value={
                latestMissingAlt
              }
            />
          </div>
        </article>

        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>
                Issue distribution
              </h3>

              <p>
                Breakdown from the
                latest scan.
              </p>
            </div>
          </div>

          <div className="tp-distribution-list">
            {issueDistribution.map(
              (item) => (
                <DistributionRow
                  key={
                    item.label
                  }
                  label={
                    item.label
                  }
                  value={
                    item.value
                  }
                  maxValue={
                    maxDistributionValue
                  }
                />
              ),
            )}
          </div>
        </article>
      </div>

      {/* =====================================
          PROGRESS SUMMARY
      ====================================== */}

      <section className="tp-analytics-progress-section">
        <div className="tp-table-heading">
          <div>
            <h2 className="tp-section-heading tp-section-heading--compact">
              Progress summary
            </h2>

            <p className="tp-section-subtitle">
              Compare your first recorded
              scan with the latest scan.
            </p>
          </div>
        </div>

        <div className="tp-analytics-progress-grid">
          <ProgressCard
            label="SEO score"
            previous={
              firstScan.seoScore
            }
            current={
              latestScan.seoScore
            }
            difference={
              scoreChange
            }
            higherIsBetter
          />

          <ProgressCard
            label="Total issues"
            previous={
              firstScan.totalIssues
            }
            current={
              latestScan.totalIssues
            }
            difference={
              issueChange
            }
            higherIsBetter={
              false
            }
          />

          <ProgressCard
            label="Affected products"
            previous={
              firstScan
                .affectedProducts
            }
            current={
              latestScan
                .affectedProducts
            }
            difference={
              Number(
                latestScan
                  .affectedProducts ||
                  0,
              ) -
              Number(
                firstScan
                  .affectedProducts ||
                  0,
              )
            }
            higherIsBetter={
              false
            }
          />

          <ProgressCard
            label="Missing alt text"
            previous={
              firstScan
                .imagesWithoutAltText
            }
            current={
              latestScan
                .imagesWithoutAltText
            }
            difference={
              Number(
                latestScan
                  .imagesWithoutAltText ||
                  0,
              ) -
              Number(
                firstScan
                  .imagesWithoutAltText ||
                  0,
              )
            }
            higherIsBetter={
              false
            }
          />
        </div>
      </section>
    </section>
  );
}

/* =========================================
   ANALYTICS STAT CARD
========================================= */

function AnalyticsStatCard({
  label,
  value,
  description,
  status = "neutral",
}) {
  return (
    <article className="tp-analytics-stat">
      <p className="tp-analytics-stat__label">
        {label}
      </p>

      <strong
        className={`tp-analytics-stat__value tp-analytics-stat__value--${status}`}
      >
        {value}
      </strong>

      <p className="tp-analytics-stat__description">
        {description}
      </p>
    </article>
  );
}

/* =========================================
   TREND CHART
========================================= */

function TrendChart({
  title,
  subtitle,
  scans,
  valueKey,
  maxValue,
  suffix = "",
}) {
  const chartScans =
    scans.slice(-10);

  const values =
    chartScans.map(
      (scan) =>
        Number(
          scan?.[valueKey] ||
            0,
        ),
    );

  const width = 600;
  const height = 220;

  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 22;
  const paddingBottom = 36;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const calculatedMax =
    maxValue ||
    Math.max(
      1,
      ...values,
    );

  const points =
    values.map(
      (
        value,
        index,
      ) => {
        const denominator =
          Math.max(
            1,
            values.length -
              1,
          );

        const x =
          paddingLeft +
          (index /
            denominator) *
            chartWidth;

        const y =
          paddingTop +
          chartHeight -
          (Math.min(
            value,
            calculatedMax,
          ) /
            calculatedMax) *
            chartHeight;

        return {
          x,
          y,
          value,
        };
      },
    );

  const polylinePoints =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`,
      )
      .join(" ");

  return (
    <article className="tp-analytics-panel">
      <div className="tp-analytics-panel__header">
        <div>
          <h3>
            {title}
          </h3>

          <p>
            {subtitle}
          </p>
        </div>

        {values.length >
          0 && (
          <strong className="tp-chart-current">
            {
              values[
                values.length -
                  1
              ]
            }
            {suffix}
          </strong>
        )}
      </div>

      <div className="tp-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            title
          }
        >
          {[
            0,
            0.25,
            0.5,
            0.75,
            1,
          ].map(
            (
              percentage,
            ) => {
              const y =
                paddingTop +
                chartHeight -
                chartHeight *
                  percentage;

              const label =
                Math.round(
                  calculatedMax *
                    percentage,
                );

              return (
                <g
                  key={
                    percentage
                  }
                >
                  <line
                    x1={
                      paddingLeft
                    }
                    y1={y}
                    x2={
                      width -
                      paddingRight
                    }
                    y2={y}
                    className="tp-chart__grid"
                  />

                  <text
                    x={
                      paddingLeft -
                      8
                    }
                    y={y + 4}
                    textAnchor="end"
                    className="tp-chart__axis-text"
                  >
                    {label}
                  </text>
                </g>
              );
            },
          )}

          {points.length >
            1 && (
            <polyline
              points={
                polylinePoints
              }
              fill="none"
              className="tp-chart__line"
            />
          )}

          {points.map(
            (
              point,
              index,
            ) => (
              <g
                key={`${point.x}-${index}`}
              >
                <circle
                  cx={
                    point.x
                  }
                  cy={
                    point.y
                  }
                  r="5"
                  className="tp-chart__point"
                />

                <text
                  x={
                    point.x
                  }
                  y={
                    height -
                    10
                  }
                  textAnchor="middle"
                  className="tp-chart__axis-text"
                >
                  {index +
                    1}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>

      <div className="tp-chart-legend">
        <span>
          Older
        </span>

        <span>
          Scan number
        </span>

        <span>
          Latest
        </span>
      </div>
    </article>
  );
}

/* =========================================
   HEALTH ITEM
========================================= */

function HealthItem({
  label,
  value,
}) {
  return (
    <div className="tp-health-item">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================
   DISTRIBUTION
========================================= */

function DistributionRow({
  label,
  value,
  maxValue,
}) {
  const width =
    Math.min(
      100,
      Math.round(
        (Number(
          value || 0,
        ) /
          Math.max(
            1,
            maxValue,
          )) *
          100,
      ),
    );

  return (
    <div className="tp-distribution-row">
      <div className="tp-distribution-row__top">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

      <div className="tp-distribution-track">
        <span
          className="tp-distribution-bar"
          style={{
            width:
              `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================
   PROGRESS CARD
========================================= */

function ProgressCard({
  label,
  previous,
  current,
  difference,
  higherIsBetter,
}) {
  const numericDifference =
    Number(
      difference || 0,
    );

  let status =
    "same";

  if (
    numericDifference !==
    0
  ) {
    if (
      higherIsBetter
    ) {
      status =
        numericDifference >
        0
          ? "improved"
          : "declined";
    } else {
      status =
        numericDifference <
        0
          ? "improved"
          : "declined";
    }
  }

  return (
    <article className="tp-comparison-card">
      <p className="tp-comparison-card__label">
        {label}
      </p>

      <div className="tp-comparison-values">
        <strong>
          {previous}
        </strong>

        <span className="tp-comparison-arrow">
          →
        </span>

        <strong>
          {current}
        </strong>
      </div>

      <span
        className={`tp-comparison-change tp-comparison-change--${status}`}
      >
        {status ===
        "same"
          ? "No change"
          : `${formatSignedNumber(
              numericDifference,
            )} ${status}`}
      </span>
    </article>
  );
}

/* =========================================
   AI CONTENT ANALYTICS
========================================= */

function AIContentAnalytics({
  history,
}) {
  const validHistory =
    Array.isArray(history)
      ? history
      : [];

  const totalVersions =
    validHistory.length;

  const productIds =
    new Set(
      validHistory.map(
        (item) =>
          item.productId,
      ),
    );

  const productsImproved =
    productIds.size;

  const averageVersions =
    productsImproved > 0
      ? (
          totalVersions /
          productsImproved
        ).toFixed(1)
      : "0";

  const sortedHistory =
    [...validHistory].sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt),
    );

  const latestActivity =
    sortedHistory[0] ||
    null;

  const productVersionCounts =
    new Map();

  for (
    const item of
    validHistory
  ) {
    const key =
      item.productId;

    const existing =
      productVersionCounts.get(
        key,
      ) || {
        productTitle:
          item.productTitle ||
          "Product",
        count: 0,
      };

    existing.count += 1;

    productVersionCounts.set(
      key,
      existing,
    );
  }

  const mostActiveProduct =
    [
      ...productVersionCounts.values(),
    ].sort(
      (a, b) =>
        b.count - a.count,
    )[0] || null;

  const lastSevenDays =
    buildAIActivityDays(
      validHistory,
      7,
    );

  return (
    <section className="tp-analytics-progress-section">
      <div className="tp-table-heading">
        <div>
          <p className="tp-analytics__eyebrow">
            AI ACTIVITY
          </p>

          <h2 className="tp-section-heading tp-section-heading--compact">
            AI content analytics
          </h2>

          <p className="tp-section-subtitle">
            Track generated content versions
            and product-level AI activity.
          </p>
        </div>

        <span className="tp-count-badge">
          {totalVersions}{" "}
          {totalVersions === 1
            ? "version"
            : "versions"}
        </span>
      </div>

      <div className="tp-analytics-stats">
        <AnalyticsStatCard
          label="AI versions generated"
          value={totalVersions}
          description="Total saved AI content versions"
          status={
            totalVersions > 0
              ? "good"
              : "neutral"
          }
        />

        <AnalyticsStatCard
          label="Products improved"
          value={productsImproved}
          description="Unique products with saved AI content"
          status={
            productsImproved > 0
              ? "good"
              : "neutral"
          }
        />

        <AnalyticsStatCard
          label="Average versions"
          value={averageVersions}
          description="Average AI versions per product"
        />

        <AnalyticsStatCard
          label="Last AI activity"
          value={
            latestActivity
              ? `V${latestActivity.version}`
              : "—"
          }
          description={
            latestActivity
              ? formatActivityDate(
                  latestActivity.createdAt,
                )
              : "No AI content generated yet"
          }
        />
      </div>

      <div className="tp-analytics-bottom-grid">
        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>
                Most active product
              </h3>

              <p>
                Product with the most saved
                AI content versions.
              </p>
            </div>

            {mostActiveProduct && (
              <span className="tp-count-badge">
                {mostActiveProduct.count}{" "}
                {mostActiveProduct.count === 1
                  ? "version"
                  : "versions"}
              </span>
            )}
          </div>

          {mostActiveProduct ? (
            <div className="tp-health-grid">
              <HealthItem
                label="Product"
                value={
                  mostActiveProduct.productTitle
                }
              />

              <HealthItem
                label="Versions"
                value={
                  mostActiveProduct.count
                }
              />

              <HealthItem
                label="Total products"
                value={
                  productsImproved
                }
              />

              <HealthItem
                label="Total versions"
                value={
                  totalVersions
                }
              />
            </div>
          ) : (
            <div className="tp-empty-state">
              <h3>
                No AI activity yet
              </h3>

              <p className="tp-section-subtitle">
                Generate AI content to start
                building activity analytics.
              </p>
            </div>
          )}
        </article>

        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>
                Last 7 days
              </h3>

              <p>
                Saved AI content versions by day.
              </p>
            </div>
          </div>

          <div className="tp-distribution-list">
            {lastSevenDays.map(
              (item) => (
                <DistributionRow
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  maxValue={
                    Math.max(
                      1,
                      ...lastSevenDays.map(
                        (entry) =>
                          entry.value,
                      ),
                    )
                  }
                />
              ),
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function buildAIActivityDays(
  history,
  numberOfDays,
) {
  const today =
    new Date();

  const values = [];

  for (
    let offset =
      numberOfDays - 1;
    offset >= 0;
    offset -= 1
  ) {
    const day =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() -
          offset,
      );

    const nextDay =
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + 1,
      );

    const count =
      history.filter(
        (item) => {
          const createdAt =
            new Date(
              item.createdAt,
            );

          return (
            !Number.isNaN(
              createdAt.getTime(),
            ) &&
            createdAt >= day &&
            createdAt < nextDay
          );
        },
      ).length;

    values.push({
      key:
        day.toISOString(),
      label:
        new Intl.DateTimeFormat(
          "en-IN",
          {
            weekday: "short",
          },
        ).format(day),
      value:
        count,
    });
  }

  return values;
}

function formatActivityDate(
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

/* =========================================
   HELPERS
========================================= */

function formatSignedNumber(
  value,
) {
  const number =
    Number(
      value || 0,
    );

  if (number > 0) {
    return `+${number}`;
  }

  return String(
    number,
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
    },
  ).format(date);
}