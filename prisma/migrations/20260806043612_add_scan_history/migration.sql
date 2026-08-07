-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "shopName" TEXT,
    "seoScore" INTEGER NOT NULL,
    "totalProducts" INTEGER NOT NULL,
    "totalImages" INTEGER NOT NULL,
    "totalIssues" INTEGER NOT NULL,
    "affectedProducts" INTEGER NOT NULL,
    "productsWithoutDescription" INTEGER NOT NULL,
    "productsWithoutSeoTitle" INTEGER NOT NULL,
    "productsWithoutSeoDescription" INTEGER NOT NULL,
    "imagesWithoutAltText" INTEGER NOT NULL,
    "largeImages" INTEGER NOT NULL,
    "pagesScanned" INTEGER NOT NULL DEFAULT 1,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ScanHistory_shop_idx" ON "ScanHistory"("shop");

-- CreateIndex
CREATE INDEX "ScanHistory_createdAt_idx" ON "ScanHistory"("createdAt");
