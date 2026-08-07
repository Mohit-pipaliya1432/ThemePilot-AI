import { authenticate } from "../shopify.server";
import { getScanHistoryById } from "../services/history/scan-history.server.js";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const scan = await getScanHistoryById(
    session.shop,
    params.id,
  );

  if (!scan) {
    throw new Response("Scan report not found.", {
      status: 404,
    });
  }

  const rows = [
    ["Metric", "Value"],
    ["Store", scan.shopName || scan.shop],
    ["SEO Score", `${scan.seoScore}/100`],
    ["Products Scanned", scan.totalProducts],
    ["Images Scanned", scan.totalImages],
    ["Total Issues", scan.totalIssues],
    ["Affected Products", scan.affectedProducts],
    [
      "Missing Descriptions",
      scan.productsWithoutDescription,
    ],
    [
      "Missing SEO Titles",
      scan.productsWithoutSeoTitle,
    ],
    [
      "Missing SEO Descriptions",
      scan.productsWithoutSeoDescription,
    ],
    [
      "Missing Image Alt Text",
      scan.imagesWithoutAltText,
    ],
    ["Large Images", scan.largeImages],
    ["Pages Scanned", scan.pagesScanned],
    ["Created At", scan.createdAt],
  ];

  const productIssues =
    scan.fullResult?.productIssues || [];

  if (productIssues.length > 0) {
    rows.push([]);
    rows.push(["Products With Issues"]);
    rows.push([
      "Product",
      "Issue Count",
      "Issues",
    ]);

    for (const product of productIssues) {
      rows.push([
        product.title,
        product.issues.length,
        product.issues
          .map((issue) => issue.label)
          .join(" | "),
      ]);
    }
  }

  const csv = rows
    .map((row) =>
      row
        .map((cell) =>
          escapeCsvValue(cell),
        )
        .join(","),
    )
    .join("\n");

  const fileName = `themepilot-scan-${scan.id}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
};

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}