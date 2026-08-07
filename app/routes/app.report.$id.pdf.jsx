import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

import { authenticate } from "../shopify.server";
import {
  buildScanComparison,
  getPreviousScan,
  getScanHistoryById,
} from "../services/history/scan-history.server.js";

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

  const previousScan = await getPreviousScan(
    session.shop,
    params.id,
  );

  const comparison = previousScan
    ? buildScanComparison(scan, previousScan)
    : null;

  const pdfBuffer = await createPdfReport({
    scan,
    previousScan,
    comparison,
  });

  return new Response(pdfBuffer, {
    status: 200,

    headers: {
      "Content-Type": "application/pdf",

      "Content-Disposition": `attachment; filename="themepilot-report-${scan.id}.pdf"`,

      "Cache-Control": "no-store",
    },
  });
};

async function createPdfReport({
  scan,
  previousScan,
  comparison,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `ThemePilot AI Scan Report #${scan.id}`,
        Author: "ThemePilot AI",
      },
      bufferPages: true,
    });

    const stream = new PassThrough();
    const chunks = [];

    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);

    doc.on("error", reject);

    doc.pipe(stream);

    addHeader(doc, scan);

    addHealthScore(doc, scan);

    if (previousScan && comparison) {
      addComparison(
        doc,
        previousScan,
        comparison,
      );
    }

    addScanDetails(doc, scan);

    addProductIssues(doc, scan);

    addFooter(doc);

    doc.end();
  });
}

function addHeader(doc, scan) {
  doc
    .fontSize(10)
    .fillColor("#666666")
    .text("THEMEPILOT AI REPORT");

  doc.moveDown(0.5);

  doc
    .fontSize(26)
    .fillColor("#111111")
    .text("Shopify Store Scan Report");

  doc.moveDown(0.4);

  doc
    .fontSize(11)
    .fillColor("#555555")
    .text(
      `Store: ${scan.shopName || scan.shop}`,
    );

  doc.text(
    `Scan date: ${formatDate(
      scan.createdAt,
    )}`,
  );

  doc.text(`Report ID: #${scan.id}`);

  doc.moveDown(1);

  drawDivider(doc);
}

function addHealthScore(doc, scan) {
  addSectionTitle(doc, "Store Health");

  doc
    .fontSize(38)
    .fillColor(getScoreColor(scan.seoScore))
    .text(`${scan.seoScore}/100`);

  doc
    .fontSize(12)
    .fillColor("#333333")
    .text(getScoreLabel(scan.seoScore));

  doc.moveDown(1);

  drawDivider(doc);
}

function addComparison(
  doc,
  previousScan,
  comparison,
) {
  addSectionTitle(
    doc,
    "Compare With Previous Scan",
  );

  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(
      `Previous scan: ${formatDate(
        previousScan.createdAt,
      )}`,
    );

  doc.moveDown(0.8);

  const items = [
    {
      label: "SEO Score",
      metric: comparison.seoScore,
    },

    {
      label: "Total Issues",
      metric: comparison.totalIssues,
    },

    {
      label: "Affected Products",
      metric: comparison.affectedProducts,
    },

    {
      label: "Missing Descriptions",
      metric:
        comparison.productsWithoutDescription,
    },

    {
      label: "Missing SEO Titles",
      metric:
        comparison.productsWithoutSeoTitle,
    },

    {
      label: "Missing SEO Descriptions",
      metric:
        comparison.productsWithoutSeoDescription,
    },

    {
      label: "Missing Alt Text",
      metric:
        comparison.imagesWithoutAltText,
    },

    {
      label: "Large Images",
      metric: comparison.largeImages,
    },
  ];

  for (const item of items) {
    ensurePageSpace(doc, 40);

    doc
      .fontSize(10)
      .fillColor("#222222")
      .text(item.label, {
        continued: true,
      });

    doc
      .fillColor("#666666")
      .text(
        `   ${item.metric.previous} -> ${item.metric.current}`,
        {
          continued: true,
        },
      );

    doc
      .fillColor(
        getComparisonColor(
          item.metric.status,
        ),
      )
      .text(
        `   ${getDifferenceLabel(
          item.metric,
        )}`,
      );
  }

  doc.moveDown(1);

  drawDivider(doc);
}

