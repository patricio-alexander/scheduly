-- Medios de pago / bancos (soft-disable via isActive)
CREATE TABLE `PaymentMedium` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `code` VARCHAR(40) NULL,
    `kind` VARCHAR(40) NOT NULL DEFAULT 'other',
    `position` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentMedium_code_key`(`code`),
    INDEX `PaymentMedium_isActive_position_idx`(`isActive`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CashClose` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `closeDate` DATE NOT NULL,
    `expensesTotal` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashClose_closeDate_idx`(`closeDate`),
    UNIQUE INDEX `CashClose_branchId_closeDate_key`(`branchId`, `closeDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CashCloseLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cashCloseId` INTEGER NOT NULL,
    `paymentMediumId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `CashCloseLine_cashCloseId_paymentMediumId_key`(`cashCloseId`, `paymentMediumId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollWeek` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `notes` TEXT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollWeek_status_periodStart_idx`(`status`, `periodStart`),
    UNIQUE INDEX `PayrollWeek_periodStart_periodEnd_key`(`periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PayrollWeekLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payrollWeekId` INTEGER NOT NULL,
    `accountId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `producedAmount` DOUBLE NOT NULL DEFAULT 0,
    `salesAmount` DOUBLE NOT NULL DEFAULT 0,
    `vouchersAmount` DOUBLE NOT NULL DEFAULT 0,
    `cafeteriaAmount` DOUBLE NOT NULL DEFAULT 0,
    `finesAmount` DOUBLE NOT NULL DEFAULT 0,
    `discountsAmount` DOUBLE NOT NULL DEFAULT 0,
    `additionalAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `employeeConfirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollWeekLine_accountId_employeeConfirmedAt_idx`(`accountId`, `employeeConfirmedAt`),
    UNIQUE INDEX `PayrollWeekLine_payrollWeekId_accountId_key`(`payrollWeekId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CashClose` ADD CONSTRAINT `CashClose_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CashClose` ADD CONSTRAINT `CashClose_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CashCloseLine` ADD CONSTRAINT `CashCloseLine_cashCloseId_fkey` FOREIGN KEY (`cashCloseId`) REFERENCES `CashClose`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CashCloseLine` ADD CONSTRAINT `CashCloseLine_paymentMediumId_fkey` FOREIGN KEY (`paymentMediumId`) REFERENCES `PaymentMedium`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollWeek` ADD CONSTRAINT `PayrollWeek_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PayrollWeekLine` ADD CONSTRAINT `PayrollWeekLine_payrollWeekId_fkey` FOREIGN KEY (`payrollWeekId`) REFERENCES `PayrollWeek`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PayrollWeekLine` ADD CONSTRAINT `PayrollWeekLine_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PayrollWeekLine` ADD CONSTRAINT `PayrollWeekLine_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Semilla medios (fotos Andrea Guerrero)
INSERT INTO `PaymentMedium` (`name`, `code`, `kind`, `position`, `isActive`, `updatedAt`) VALUES
('Efectivo', 'efectivo', 'cash', 10, true, CURRENT_TIMESTAMP(3)),
('De Una', 'de_una', 'transfer', 20, true, CURRENT_TIMESTAMP(3)),
('Loja', 'loja', 'transfer', 30, true, CURRENT_TIMESTAMP(3)),
('Tarjeta', 'tarjeta', 'card', 40, true, CURRENT_TIMESTAMP(3)),
('Vales', 'vales', 'voucher', 50, true, CURRENT_TIMESTAMP(3)),
('CoopMego', 'coopmego', 'transfer', 60, true, CURRENT_TIMESTAMP(3)),
('Duna', 'duna', 'transfer', 70, true, CURRENT_TIMESTAMP(3)),
('Ahorro', 'ahorro', 'transfer', 80, true, CURRENT_TIMESTAMP(3));
