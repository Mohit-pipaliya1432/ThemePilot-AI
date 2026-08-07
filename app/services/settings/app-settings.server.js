import prisma from "../../db.server.js";

export const DEFAULT_APP_SETTINGS = {
  autoScan: false,
  scanFrequency: "weekly",
  aiTone: "professional",
  seoTitleMaxLength: 60,
  seoDescriptionMaxLength: 155,
  autoGenerateAltText: true,
  historyRetention: "90",
  emailNotifications: false,
};

export async function getAppSettings(shop) {
  if (!shop) {
    throw new Error("Shop is required.");
  }

  const settings =
    await prisma.appSettings.findUnique({
      where: {
        shop,
      },
    });

  if (!settings) {
    return {
      ...DEFAULT_APP_SETTINGS,
    };
  }

  return formatSettings(settings);
}

export async function saveAppSettings(
  shop,
  settings,
) {
  if (!shop) {
    throw new Error("Shop is required.");
  }

  const normalized =
    normalizeSettings(settings);

  const saved =
    await prisma.appSettings.upsert({
      where: {
        shop,
      },

      create: {
        shop,
        ...normalized,
      },

      update: {
        ...normalized,
      },
    });

  return formatSettings(saved);
}

export async function resetAppSettings(
  shop,
) {
  if (!shop) {
    throw new Error("Shop is required.");
  }

  const saved =
    await prisma.appSettings.upsert({
      where: {
        shop,
      },

      create: {
        shop,
        ...DEFAULT_APP_SETTINGS,
      },

      update: {
        ...DEFAULT_APP_SETTINGS,
      },
    });

  return formatSettings(saved);
}

function normalizeSettings(settings) {
  return {
    autoScan:
      Boolean(
        settings?.autoScan,
      ),

    scanFrequency:
      normalizeOption(
        settings?.scanFrequency,
        [
          "daily",
          "weekly",
          "monthly",
        ],
        "weekly",
      ),

    aiTone:
      normalizeOption(
        settings?.aiTone,
        [
          "professional",
          "friendly",
          "concise",
        ],
        "professional",
      ),

    seoTitleMaxLength:
      clampNumber(
        settings?.seoTitleMaxLength,
        30,
        70,
        60,
      ),

    seoDescriptionMaxLength:
      clampNumber(
        settings?.seoDescriptionMaxLength,
        100,
        180,
        155,
      ),

    autoGenerateAltText:
      settings?.autoGenerateAltText !==
      false,

    historyRetention:
      normalizeOption(
        String(
          settings?.historyRetention ??
            "90",
        ),
        [
          "30",
          "90",
          "180",
          "365",
          "forever",
        ],
        "90",
      ),

    emailNotifications:
      Boolean(
        settings?.emailNotifications,
      ),
  };
}

function normalizeOption(
  value,
  allowed,
  fallback,
) {
  const normalized =
    String(
      value || "",
    ).trim();

  return allowed.includes(
    normalized,
  )
    ? normalized
    : fallback;
}

function clampNumber(
  value,
  min,
  max,
  fallback,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(number),
    ),
  );
}

function formatSettings(settings) {
  return {
    autoScan:
      settings.autoScan,

    scanFrequency:
      settings.scanFrequency,

    aiTone:
      settings.aiTone,

    seoTitleMaxLength:
      settings.seoTitleMaxLength,

    seoDescriptionMaxLength:
      settings.seoDescriptionMaxLength,

    autoGenerateAltText:
      settings.autoGenerateAltText,

    historyRetention:
      settings.historyRetention,

    emailNotifications:
      settings.emailNotifications,
  };
}