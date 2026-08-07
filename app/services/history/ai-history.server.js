import prisma from "../../db.server.js";

/* =========================================
   SAVE AI CONTENT VERSION
========================================= */

export async function saveAIContentVersion({
  shop,
  product,
  content,
}) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  if (!product?.id) {
    throw new Error(
      "Product ID is required.",
    );
  }

  if (!content) {
    throw new Error(
      "AI content is required.",
    );
  }

  const latestVersion =
    await prisma.aIContentHistory.findFirst({
      where: {
        shop,
        productId:
          product.id,
      },

      orderBy: {
        version: "desc",
      },

      select: {
        version: true,
      },
    });

  const nextVersion =
    latestVersion
      ? latestVersion.version + 1
      : 1;

  const savedVersion =
    await prisma.aIContentHistory.create({
      data: {
        shop,

        productId:
          product.id,

        productTitle:
          product.title ||
          "Product",

        version:
          nextVersion,

        descriptionHtml:
          String(
            content.descriptionHtml ||
              "",
          ),

        seoTitle:
          String(
            content.seoTitle ||
              "",
          ),

        seoDescription:
          String(
            content.seoDescription ||
              "",
          ),

        altText:
          String(
            content.altText ||
              "",
          ),

        keywords:
          JSON.stringify(
            Array.isArray(
              content.keywords,
            )
              ? content.keywords
              : [],
          ),

        isCurrent: false,

        restoredAt: null,
      },
    });

  return formatAIContentHistory(
    savedVersion,
  );
}

/* =========================================
   GET ALL AI HISTORY
========================================= */

export async function getAllAIContentHistory(
  shop,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  const history =
    await prisma.aIContentHistory.findMany({
      where: {
        shop,
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          version: "desc",
        },
      ],
    });

  return history.map(
    formatAIContentHistory,
  );
}

/* =========================================
   GET PRODUCT AI HISTORY
========================================= */

export async function getAIContentHistory(
  shop,
  productId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required.",
    );
  }

  const history =
    await prisma.aIContentHistory.findMany({
      where: {
        shop,
        productId,
      },

      orderBy: {
        version: "desc",
      },
    });

  return history.map(
    formatAIContentHistory,
  );
}

/* =========================================
   GET ONE VERSION
========================================= */

export async function getAIContentVersionById(
  shop,
  historyId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  const id =
    Number(historyId);

  if (
    !Number.isInteger(
      id,
    )
  ) {
    throw new Error(
      "Invalid AI history ID.",
    );
  }

  const version =
    await prisma.aIContentHistory.findFirst({
      where: {
        id,
        shop,
      },
    });

  if (!version) {
    return null;
  }

  return formatAIContentHistory(
    version,
  );
}

/* =========================================
   BUILD RESTORE PAYLOAD
========================================= */

export function buildRestorePayload(
  version,
) {
  if (!version) {
    throw new Error(
      "AI history version is required.",
    );
  }

  if (!version.productId) {
    throw new Error(
      "Product ID is missing from AI history.",
    );
  }

  return {
    productId:
      version.productId,

    productTitle:
      version.productTitle ||
      "Product",

    descriptionHtml:
      version.descriptionHtml ||
      null,

    seoTitle:
      version.seoTitle ||
      null,

    seoDescription:
      version.seoDescription ||
      null,

    altText:
      version.altText ||
      null,

    keywords:
      Array.isArray(
        version.keywords,
      )
        ? version.keywords
        : [],

    sourceHistoryId:
      version.id,

    sourceVersion:
      version.version,
  };
}

/* =========================================
   MARK VERSION AS CURRENT
========================================= */

export async function markAIContentVersionAsCurrent(
  shop,
  historyId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  const id =
    Number(historyId);

  if (
    !Number.isInteger(
      id,
    )
  ) {
    throw new Error(
      "Invalid AI history ID.",
    );
  }

  const version =
    await prisma.aIContentHistory.findFirst({
      where: {
        id,
        shop,
      },

      select: {
        id: true,
        productId: true,
      },
    });

  if (!version) {
    throw new Error(
      "AI history version not found.",
    );
  }

  await prisma.$transaction([
    prisma.aIContentHistory.updateMany({
      where: {
        shop,
        productId:
          version.productId,
      },

      data: {
        isCurrent: false,
      },
    }),

    prisma.aIContentHistory.update({
      where: {
        id,
      },

      data: {
        isCurrent: true,
        restoredAt:
          new Date(),
      },
    }),
  ]);

  const updatedVersion =
    await prisma.aIContentHistory.findUnique({
      where: {
        id,
      },
    });

  return formatAIContentHistory(
    updatedVersion,
  );
}

