-- AlterTable BusinessSettings
ALTER TABLE `BusinessSettings` ADD COLUMN `ruc` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `BusinessSettings` ADD COLUMN `tradeName` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `BusinessSettings` ADD COLUMN `obligationAccounting` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Customer
ALTER TABLE `Customer` ADD COLUMN `identificationType` VARCHAR(191) NULL;
ALTER TABLE `Customer` ADD COLUMN `identification` VARCHAR(191) NULL;
ALTER TABLE `Customer` ADD COLUMN `address` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable SriSettings
ALTER TABLE `SriSettings` ADD COLUMN `autoEmitOnPayment` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Branch
ALTER TABLE `Branch` ADD COLUMN `emissionEstablishment` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `Branch` ADD COLUMN `emissionPoint` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateTable ElectronicDocument
CREATE TABLE `ElectronicDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('invoice') NOT NULL DEFAULT 'invoice',
    `status` ENUM('draft', 'signed', 'received', 'authorized', 'rejected') NOT NULL DEFAULT 'draft',
    `branchId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `productSaleId` INTEGER NULL,
    `accessKey` VARCHAR(191) NOT NULL,
    `estab` VARCHAR(191) NOT NULL,
    `ptoEmi` VARCHAR(191) NOT NULL,
    `secuencial` VARCHAR(191) NOT NULL,
    `environment` VARCHAR(191) NOT NULL DEFAULT 'pruebas',
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `buyerName` VARCHAR(191) NOT NULL,
    `buyerIdentification` VARCHAR(191) NOT NULL,
    `buyerIdentificationType` VARCHAR(191) NOT NULL DEFAULT '05',
    `buyerAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `buyerEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `buyerPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `subtotal` DOUBLE NOT NULL,
    `ivaAmount` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `lines` JSON NOT NULL,
    `xmlUnsigned` TEXT NULL,
    `xmlSigned` TEXT NULL,
    `authorizationNumber` VARCHAR(191) NULL,
    `authorizationDate` DATETIME(3) NULL,
    `sriMessages` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ElectronicDocument_paymentId_key`(`paymentId`),
    UNIQUE INDEX `ElectronicDocument_productSaleId_key`(`productSaleId`),
    UNIQUE INDEX `ElectronicDocument_accessKey_key`(`accessKey`),
    INDEX `ElectronicDocument_status_issueDate_idx`(`status`, `issueDate`),
    INDEX `ElectronicDocument_branchId_issueDate_idx`(`branchId`, `issueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ElectronicDocument` ADD CONSTRAINT `ElectronicDocument_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ElectronicDocument` ADD CONSTRAINT `ElectronicDocument_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ElectronicDocument` ADD CONSTRAINT `ElectronicDocument_productSaleId_fkey` FOREIGN KEY (`productSaleId`) REFERENCES `ProductSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
