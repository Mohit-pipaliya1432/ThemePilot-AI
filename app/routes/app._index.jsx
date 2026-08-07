import { useEffect, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";

import { authenticate } from "../shopify.server";

import DashboardHero from "../components/dashboard/DashboardHero.jsx";
import DashboardCards from "../components/dashboard/DashboardCards.jsx";
import ScanSummary from "../components/dashboard/ScanSummary.jsx";

import ProductTable from "../components/product/ProductTable.jsx";
import AIProductsTable from "../components/product/AIProductsTable.jsx";
import FixModal from "../components/product/FixModal.jsx";

import ScanHistory from "../components/history/ScanHistory.jsx";
import AppLoader from "../components/common/AppLoader.jsx";

import {
  applyProductFix,
  generateAISuggestion,
  scanStore,
} from "../services/scanner/scanner.server.js";

import {
  getRecentScans,
  getAllScans,
} from "../services/history/scan-history.server.js";

import {
  buildAIFixes,
  generateAIContent,
} from "../services/ai/openai.server.js";

import {
  getAppSettings,
} from "../services/settings/app-settings.server.js";

import "../styles/dashboard.css";
import "../styles/analytics.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const recentScans = await getRecentScans(
    session.shop,
    5,
  );

  const allScans = await getAllScans(
    session.shop,
  );

  return {
    recentScans,
    allScans,
  };
};