/* =========================================
   CLEAR CURRENT VERSION
========================================= */

export async function clearCurrentAIContentVersion(
  shop,
  productId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required.",
    );
  }

  await prisma.aIContentHistory.updateMany({
    where: {
      shop,
      productId,
      isCurrent: true,
    },

    data: {
      isCurrent: false,
    },
  });

  return {
    success: true,
  };
}

/* =========================================
   DELETE ONE VERSION
========================================= */

export async function deleteAIContentVersion(
  shop,
  historyId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  const id =
    Number(historyId);

  if (
    !Number.isInteger(
      id,
    )
  ) {
    throw new Error(
      "Invalid AI history ID.",
    );
  }

  const version =
    await prisma.aIContentHistory.findFirst({
      where: {
        id,
        shop,
      },

      select: {
        id: true,
        isCurrent: true,
      },
    });

  if (!version) {
    throw new Error(
      "AI history version not found.",
    );
  }

  if (
    version.isCurrent
  ) {
    throw new Error(
      "The current restored version cannot be deleted. Restore another version first.",
    );
  }

  await prisma.aIContentHistory.delete({
    where: {
      id,
    },
  });

  return {
    success: true,

    type:
      "delete-history",

    message:
      "AI content version deleted successfully.",
  };
}

/* =========================================
   DELETE PRODUCT HISTORY
========================================= */

export async function deleteAIContentHistoryForProduct(
  shop,
  productId,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required.",
    );
  }

  const currentVersion =
    await prisma.aIContentHistory.findFirst({
      where: {
        shop,
        productId,
        isCurrent: true,
      },

      select: {
        id: true,
      },
    });

  if (currentVersion) {
    throw new Error(
      "This product has a current restored AI version. Restore or clear the current version before deleting its history.",
    );
  }

  const result =
    await prisma.aIContentHistory.deleteMany({
      where: {
        shop,
        productId,
      },
    });

  return {
    success: true,

    type:
      "delete-product-history",

    deletedCount:
      result.count,

    message:
      result.count === 1
        ? "1 AI content version deleted."
        : `${result.count} AI content versions deleted.`,
  };
}

/* =========================================
   DELETE ALL AI HISTORY
========================================= */

export async function deleteAllAIContentHistory(
  shop,
) {
  if (!shop) {
    throw new Error(
      "Shop is required.",
    );
  }

  const currentVersionCount =
    await prisma.aIContentHistory.count({
      where: {
        shop,
        isCurrent: true,
      },
    });

  if (
    currentVersionCount > 0
  ) {
    throw new Error(
      "Current restored versions exist. Restore or clear them before deleting all AI history.",
    );
  }

  const result =
    await prisma.aIContentHistory.deleteMany({
      where: {
        shop,
      },
    });

  return {
    success: true,

    type:
      "delete-all-history",

    deletedCount:
      result.count,

    message:
      result.count === 1
        ? "1 AI content version deleted."
        : `${result.count} AI content versions deleted.`,
  };
}

/* =========================================
   FORMAT
========================================= */

function formatAIContentHistory(
  history,
) {
  if (!history) {
    return null;
  }

  return {
    id:
      history.id,

    shop:
      history.shop,

    productId:
      history.productId,

    productTitle:
      history.productTitle,

    version:
      history.version,

    descriptionHtml:
      history.descriptionHtml ||
      "",

    seoTitle:
      history.seoTitle ||
      "",

    seoDescription:
      history.seoDescription ||
      "",

    altText:
      history.altText ||
      "",

    keywords:
      parseKeywords(
        history.keywords,
      ),

    isCurrent:
      Boolean(
        history.isCurrent,
      ),

    restoredAt:
      history.restoredAt
        ? history.restoredAt.toISOString()
        : null,

    createdAt:
      history.createdAt.toISOString(),
  };
}

/* =========================================
   KEYWORDS
========================================= */

function parseKeywords(
  value,
) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    return Array.isArray(
      parsed,
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}