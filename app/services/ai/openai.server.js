import { buildSeoPrompt } from "./prompt.server.js";

const MISTRAL_API_URL =
  "https://api.mistral.ai/v1/chat/completions";

const DEFAULT_SETTINGS = {
  aiTone: "professional",
  seoTitleMaxLength: 60,
  seoDescriptionMaxLength: 155,
  autoGenerateAltText: true,
};

export async function generateAIContent(
  product,
  options = {},
) {
  const apiKey =
    process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error(
      "MISTRAL_API_KEY is missing from the .env file.",
    );
  }

  if (!product?.title) {
    throw new Error(
      "Product title is missing.",
    );
  }

  const mode =
    options?.mode === "regenerate"
      ? "regenerate"
      : "generate";

  const previousContent =
    options?.previousContent || null;

  const settings =
    normalizeSettings(
      options?.settings,
    );

  const basePrompt =
    buildSeoPrompt(
      product,
      settings,
    );

  const prompt =
    mode === "regenerate"
      ? buildRegeneratePrompt(
          basePrompt,
          product,
          previousContent,
          settings,
        )
      : basePrompt;

  const response = await fetch(
    MISTRAL_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          "mistral-small-latest",

        messages: [
          {
            role: "system",

            content:
              mode ===
              "regenerate"
                ? getRegenerateSystemPrompt(
                    settings,
                  )
                : getGenerateSystemPrompt(
                    settings,
                  ),
          },

          {
            role: "user",
            content: prompt,
          },
        ],

        response_format: {
          type: "json_object",
        },

        temperature:
          mode ===
          "regenerate"
            ? 0.8
            : 0.4,

        max_tokens: 1400,
      }),
    },
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    let errorMessage =
      responseText;

    try {
      const errorJson =
        JSON.parse(
          responseText,
        );

      errorMessage =
        errorJson?.message ||
        errorJson?.detail ||
        errorJson?.error
          ?.message ||
        responseText;
    } catch {
      // Keep original response.
    }

    throw new Error(
      `Mistral API request failed (${response.status}): ${errorMessage}`,
    );
  }

  let responseJson;

  try {
    responseJson =
      JSON.parse(
        responseText,
      );
  } catch {
    throw new Error(
      "Mistral returned an invalid API response.",
    );
  }

  const rawContent =
    responseJson
      ?.choices?.[0]
      ?.message?.content;

  if (
    !rawContent ||
    typeof rawContent !==
      "string"
  ) {
    throw new Error(
      "Mistral did not return generated content.",
    );
  }

  let generatedContent;

  try {
    generatedContent =
      JSON.parse(
        removeCodeFences(
          rawContent,
        ),
      );
  } catch {
    throw new Error(
      "Mistral generated content that was not valid JSON.",
    );
  }

  return {
    success: true,

    type: "ai-content",

    mode,

    message:
      mode === "regenerate"
        ? "Fresh AI content generated successfully."
        : "AI content generated successfully.",

    content:
      normalizeAIContent(
        generatedContent,
        product,
        settings,
      ),
  };
}

/* =========================================
   BUILD SHOPIFY FIXES
========================================= */

export function buildAIFixes(
  product,
  content,
) {
  if (!product?.id) {
    throw new Error(
      "Product ID is missing.",
    );
  }

  if (!content) {
    throw new Error(
      "AI content is missing.",
    );
  }

  const imageAltUpdates = [];

  if (
    Array.isArray(
      product.images,
    ) &&
    product.images.length > 0 &&
    content.altText
  ) {
    for (
      let index = 0;
      index <
      product.images.length;
      index += 1
    ) {
      const image =
        product.images[index];

      if (!image?.id) {
        continue;
      }

      const suffix =
        index === 0
          ? ""
          : ` ${index + 1}`;

      imageAltUpdates.push({
        id: image.id,

        alt: limitText(
          `${content.altText}${suffix}`,
          512,
        ),
      });
    }
  }

  return {
    productId:
      product.id,

    productTitle:
      product.title ||
      "Product",

    descriptionHtml:
      content.descriptionHtml ||
      null,

    seoTitle:
      content.seoTitle ||
      null,

    seoDescription:
      content.seoDescription ||
      null,

    imageAltUpdates,

    unsupportedIssues: [],
  };
}

/* =========================================
   SYSTEM PROMPTS
========================================= */

function getGenerateSystemPrompt(
  settings,
) {
  return [
    "You are a Shopify SEO and ecommerce copywriting expert.",

    `Use a ${settings.aiTone} writing tone.`,

    "Generate useful, natural and conversion-focused product content.",

    "Keep all product facts accurate.",

    "Do not invent specifications, ingredients, guarantees, certifications, dimensions or unsupported benefits.",

    `SEO titles must not exceed ${settings.seoTitleMaxLength} characters.`,

    `SEO descriptions must not exceed ${settings.seoDescriptionMaxLength} characters.`,

    settings.autoGenerateAltText
      ? "Generate relevant image alt text."
      : "Do not generate image alt text. Return an empty string for altText.",

    "Return only valid JSON.",

    "Do not include markdown code fences.",
  ].join(" ");
}

