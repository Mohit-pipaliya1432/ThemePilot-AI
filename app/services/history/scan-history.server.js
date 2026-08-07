import prisma from "../../db.server";

export async function saveScanHistory(shop, scanResult) {
  if (!shop || !scanResult?.summary) {
    throw new Error("Scan history data is incomplete.");
  }

  return prisma.scanHistory.create({
    data: {
      shop,
      shopName: scanResult.shop?.name || null,

      seoScore: scanResult.summary.seoScore,
      totalProducts: scanResult.summary.totalProducts,
      totalImages: scanResult.summary.totalImages,
      totalIssues: scanResult.summary.totalIssues,
      affectedProducts: scanResult.summary.affectedProducts,

      productsWithoutDescription:
        scanResult.summary.productsWithoutDescription,

      productsWithoutSeoTitle:
        scanResult.summary.productsWithoutSeoTitle,

      productsWithoutSeoDescription:
        scanResult.summary.productsWithoutSeoDescription,

      imagesWithoutAltText:
        scanResult.summary.imagesWithoutAltText,

      largeImages:
        scanResult.summary.largeImages,

      pagesScanned:
        scanResult.summary.pagesScanned || 1,

      resultJson: JSON.stringify(scanResult),
    },
  });
}

export async function getRecentScans(shop, limit = 5) {
  const scans = await prisma.scanHistory.findMany({
    where: {
      shop,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: limit,
  });

  return scans.map(formatScanHistory);
}

export async function getAllScans(shop) {
  const scans = await prisma.scanHistory.findMany({
    where: {
      shop,
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  return scans.map(formatScanHistory);
}

export async function getScanHistoryById(shop, scanId) {
  const numericScanId = Number(scanId);

  if (!Number.isInteger(numericScanId)) {
    return null;
  }

  const scan = await prisma.scanHistory.findFirst({
    where: {
      id: numericScanId,
      shop,
    },
  });

  if (!scan) {
    return null;
  }

  let fullResult = null;

  try {
    fullResult = JSON.parse(scan.resultJson);
  } catch {
    fullResult = null;
  }

  return {
    ...formatScanHistory(scan),
    fullResult,
  };
}

export async function getPreviousScan(shop, scanId) {
  const numericScanId = Number(scanId);

  if (!Number.isInteger(numericScanId)) {
    return null;
  }

  const currentScan = await prisma.scanHistory.findFirst({
    where: {
      id: numericScanId,
      shop,
    },

    select: {
      id: true,
      createdAt: true,
    },
  });

  if (!currentScan) {
    return null;
  }

  const previousScan = await prisma.scanHistory.findFirst({
    where: {
      shop,

      OR: [
        {
          createdAt: {
            lt: currentScan.createdAt,
          },
        },
        {
          createdAt: currentScan.createdAt,

          id: {
            lt: currentScan.id,
          },
        },
      ],
    },

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  if (!previousScan) {
    return null;
  }

  return formatScanHistory(previousScan);
}

export function buildScanComparison(
  currentScan,
  previousScan,
) {
  if (!currentScan || !previousScan) {
    return null;
  }

  return {
    seoScore: buildMetric(
      currentScan.seoScore,
      previousScan.seoScore,
      "higher",
    ),

    totalIssues: buildMetric(
      currentScan.totalIssues,
      previousScan.totalIssues,
      "lower",
    ),

    affectedProducts: buildMetric(
      currentScan.affectedProducts,
      previousScan.affectedProducts,
      "lower",
    ),

    productsWithoutDescription: buildMetric(
      currentScan.productsWithoutDescription,
      previousScan.productsWithoutDescription,
      "lower",
    ),

    productsWithoutSeoTitle: buildMetric(
      currentScan.productsWithoutSeoTitle,
      previousScan.productsWithoutSeoTitle,
      "lower",
    ),

    productsWithoutSeoDescription: buildMetric(
      currentScan.productsWithoutSeoDescription,
      previousScan.productsWithoutSeoDescription,
      "lower",
    ),

    imagesWithoutAltText: buildMetric(
      currentScan.imagesWithoutAltText,
      previousScan.imagesWithoutAltText,
      "lower",
    ),

    largeImages: buildMetric(
      currentScan.largeImages,
      previousScan.largeImages,
      "lower",
    ),
  };
}

function buildMetric(
  current,
  previous,
  betterDirection,
) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  const difference =
    currentValue - previousValue;

  let status = "same";

  if (difference !== 0) {
    if (betterDirection === "higher") {
      status =
        difference > 0
          ? "improved"
          : "declined";
    } else {
      status =
        difference < 0
          ? "improved"
          : "declined";
    }
  }

  return {
    current: currentValue,
    previous: previousValue,
    difference,
    absoluteDifference:
      Math.abs(difference),
    status,
  };
}

function formatScanHistory(scan) {
  return {
    id: scan.id,
    shop: scan.shop,
    shopName: scan.shopName,

    seoScore: scan.seoScore,
    totalProducts: scan.totalProducts,
    totalImages: scan.totalImages,
    totalIssues: scan.totalIssues,
    affectedProducts: scan.affectedProducts,

    productsWithoutDescription:
      scan.productsWithoutDescription,

    productsWithoutSeoTitle:
      scan.productsWithoutSeoTitle,

    productsWithoutSeoDescription:
      scan.productsWithoutSeoDescription,

    imagesWithoutAltText:
      scan.imagesWithoutAltText,

    largeImages:
      scan.largeImages,

    pagesScanned:
      scan.pagesScanned,

    createdAt:
      scan.createdAt.toISOString(),
  };
}