function addScanDetails(doc, scan) {
  addSectionTitle(doc, "Scan Details");

  const details = [
    ["Products scanned", scan.totalProducts],

    ["Images scanned", scan.totalImages],

    ["Total issues", scan.totalIssues],

    [
      "Affected products",
      scan.affectedProducts,
    ],

    [
      "Missing descriptions",
      scan.productsWithoutDescription,
    ],

    [
      "Missing SEO titles",
      scan.productsWithoutSeoTitle,
    ],

    [
      "Missing SEO descriptions",
      scan.productsWithoutSeoDescription,
    ],

    [
      "Missing image alt text",
      scan.imagesWithoutAltText,
    ],

    ["Large images", scan.largeImages],

    ["Pages scanned", scan.pagesScanned],
  ];

  for (const [label, value] of details) {
    ensurePageSpace(doc, 30);

    const y = doc.y;

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(label, 50, y);

    doc
      .fontSize(10)
      .fillColor("#111111")
      .text(String(value), 430, y, {
        width: 100,
        align: "right",
      });

    doc.moveDown(0.6);
  }

  doc.moveDown(1);

  drawDivider(doc);
}

function addProductIssues(doc, scan) {
  addSectionTitle(
    doc,
    "Products With Issues",
  );

  const products =
    scan.fullResult?.productIssues || [];

  if (products.length === 0) {
    doc
      .fontSize(11)
      .fillColor("#138a4b")
      .text(
        "No product issues were recorded during this scan.",
      );

    return;
  }

  for (const product of products) {
    ensurePageSpace(doc, 80);

    doc
      .fontSize(12)
      .fillColor("#111111")
      .text(product.title);

    doc.moveDown(0.25);

    for (const issue of product.issues || []) {
      ensurePageSpace(doc, 25);

      doc
        .fontSize(9)
        .fillColor("#555555")
        .text(`• ${issue.label}`, {
          indent: 12,
        });
    }

    doc.moveDown(0.7);
  }
}

function addSectionTitle(doc, title) {
  ensurePageSpace(doc, 50);

  doc.moveDown(0.8);

  doc
    .fontSize(16)
    .fillColor("#111111")
    .text(title);

  doc.moveDown(0.6);
}

function drawDivider(doc) {
  const y = doc.y;

  doc
    .moveTo(50, y)
    .lineTo(545, y)
    .strokeColor("#dddddd")
    .stroke();

  doc.moveDown(1);
}

// function addFooter(doc) {
//   const range = doc.bufferedPageRange();

//   for (
//     let index = range.start;
//     index < range.start + range.count;
//     index += 1
//   ) {
//     doc.switchToPage(index);

//     doc
//       .fontSize(8)
//       .fillColor("#888888")
//       .text(
//         `ThemePilot AI | Page ${
//           index + 1
//         }`,
//         50,
//         800,
//         {
//           width: 495,
//           align: "center",
//         },
//       );
//   }
// }

function addFooter(doc) {
  const range = doc.bufferedPageRange();

  for (
    let index = range.start;
    index < range.start + range.count;
    index += 1
  ) {
    doc.switchToPage(index);

    const footerY =
      doc.page.height -
      doc.page.margins.bottom -
      15;

    doc
      .fontSize(8)
      .fillColor("#888888")
      .text(
        `ThemePilot AI | Page ${index + 1}`,
        50,
        footerY,
        {
          width: 495,
          align: "center",
          lineBreak: false,
        },
      );
  }
}

function ensurePageSpace(doc, height) {
  if (
    doc.y + height >
    doc.page.height -
      doc.page.margins.bottom -
      40
  ) {
    doc.addPage();
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getScoreLabel(score) {
  if (score >= 80) {
    return "Good";
  }

  if (score >= 50) {
    return "Needs improvement";
  }

  return "Poor";
}

function getScoreColor(score) {
  if (score >= 80) {
    return "#138a4b";
  }

  if (score >= 50) {
    return "#a35b00";
  }

  return "#c52828";
}

function getComparisonColor(status) {
  if (status === "improved") {
    return "#138a4b";
  }

  if (status === "declined") {
    return "#c52828";
  }

  return "#666666";
}

function getDifferenceLabel(metric) {
  if (metric.status === "same") {
    return "No change";
  }

  const sign =
    metric.difference > 0 ? "+" : "-";

  return `${sign}${metric.absoluteDifference} ${metric.status}`;
}