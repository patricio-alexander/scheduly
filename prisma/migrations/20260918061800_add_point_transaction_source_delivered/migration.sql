-- AlterTable
ALTER TABLE `PointTransaction` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'customer';

-- CreateIndex
CREATE INDEX `PointTransaction_source_deliveredAt_idx` ON `PointTransaction`(`source`, `deliveredAt`);
