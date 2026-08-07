export default function ScanSummary({ summary }) {
  if (!summary) {
    return null;
  }

  const rows = [
    {
      label: "Products missing descriptions",
      value: summary.productsWithoutDescription,
    },
    {
      label: "Products missing SEO titles",
      value: summary.productsWithoutSeoTitle,
    },
    {
      label: "Products missing SEO descriptions",
      value: summary.productsWithoutSeoDescription,
    },
    {
      label: "Images missing alt text",
      value: summary.imagesWithoutAltText,
    },
    {
      label: "Products requiring attention",
      value: summary.affectedProducts,
    },
    {
      label: "Total issues detected",
      value: summary.totalIssues,
    },
  ];

  return (
    <section className="tp-summary-section">
      <h2 className="tp-section-heading">
        Scan details
      </h2>

      <div className="tp-details">
        {rows.map((row) => (
          <div
            key={row.label}
            className="tp-details__row"
          >
            <span>{row.label}</span>

            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}