export function buildSeoPrompt(
  product,
  settings = {},
) {
  const aiTone =
    settings.aiTone ||
    "professional";

  const seoTitleMaxLength =
    Number(
      settings.seoTitleMaxLength ||
        60,
    );

  const seoDescriptionMaxLength =
    Number(
      settings.seoDescriptionMaxLength ||
        155,
    );

  const autoGenerateAltText =
    settings.autoGenerateAltText !==
    false;

  return `
You are a Shopify SEO expert.

Writing tone:
${aiTone}

Generate the following for this product:

1. Product Description (HTML)

2. SEO Title
Maximum ${seoTitleMaxLength} characters

3. SEO Description
Maximum ${seoDescriptionMaxLength} characters

${
  autoGenerateAltText
    ? `4. Image Alt Text`
    : `4. Do not generate image alt text. Return an empty string for altText.`
}

5. Focus Keywords

Product Title:
${product.title}

Important rules:

- Keep the product facts accurate.
- Do not invent specifications, benefits, ingredients, guarantees, certifications, dimensions, or claims.
- Use a ${aiTone} writing tone.
- Keep the SEO title within ${seoTitleMaxLength} characters.
- Keep the SEO description within ${seoDescriptionMaxLength} characters.
- Return only valid JSON.
- Do not include markdown code fences.

Return ONLY valid JSON in this format:

{
  "descriptionHtml": "",
  "seoTitle": "",
  "seoDescription": "",
  "altText": "",
  "keywords": []
}
`.trim();
}