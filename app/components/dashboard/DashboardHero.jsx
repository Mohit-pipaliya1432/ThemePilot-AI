export default function DashboardHero({
  scanFetcher,
  scanResult,
  isScanning,
}) {
  return (
    <section className="tp-hero">
      <p className="tp-eyebrow">
        THEMEPILOT AI
      </p>

      <h1 className="tp-main-heading">
        Improve your Shopify store
      </h1>

      <p className="tp-intro">
        Scan your products for SEO, content,
        accessibility and image issues.
      </p>

      <scanFetcher.Form method="post">
        <input
          type="hidden"
          name="intent"
          value="scan-store"
        />

        <button
          type="submit"
          disabled={isScanning}
          className="tp-button tp-button--primary"
        >
          {isScanning
            ? "Scanning store..."
            : "Scan store"}
        </button>
      </scanFetcher.Form>

      {scanResult?.success && (
        <div className="tp-message tp-message--success">
          {scanResult.message} Scanned store:{" "}
          {scanResult.shop.name}
        </div>
      )}

      {scanResult && !scanResult.success && (
        <div className="tp-message tp-message--error">
          {scanResult.message}

          {scanResult.error
            ? ` ${scanResult.error}`
            : ""}
        </div>
      )}
    </section>
  );
}