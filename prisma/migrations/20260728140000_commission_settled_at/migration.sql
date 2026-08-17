-- AlterTable
ALTER TABLE `CommissionRecord` ADD COLUMN `settledAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `CommissionRecord_userId_settledAt_idx` ON `CommissionRecord`(`userId`, `settledAt`);
