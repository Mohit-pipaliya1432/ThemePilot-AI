export default function AppLoader({
  fullScreen = false,
  message = "Analyzing your Shopify store...",
}) {
  return (
    <div
      className={
        fullScreen
          ? "tp-app-loader tp-app-loader--fullscreen"
          : "tp-app-loader"
      }
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="tp-app-loader__content">
        <div className="tp-app-loader__visual">
          <div className="tp-app-loader__orbit tp-app-loader__orbit--one">
            <span />
          </div>

          <div className="tp-app-loader__orbit tp-app-loader__orbit--two">
            <span />
          </div>

          <div className="tp-app-loader__radar">
            <div className="tp-app-loader__radar-line" />

            <div className="tp-app-loader__logo">
              <span>TP</span>
            </div>
          </div>
        </div>

        <div className="tp-app-loader__text">
          <p className="tp-app-loader__eyebrow">
            THEMEPILOT AI
          </p>

          <h2>Store intelligence loading</h2>

          <p>{message}</p>
        </div>

        <div className="tp-app-loader__steps">
          <span>SEO</span>
          <i />
          <span>Images</span>
          <i />
          <span>Accessibility</span>
        </div>

        <div className="tp-app-loader__progress">
          <span />
        </div>
      </div>
    </div>
  );
}