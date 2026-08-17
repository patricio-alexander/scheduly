-- AlterTable Reward: optional service or product apply target
ALTER TABLE `Reward` ADD COLUMN `serviceId` INTEGER NULL;
ALTER TABLE `Reward` ADD COLUMN `productId` INTEGER NULL;

ALTER TABLE `Reward` ADD CONSTRAINT `Reward_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
