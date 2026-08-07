-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIContentHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "descriptionHtml" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "restoredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AIContentHistory" ("altText", "createdAt", "descriptionHtml", "id", "keywords", "productId", "productTitle", "seoDescription", "seoTitle", "shop", "version") SELECT "altText", "createdAt", "descriptionHtml", "id", "keywords", "productId", "productTitle", "seoDescription", "seoTitle", "shop", "version" FROM "AIContentHistory";
DROP TABLE "AIContentHistory";
ALTER TABLE "new_AIContentHistory" RENAME TO "AIContentHistory";
CREATE INDEX "AIContentHistory_shop_idx" ON "AIContentHistory"("shop");
CREATE INDEX "AIContentHistory_productId_idx" ON "AIContentHistory"("productId");
CREATE INDEX "AIContentHistory_createdAt_idx" ON "AIContentHistory"("createdAt");
CREATE INDEX "AIContentHistory_isCurrent_idx" ON "AIContentHistory"("isCurrent");
CREATE UNIQUE INDEX "AIContentHistory_shop_productId_version_key" ON "AIContentHistory"("shop", "productId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
