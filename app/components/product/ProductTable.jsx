import IssueBadge from "../common/IssueBadge.jsx";

export default function ProductTable({
  products,
  onFixIssues,
  onAIImprove,
}) {
  if (!Array.isArray(products)) {
    return null;
  }

  return (
    <section>
      <div className="tp-table-heading">
        <div>
          <h2 className="tp-section-heading tp-section-heading--compact">
            Products requiring attention
          </h2>

          <p className="tp-section-subtitle">
            Review products with SEO, content or image issues.
          </p>
        </div>

        <span className="tp-count-badge">
          {products.length} products
        </span>
      </div>

      {products.length === 0 ? (
        <div className="tp-empty-state">
          <h3>No product issues found</h3>

          <p className="tp-section-subtitle">
            Your products passed all current checks.
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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.title}</strong>
                  </td>

                  <td>
                    <div className="tp-issue-list">
                      {product.issues.map((issue) => (
                        <IssueBadge
                          key={`${product.id}-${issue.type}`}
                          issue={issue}
                        />
                      ))}
                    </div>
                  </td>

                  <td>
                    <strong>{product.issues.length}</strong>
                  </td>

                  <td>
                    <div className="tp-table-actions">
                      <button
                        type="button"
                        onClick={() => onAIImprove(product)}
                        className="tp-button tp-button--small tp-button--ai"
                      >
                        ✨ AI Improve
                      </button>

                      <button
                        type="button"
                        onClick={() => onFixIssues(product)}
                        className="tp-button tp-button--small tp-button--primary"
                      >
                        Fix issues
                      </button>

                      {product.previewUrl && (
                        <a
                          href={product.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="tp-button tp-button--small tp-button--secondary"
                        >
                          View product
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}