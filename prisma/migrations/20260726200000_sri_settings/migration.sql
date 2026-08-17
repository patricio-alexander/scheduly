-- CreateTable
CREATE TABLE `SriSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `certFileName` VARCHAR(191) NULL,
    `certStoragePath` VARCHAR(191) NULL,
    `certPasswordEnc` TEXT NULL,
    `environment` VARCHAR(191) NOT NULL DEFAULT 'pruebas',
    `uploadedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SriSettings` (`id`, `environment`, `updatedAt`)
VALUES (1, 'pruebas', CURRENT_TIMESTAMP(3));
