-- AlterTable
ALTER TABLE `Product` ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `stockDeducted` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `method` ENUM('cash', 'card', 'transfer') NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `Payment_appointmentId_key`(`appointmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