function getRegenerateSystemPrompt(
  settings,
) {
  return [
    "You are a Shopify SEO and ecommerce copywriting expert.",

    "The user is requesting a fresh alternative version of previously generated content.",

    `Use a ${settings.aiTone} writing tone.`,

    "Use noticeably different wording, sentence structure and phrasing.",

    "Do not simply reorder or lightly rewrite the previous version.",

    "Preserve accurate product facts and intent.",

    "Do not invent specifications, ingredients, guarantees, certifications, dimensions or unsupported benefits.",

    `SEO titles must not exceed ${settings.seoTitleMaxLength} characters.`,

    `SEO descriptions must not exceed ${settings.seoDescriptionMaxLength} characters.`,

    settings.autoGenerateAltText
      ? "Generate fresh alternative image alt text."
      : "Do not generate image alt text. Return an empty string for altText.",

    "Return only valid JSON.",

    "Do not include markdown code fences.",
  ].join(" ");
}

/* =========================================
   REGENERATE PROMPT
========================================= */

function buildRegeneratePrompt(
  basePrompt,
  product,
  previousContent,
  settings,
) {
  const previousSection =
    previousContent
      ? `
PREVIOUS AI VERSION:

${JSON.stringify(
  {
    descriptionHtml:
      previousContent
        .descriptionHtml ||
      "",

    seoTitle:
      previousContent
        .seoTitle ||
      "",

    seoDescription:
      previousContent
        .seoDescription ||
      "",

    altText:
      previousContent
        .altText ||
      "",

    keywords:
      Array.isArray(
        previousContent
          .keywords,
      )
        ? previousContent
            .keywords
        : [],
  },
  null,
  2,
)}
`
      : `
No previous AI version was supplied.
Create a fresh alternative version anyway.
`;

  const altInstruction =
    settings.autoGenerateAltText
      ? "- Generate alternative image alt text."
      : "- Do not generate image alt text. Return an empty string for altText.";

  return `
${basePrompt}

REGENERATION REQUEST

Generate a completely fresh alternative version for:

Product:
${product.title}

Important requirements:

- Do not reuse the previous wording.
- Change sentence structure and phrasing.
- Keep the same product facts accurate.
- Use a ${settings.aiTone} writing tone.
- Make the SEO title meaningfully different.
- Keep SEO title within ${settings.seoTitleMaxLength} characters.
- Make the SEO description meaningfully different.
- Keep SEO description within ${settings.seoDescriptionMaxLength} characters.
- Rewrite the product description with a fresh structure.
${altInstruction}
- Generate a refreshed keyword list.
- Do not mention that this content was regenerated.
- Do not invent product facts.
- Return the same JSON structure requested in the original prompt.

${previousSection}
`.trim();
}

/* =========================================
   NORMALIZE AI CONTENT
========================================= */

function normalizeAIContent(
  content,
  product,
  settings,
) {
  const keywords =
    Array.isArray(
      content?.keywords,
    )
      ? content.keywords
          .map(
            (keyword) =>
              String(
                keyword,
              ).trim(),
          )
          .filter(Boolean)
          .slice(0, 10)
      : [];

  const altText =
    settings.autoGenerateAltText
      ? limitText(
          content?.altText ||
            `${product.title} product image`,
          512,
        )
      : "";

  return {
    descriptionHtml:
      cleanHtml(
        content?.descriptionHtml,
      ) ||
      `<p>${escapeHtml(
        product.title,
      )}</p>`,

    seoTitle:
      limitText(
        content?.seoTitle ||
          `${product.title} | Shop Online`,
        settings
          .seoTitleMaxLength,
      ),

    seoDescription:
      limitText(
        content?.seoDescription ||
          `Shop ${product.title} online and discover quality, value and convenience.`,
        settings
          .seoDescriptionMaxLength,
      ),

    altText,

    keywords,
  };
}

/* =========================================
   SETTINGS
========================================= */

function normalizeSettings(
  settings = {},
) {
  return {
    aiTone:
      normalizeOption(
        settings?.aiTone,
        [
          "professional",
          "friendly",
          "concise",
        ],
        DEFAULT_SETTINGS.aiTone,
      ),

    seoTitleMaxLength:
      clampNumber(
        settings
          ?.seoTitleMaxLength,
        30,
        70,
        DEFAULT_SETTINGS
          .seoTitleMaxLength,
      ),

    seoDescriptionMaxLength:
      clampNumber(
        settings
          ?.seoDescriptionMaxLength,
        100,
        180,
        DEFAULT_SETTINGS
          .seoDescriptionMaxLength,
      ),

    autoGenerateAltText:
      settings
        ?.autoGenerateAltText !==
      false,
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

/* =========================================
   HELPERS
========================================= */

function removeCodeFences(
  value,
) {
  return String(
    value || "",
  )
    .replace(
      /^```(?:json)?\s*/i,
      "",
    )
    .replace(
      /```\s*$/i,
      "",
    )
    .trim();
}

function cleanHtml(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(
      /```html/gi,
      "",
    )
    .replace(
      /```/g,
      "",
    )
    .trim();
}

function limitText(
  value,
  maximumLength,
) {
  const cleanValue =
    String(
      value || "",
    )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    cleanValue.length <=
    maximumLength
  ) {
    return cleanValue;
  }

  return `${cleanValue
    .slice(
      0,
      maximumLength - 3,
    )
    .trim()}...`;
}

function escapeHtml(value) {
  return String(
    value || "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}