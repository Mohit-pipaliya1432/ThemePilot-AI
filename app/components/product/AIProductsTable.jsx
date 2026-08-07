import { Link } from "react-router";

export default function AIProductsTable({
  products,
  onAIImprove,
  isGenerating = false,
  activeProductId = null,
}) {
  if (!Array.isArray(products)) {
    return null;
  }

  const dashboardProducts =
    products.slice(0, 3);

  return (
    <section className="tp-ai-products-section">
      <div className="tp-table-heading">
        <div>
          <p className="tp-modal__eyebrow">
            THEME PILOT AI
          </p>

          <h2 className="tp-section-heading tp-section-heading--compact">
            AI product improvements
          </h2>

          <p className="tp-section-subtitle">
            Generate improved product descriptions,
            SEO content, image alt text and focus keywords.
          </p>
        </div>

        <div className="tp-ai-products-header-actions">
          <span className="tp-count-badge">
            {products.length} products
          </span>

          {products.length > 3 && (
            <Link
              to="/app/ai-products"
              className="tp-button tp-button--small tp-button--secondary"
            >
              View all products
            </Link>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="tp-empty-state">
          <h3>No products found</h3>

          <p className="tp-section-subtitle">
            Run a store scan to load products for AI improvement.
          </p>
        </div>
      ) : (
        <div className="tp-ai-product-grid">
          {dashboardProducts.map((product) => {
            const isCurrentProduct =
              activeProductId === product.id;

            const featuredImage =
              getProductImage(product);

            const seoTitle =
              product.currentSeoTitle ||
              product.seo?.title ||
              "";

            const seoDescription =
              product.currentSeoDescription ||
              product.seo?.description ||
              "";

            return (
              <article
                key={product.id}
                className="tp-ai-product-card"
              >
                <div className="tp-ai-product-card__media">
                  {featuredImage ? (
                    <img
                      src={featuredImage}
                      alt={
                        getProductImageAlt(product) ||
                        product.title ||
                        "Product image"
                      }
                      loading="lazy"
                    />
                  ) : (
                    <div className="tp-ai-product-card__placeholder">
                      <span>TP</span>
                    </div>
                  )}

                  <span className="tp-ai-product-card__badge">
                    AI Ready
                  </span>
                </div>

                <div className="tp-ai-product-card__content">
                  <h3>{product.title}</h3>

                  <div className="tp-ai-product-card__status">
                    <span
                      className={
                        seoTitle
                          ? "tp-ai-status tp-ai-status--ready"
                          : "tp-ai-status tp-ai-status--missing"
                      }
                    >
                      SEO title
                    </span>

                    <span
                      className={
                        seoDescription
                          ? "tp-ai-status tp-ai-status--ready"
                          : "tp-ai-status tp-ai-status--missing"
                      }
                    >
                      SEO description
                    </span>

                    <span
                      className={
                        hasDescription(product)
                          ? "tp-ai-status tp-ai-status--ready"
                          : "tp-ai-status tp-ai-status--missing"
                      }
                    >
                      Description
                    </span>
                  </div>

                  <div className="tp-ai-product-card__actions">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() =>
                        onAIImprove(product)
                      }
                      className="tp-button tp-button--ai"
                    >
                      {isCurrentProduct &&
                      isGenerating
                        ? "Generating..."
                        : "AI Improve"}
                    </button>

                    {product.previewUrl && (
                      <a
                        href={product.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tp-button tp-button--secondary"
                      >
                        View product
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getProductImage(product) {
  if (product.featuredImageUrl) {
    return product.featuredImageUrl;
  }

  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    return product.images[0]?.url || null;
  }

  return null;
}

function getProductImageAlt(product) {
  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    return (
      product.images[0]?.alt ||
      product.images[0]?.altText ||
      ""
    );
  }

  return "";
}

function hasDescription(product) {
  const description =
    product.descriptionHtml || "";

  return String(description)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim().length > 0;
}