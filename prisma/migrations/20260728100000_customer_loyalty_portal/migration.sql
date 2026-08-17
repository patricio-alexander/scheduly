-- Customer portal login + reward redemptions link
ALTER TABLE `Customer` ADD COLUMN `password` VARCHAR(191) NULL;

ALTER TABLE `PointTransaction` ADD CONSTRAINT `PointTransaction_rewardId_fkey` FOREIGN KEY (`rewardId`) REFERENCES `Reward`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
