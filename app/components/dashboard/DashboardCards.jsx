export default function DashboardCards({ summary }) {
  const cards = [
    {
      title: "SEO Score",
      value: summary
        ? `${summary.seoScore}/100`
        : "--",
      description: "Overall product SEO health",
    },
    {
      title: "Products Scanned",
      value: summary
        ? summary.totalProducts
        : "--",
      description: "Products checked during scan",
    },
    {
      title: "Missing Alt Text",
      value: summary
        ? summary.imagesWithoutAltText
        : "--",
      description: "Images without accessible text",
    },
    {
      title: "Large Images",
      value: summary
        ? summary.largeImages
        : "--",
      description: "Images larger than 2500 pixels",
    },
  ];

  return (
    <section>
      <h2 className="tp-section-heading">
        Store overview
      </h2>

      <div className="tp-overview-grid">
        {cards.map((card) => (
          <article
            key={card.title}
            className="tp-stat-card"
          >
            <p className="tp-stat-card__label">
              {card.title}
            </p>

            <h3 className="tp-stat-card__value">
              {card.value}
            </h3>

            <p className="tp-stat-card__description">
              {card.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}