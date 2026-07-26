-- CreateTable
CREATE TABLE `BusinessSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `businessName` VARCHAR(191) NOT NULL DEFAULT 'Scheduly',
    `address` TEXT NOT NULL,
    `logoPath` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed singleton row
INSERT INTO `BusinessSettings` (`id`, `businessName`, `address`, `logoPath`, `updatedAt`)
VALUES (1, 'Scheduly', '', NULL, CURRENT_TIMESTAMP(3));
