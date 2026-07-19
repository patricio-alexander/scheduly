-- CreateTable
CREATE TABLE `Entitlement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payload` JSON NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `status` ENUM('gestor_push', 'gestor_pull') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