export const action = async ({ request }) => {
  const { admin, session } =
    await authenticate.admin(request);

  const settings =
    await getAppSettings(
      session.shop,
    );

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "scan-store") {
      return await scanStore(admin);
    }

    if (intent === "generate-suggestion") {
      const productValue = formData.get("product");

      if (
        !productValue ||
        typeof productValue !== "string"
      ) {
        return {
          success: false,
          type: "suggestion",
          message: "Product information is missing.",
        };
      }

      const product = JSON.parse(productValue);
      const result = generateAISuggestion(product);

      return {
        success: true,
        type: "suggestion",
        product,
        suggestions: result.suggestions,
        fixes: result.fixes,
      };
    }

    if (intent === "generate-ai-content") {
      const productValue = formData.get("product");

      if (
        !productValue ||
        typeof productValue !== "string"
      ) {
        return {
          success: false,
          type: "ai-content",
          message: "Product information is missing.",
        };
      }

      const product = JSON.parse(productValue);

     const result = await generateAIContent(
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

    if (intent === "regenerate-ai-content") {
      const productValue = formData.get("product");
      const previousContentValue =
        formData.get("previousContent");

      if (
        !productValue ||
        typeof productValue !== "string"
      ) {
        return {
          success: false,
          type: "ai-content",
          message: "Product information is missing.",
        };
      }

      const product = JSON.parse(productValue);

      let previousContent = null;

      if (
        previousContentValue &&
        typeof previousContentValue === "string"
      ) {
        try {
          previousContent = JSON.parse(
            previousContentValue,
          );
        } catch {
          previousContent = null;
        }
      }

      const result = await generateAIContent(
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

    if (intent === "apply-ai-content") {
      const productValue = formData.get("product");
      const contentValue = formData.get("content");

      if (
        !productValue ||
        typeof productValue !== "string" ||
        !contentValue ||
        typeof contentValue !== "string"
      ) {
        return {
          success: false,
          type: "apply-ai-content",
          message: "AI product or content information is missing.",
        };
      }

      const product = JSON.parse(productValue);
      const content = JSON.parse(contentValue);
      const fixes = buildAIFixes(product, content);

      const result = await applyProductFix(
        admin,
        fixes,
      );

      return {
        ...result,
        type: "apply-ai-content",
      };
    }

    if (intent === "apply-fix") {
      const fixesValue = formData.get("fixes");

      if (
        !fixesValue ||
        typeof fixesValue !== "string"
      ) {
        return {
          success: false,
          type: "apply-fix",
          message: "Fix information is missing.",
        };
      }

      const fixes = JSON.parse(fixesValue);

      return await applyProductFix(
        admin,
        fixes,
      );
    }

    return {
      success: false,
      type: "unknown",
      message: "Invalid request.",
    };
  } catch (error) {
    console.error("ThemePilot error:", error);

    return {
      success: false,
      type: intent || "unknown",
      message: "The request could not be completed.",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
};

function AIImproveModal({
  product,
  content,
  isLoading,
  isRegenerating,
  isApplyingContent,
  error,
  applyError,
  onRegenerate,
  onApplyContent,
  onClose,
}) {
  if (!product) {
    return null;
  }

  const keywords = Array.isArray(
    content?.keywords,
  )
    ? content.keywords
    : [];

  return (
    <div
      className="tp-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isLoading &&
          !isApplyingContent
        ) {
          onClose();
        }
      }}
    >
      <div
        className="tp-modal tp-ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-ai-modal-title"
      >
        <div className="tp-modal__header">
          <div>
            <p className="tp-modal__eyebrow">
              Theme Pilot AI IMPROVEMENT
            </p>

            <h2
              id="tp-ai-modal-title"
              className="tp-modal__title"
            >
              {product.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              isLoading ||
              isApplyingContent
            }
            className="tp-modal__close"
            aria-label="Close AI popup"
          >
            ×
          </button>
        </div>

        <div className="tp-modal__body">
          {isLoading ? (
            <div className="tp-modal__loading">
              <div className="tp-spinner" />

              <p>
                {isRegenerating
                  ? "Theme Pilot AI is generating a fresh alternative..."
                  : "Theme Pilot AI is generating product improvements..."}
              </p>
            </div>
          ) : error ? (
            <div className="tp-message tp-message--error">
              {error}
            </div>
          ) : !content ? (
            <div className="tp-modal__empty">
              AI content is not available.
            </div>
          ) : (
            <>
              {applyError && (
                <div className="tp-message tp-message--error">
                  {applyError}
                </div>
              )}

              <div className="tp-message tp-message--success">
                AI content ready. You can regenerate it
                if you want another version.
              </div>

              <div className="tp-ai-result-list">
                <article className="tp-ai-result-card">
                  <h3>SEO title</h3>

                  <p>
                    {content.seoTitle ||
                      "No SEO title generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>SEO description</h3>

                  <p>
                    {content.seoDescription ||
                      "No SEO description generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>Product description</h3>

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
                  <h3>Image alt text</h3>

                  <p>
                    {content.altText ||
                      "No image alt text generated."}
                  </p>
                </article>

                <article className="tp-ai-result-card">
                  <h3>Focus keywords</h3>

                  {keywords.length > 0 ? (
                    <div className="tp-ai-keywords">
                      {keywords.map(
                        (keyword) => (
                          <span
                            key={keyword}
                            className="tp-ai-keyword"
                          >
                            {keyword}
                          </span>
                        ),
                      )}
                    </div>
                  ) : (
                    <p>
                      No keywords generated.
                    </p>
                  )}
                </article>
              </div>
            </>
          )}
        </div>

        <div className="tp-modal__footer">
          {content && !error && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={
                isLoading ||
                isApplyingContent
              }
              className="tp-button tp-button--ai"
            >
              {isRegenerating
                ? "Regenerating..."
                : "Regenerate"}
            </button>
          )}

          {content && !error && (
            <button
              type="button"
              onClick={onApplyContent}
              disabled={
                isLoading ||
                isApplyingContent
              }
              className="tp-button tp-button--primary"
            >
              {isApplyingContent
                ? "Applying AI Content..."
                : "Apply AI Content"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={
              isLoading ||
              isApplyingContent
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

function AnalyticsDashboard({ scans }) {
  const validScans = Array.isArray(scans)
    ? scans
    : [];

  if (validScans.length === 0) {
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
              Run store scans to build SEO and issue
              trend analytics.
            </p>
          </div>
        </div>

        <div className="tp-empty-state">
          <h3>No analytics available yet</h3>

          <p className="tp-section-subtitle">
            Your scan history will be used to create
            performance trends.
          </p>
        </div>
      </section>
    );
  }

  const scores = validScans.map(
    (scan) => Number(scan.seoScore || 0),
  );

  const totalScans = validScans.length;

  const averageScore = Math.round(
    scores.reduce(
      (total, score) => total + score,
      0,
    ) / totalScans,
  );

  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);

  const latestScan =
    validScans[validScans.length - 1];

  const firstScan = validScans[0];

  const scoreChange =
    Number(latestScan?.seoScore || 0) -
    Number(firstScan?.seoScore || 0);

  const latestIssues = Number(
    latestScan?.totalIssues || 0,
  );

  const latestAffected = Number(
    latestScan?.affectedProducts || 0,
  );

  const latestMissingAlt = Number(
    latestScan?.imagesWithoutAltText || 0,
  );

  const issueDistribution = [
    {
      label: "Descriptions",
      value: Number(
        latestScan?.productsWithoutDescription || 0,
      ),
    },
    {
      label: "SEO titles",
      value: Number(
        latestScan?.productsWithoutSeoTitle || 0,
      ),
    },
    {
      label: "SEO descriptions",
      value: Number(
        latestScan?.productsWithoutSeoDescription ||
          0,
      ),
    },
    {
      label: "Alt text",
      value: Number(
        latestScan?.imagesWithoutAltText || 0,
      ),
    },
    {
      label: "Large images",
      value: Number(
        latestScan?.largeImages || 0,
      ),
    },
  ];

  const maxDistributionValue = Math.max(
    1,
    ...issueDistribution.map(
      (entry) => entry.value,
    ),
  );

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
            Track SEO health and store issues across
            your scan history.
          </p>
        </div>

        <span className="tp-count-badge">
          {totalScans} scans
        </span>
      </div>

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
        />

        <AnalyticsStatCard
          label="Worst SEO score"
          value={`${worstScore}/100`}
          description="Lowest recorded score"
        />

        <AnalyticsStatCard
          label="SEO progress"
          value={formatSignedNumber(
            scoreChange,
          )}
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

      <div className="tp-analytics-chart-grid">
        <TrendChart
          title="SEO score trend"
          subtitle="SEO health across scans"
          scans={validScans}
          valueKey="seoScore"
          maxValue={100}
        />

        <TrendChart
          title="Total issues trend"
          subtitle="Detected issues across scans"
          scans={validScans}
          valueKey="totalIssues"
        />
      </div>

      <div className="tp-analytics-bottom-grid">
        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>Latest scan health</h3>

              <p>
                Current store issue overview.
              </p>
            </div>
          </div>

          <div className="tp-health-grid">
            <div className="tp-health-item">
              <span>Total issues</span>
              <strong>
                {latestIssues}
              </strong>
            </div>

            <div className="tp-health-item">
              <span>
                Affected products
              </span>
              <strong>
                {latestAffected}
              </strong>
            </div>

            <div className="tp-health-item">
              <span>
                Missing alt text
              </span>
              <strong>
                {latestMissingAlt}
              </strong>
            </div>

            <div className="tp-health-item">
              <span>SEO score</span>
              <strong>
                {latestScan?.seoScore || 0}/100
              </strong>
            </div>
          </div>
        </article>

        <article className="tp-analytics-panel">
          <div className="tp-analytics-panel__header">
            <div>
              <h3>Issue distribution</h3>

              <p>
                Breakdown from the latest scan.
              </p>
            </div>
          </div>

          <div className="tp-distribution-list">
            {issueDistribution.map(
              (item) => (
                <DistributionRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  maxValue={
                    maxDistributionValue
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

function TrendChart({
  title,
  subtitle,
  scans,
  valueKey,
  maxValue,
}) {
  const chartScans = scans.slice(-10);

  const values = chartScans.map(
    (scan) =>
      Number(scan?.[valueKey] || 0),
  );

  const width = 600;
  const height = 220;

  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 22;
  const paddingBottom = 36;

  const chartWidth =
    width - paddingLeft - paddingRight;

  const chartHeight =
    height - paddingTop - paddingBottom;

  const calculatedMax = maxValue
    ? maxValue
    : Math.max(1, ...values);

  const points = values.map(
    (value, index) => {
      const denominator = Math.max(
        1,
        values.length - 1,
      );

      const x =
        paddingLeft +
        (index / denominator) *
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

  const polylinePoints = points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(" ");

  return (
    <article className="tp-analytics-panel">
      <div className="tp-analytics-panel__header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        {values.length > 0 && (
          <strong className="tp-chart-current">
            {values[
              values.length - 1
            ]}
            {valueKey === "seoScore"
              ? "/100"
              : ""}
          </strong>
        )}
      </div>

      <div className="tp-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map(
            (percentage) => {
              const y =
                paddingTop +
                chartHeight -
                chartHeight *
                  percentage;

              const label = Math.round(
                calculatedMax *
                  percentage,
              );

              return (
                <g key={percentage}>
                  <line
                    x1={paddingLeft}
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
                      paddingLeft - 8
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

          {points.length > 1 && (
            <polyline
              points={
                polylinePoints
              }
              fill="none"
              className="tp-chart__line"
            />
          )}

          {points.map(
            (point, index) => (
              <g
                key={`${point.x}-${index}`}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="tp-chart__point"
                />

                <text
                  x={point.x}
                  y={
                    height - 10
                  }
                  textAnchor="middle"
                  className="tp-chart__axis-text"
                >
                  {index + 1}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>

      <div className="tp-chart-legend">
        <span>Older</span>
        <span>Scan number</span>
        <span>Latest</span>
      </div>
    </article>
  );
}

function DistributionRow({
  label,
  value,
  maxValue,
}) {
  const width = Math.min(
    100,
    Math.round(
      (Number(value || 0) /
        Math.max(1, maxValue)) *
        100,
    ),
  );

  return (
    <div className="tp-distribution-row">
      <div className="tp-distribution-row__top">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="tp-distribution-track">
        <span
          className="tp-distribution-bar"
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
}

function formatSignedNumber(value) {
  const number = Number(value || 0);

  if (number > 0) {
    return `+${number}`;
  }

  return String(number);
}

export default function Index() {
  const loaderData = useLoaderData();
  const revalidator = useRevalidator();

  const scanFetcher = useFetcher();
  const suggestionFetcher = useFetcher();
  const applyFetcher = useFetcher();
  const aiFetcher = useFetcher();
  const aiApplyFetcher = useFetcher();

  const [scanResult, setScanResult] =
    useState(null);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    suggestions,
    setSuggestions,
  ] = useState([]);

  const [
    generatedFixes,
    setGeneratedFixes,
  ] = useState(null);

  const [
    applyResult,
    setApplyResult,
  ] = useState(null);

  const [
    selectedAIProduct,
    setSelectedAIProduct,
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
    aiApplyError,
    setAIApplyError,
  ] = useState(null);

  const [
    aiRequestMode,
    setAIRequestMode,
  ] = useState("generate");

  const isScanning =
    scanFetcher.state !== "idle";

  const isGenerating =
    suggestionFetcher.state !== "idle";

  const isApplying =
    applyFetcher.state !== "idle";

  const isAIGenerating =
    aiFetcher.state !== "idle";

  const isAIApplying =
    aiApplyFetcher.state !== "idle";

  const isAIRegenerating =
    isAIGenerating &&
    aiRequestMode === "regenerate";

  const summary =
    scanResult?.success
      ? scanResult.summary
      : null;

  const recentScans =
    loaderData?.recentScans || [];

  const allScans =
    loaderData?.allScans || [];

  const productsForAI =
    scanResult?.success &&
    Array.isArray(
      scanResult.productsForAI,
    )
      ? scanResult.productsForAI
      : [];

  const runStoreScan = () => {
    const formData =
      new FormData();

    formData.append(
      "intent",
      "scan-store",
    );

    scanFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const handleFixIssues = (
    product,
  ) => {
    setSelectedProduct(product);
    setSuggestions([]);
    setGeneratedFixes(null);
    setApplyResult(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "generate-suggestion",
    );

    formData.append(
      "product",
      JSON.stringify(product),
    );

    suggestionFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const handleAIImprove = (
    product,
  ) => {
    setSelectedAIProduct(
      product,
    );

    setAIContent(null);
    setAIError(null);
    setAIApplyError(null);
    setAIRequestMode(
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
      JSON.stringify(product),
    );

    aiFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const handleAIRegenerate =
    () => {
      if (
        !selectedAIProduct ||
        !aiContent ||
        isAIGenerating
      ) {
        return;
      }

      setAIError(null);
      setAIApplyError(null);

      setAIRequestMode(
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
          selectedAIProduct,
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

  const handleApplyAIContent = () => {
    if (
      !selectedAIProduct ||
      !aiContent ||
      isAIApplying
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Apply this ThemePilot AI content to the Shopify product? This will update the product description, SEO title, SEO description and image alt text.",
    );

    if (!confirmed) {
      return;
    }

    setAIApplyError(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "apply-ai-content",
    );

    formData.append(
      "product",
      JSON.stringify(
        selectedAIProduct,
      ),
    );

    formData.append(
      "content",
      JSON.stringify(
        aiContent,
      ),
    );

    aiApplyFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const handleApplyFix = () => {
    if (!generatedFixes) {
      return;
    }

    setApplyResult(null);

    const formData =
      new FormData();

    formData.append(
      "intent",
      "apply-fix",
    );

    formData.append(
      "fixes",
      JSON.stringify(
        generatedFixes,
      ),
    );

    applyFetcher.submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const closeFixModal = () => {
    if (isApplying) {
      return;
    }

    setSelectedProduct(null);
    setSuggestions([]);
    setGeneratedFixes(null);
    setApplyResult(null);
  };

  const closeAIModal = () => {
    if (
      isAIGenerating ||
      isAIApplying
    ) {
      return;
    }

    setSelectedAIProduct(null);
    setAIContent(null);
    setAIError(null);
    setAIApplyError(null);
    setAIRequestMode(
      "generate",
    );
  };

  useEffect(() => {
    if (!scanFetcher.data) {
      return;
    }

    setScanResult(
      scanFetcher.data,
    );

    if (
      scanFetcher.data.success &&
      scanFetcher.data.type ===
        "scan"
    ) {
      revalidator.revalidate();
    }
  }, [
    scanFetcher.data,
    revalidator,
  ]);

  useEffect(() => {
    if (
      suggestionFetcher.data
        ?.success &&
      suggestionFetcher.data
        ?.type === "suggestion"
    ) {
      setSuggestions(
        suggestionFetcher.data
          .suggestions || [],
      );

      setGeneratedFixes(
        suggestionFetcher.data
          .fixes || null,
      );

      setApplyResult(null);
    }

    if (
      suggestionFetcher.data &&
      !suggestionFetcher.data
        .success
    ) {
      setApplyResult(
        suggestionFetcher.data,
      );
    }
  }, [
    suggestionFetcher.data,
  ]);

  useEffect(() => {
    if (
      applyFetcher.data?.type !==
      "apply-fix"
    ) {
      return;
    }

    setApplyResult(
      applyFetcher.data,
    );

    if (
      !applyFetcher.data.success
    ) {
      return;
    }

    setSuggestions([]);
    setGeneratedFixes(null);

    const timer =
      window.setTimeout(
        () => {
          setSelectedProduct(
            null,
          );

          setApplyResult(null);

          runStoreScan();
        },
        1200,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    applyFetcher.data,
  ]);

  useEffect(() => {
    if (!aiFetcher.data) {
      return;
    }

    if (
      aiFetcher.data.success &&
      aiFetcher.data.type ===
        "ai-content"
    ) {
      setAIContent(
        aiFetcher.data
          .content || null,
      );

      setAIError(null);

      return;
    }

    setAIError(
      [
        aiFetcher.data.message,
        aiFetcher.data.error,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }, [
    aiFetcher.data,
  ]);

  useEffect(() => {
    if (!aiApplyFetcher.data) {
      return;
    }

    if (
      aiApplyFetcher.data.success &&
      aiApplyFetcher.data.type ===
        "apply-ai-content"
    ) {
      setAIApplyError(null);

      const timer =
        window.setTimeout(
          () => {
            setSelectedAIProduct(null);
            setAIContent(null);
            setAIError(null);
            setAIRequestMode(
              "generate",
            );

            runStoreScan();
          },
          900,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    }

    setAIApplyError(
      [
        aiApplyFetcher.data.message,
        aiApplyFetcher.data.error,
      ]
        .filter(Boolean)
        .join(" ") ||
        "AI content could not be applied.",
    );
  }, [
    aiApplyFetcher.data,
  ]);

  return (
    <>
      <main className="tp-dashboard">
        <DashboardHero
          scanFetcher={
            scanFetcher
          }
          scanResult={
            scanResult
          }
          isScanning={
            isScanning
          }
        />

        <DashboardCards
          summary={summary}
        />

        <ScanSummary
          summary={summary}
        />

        {scanResult?.success && (
          <>
            <ProductTable
              products={
                scanResult
                  .productIssues ||
                []
              }
              onFixIssues={
                handleFixIssues
              }
              onAIImprove={
                handleAIImprove
              }
            />

            <AIProductsTable
              products={
                productsForAI
              }
              onAIImprove={
                handleAIImprove
              }
              isGenerating={
                isAIGenerating
              }
              activeProductId={
                selectedAIProduct
                  ?.id || null
              }
            />
          </>
        )}

        <AnalyticsDashboard
          scans={allScans}
        />

        <ScanHistory
          scans={recentScans}
        />
      </main>

      <FixModal
        product={
          selectedProduct
        }
        suggestions={
          suggestions
        }
        fixes={
          generatedFixes
        }
        isLoading={
          isGenerating
        }
        isApplying={
          isApplying
        }
        applyResult={
          applyResult
        }
        onApply={
          handleApplyFix
        }
        onClose={
          closeFixModal
        }
      />

      <AIImproveModal
        product={
          selectedAIProduct
        }
        content={aiContent}
        isLoading={
          isAIGenerating
        }
        isRegenerating={
          isAIRegenerating
        }
        isApplyingContent={
          isAIApplying
        }
        error={aiError}
        applyError={
          aiApplyError
        }
        onRegenerate={
          handleAIRegenerate
        }
        onApplyContent={
          handleApplyAIContent
        }
        onClose={
          closeAIModal
        }
      />

      {isScanning && (
        <AppLoader
          fullScreen
          message="Scanning products, SEO and images..."
        />
      )}

      {isAIGenerating &&
        !isAIRegenerating && (
          <AppLoader
            fullScreen
            message="Theme Pilot AI is improving your product content..."
          />
        )}

      {isAIApplying && (
        <AppLoader
          fullScreen
          message="Applying ThemePilot AI content to Shopify..."
        />
      )}

      {isApplying && (
        <AppLoader
          fullScreen
          message="Applying improvements to Shopify..."
        />
      )}
    </>
  );
}