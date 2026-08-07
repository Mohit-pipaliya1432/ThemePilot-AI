export default function FixModal({
  product,
  suggestions,
  fixes,
  isLoading,
  isApplying,
  applyResult,
  onApply,
  onClose,
}) {
  if (!product) {
    return null;
  }

  const hasApplicableFix =
    Boolean(fixes?.descriptionHtml) ||
    Boolean(fixes?.seoTitle) ||
    Boolean(fixes?.seoDescription) ||
    Boolean(
      Array.isArray(fixes?.imageAltUpdates) &&
        fixes.imageAltUpdates.length > 0,
    );

  const applyDisabled =
    isLoading ||
    isApplying ||
    suggestions.length === 0 ||
    !hasApplicableFix;

  const fixAppliedSuccessfully =
    applyResult?.success &&
    applyResult?.type === "apply-fix";

  return (
    <div
      className="tp-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isApplying
        ) {
          onClose();
        }
      }}
    >
      <div
        className="tp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-modal-title"
      >
        <div className="tp-modal__header">
          <div>
            <p className="tp-modal__eyebrow">
              THEMEPILOT SUGGESTIONS
            </p>

            <h2
              id="tp-modal-title"
              className="tp-modal__title"
            >
              {product.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="tp-modal__close"
            aria-label="Close popup"
          >
            ×
          </button>
        </div>

        <div className="tp-modal__body">
          {isLoading ? (
            <div className="tp-modal__loading">
              <div className="tp-spinner" />

              <p>
                Generating improvement suggestions...
              </p>
            </div>
          ) : fixAppliedSuccessfully ? (
            <div className="tp-message tp-message--success">
              {applyResult.message}
            </div>
          ) : (
            <>
              {applyResult && !applyResult.success && (
                <div className="tp-message tp-message--error">
                  {applyResult.message}

                  {applyResult.error
                    ? ` ${applyResult.error}`
                    : ""}
                </div>
              )}

              {suggestions.length === 0 ? (
                <div className="tp-modal__empty">
                  No suggestions are available for this
                  product.
                </div>
              ) : (
                <div className="tp-suggestion-list">
                  {suggestions.map(
                    (suggestion, index) => (
                      <div
                        key={`${product.id}-${suggestion.type}-${index}`}
                        className="tp-suggestion-card"
                      >
                        <div className="tp-suggestion-card__number">
                          {index + 1}
                        </div>

                        <div>
                          <h3 className="tp-suggestion-card__heading">
                            {suggestion.label}
                          </h3>

                          <p className="tp-suggestion-card__text">
                            {suggestion.value}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="tp-modal__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="tp-button tp-button--secondary"
          >
            {fixAppliedSuccessfully
              ? "Close"
              : "Cancel"}
          </button>

          {!fixAppliedSuccessfully && (
            <button
              type="button"
              disabled={applyDisabled}
              onClick={onApply}
              className="tp-button tp-button--primary"
            >
              {isApplying
                ? "Applying fix..."
                : "Apply fix"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}