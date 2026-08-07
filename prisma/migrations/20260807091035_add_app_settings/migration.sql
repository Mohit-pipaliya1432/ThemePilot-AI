-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "autoScan" BOOLEAN NOT NULL DEFAULT false,
    "scanFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "aiTone" TEXT NOT NULL DEFAULT 'professional',
    "seoTitleMaxLength" INTEGER NOT NULL DEFAULT 60,
    "seoDescriptionMaxLength" INTEGER NOT NULL DEFAULT 155,
    "autoGenerateAltText" BOOLEAN NOT NULL DEFAULT true,
    "historyRetention" TEXT NOT NULL DEFAULT '90',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE INDEX "AppSettings_shop_idx" ON "AppSettings"("shop");
