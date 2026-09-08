-- Vinculación Account ↔ Branch (administrador/empleado a su local).
CREATE TABLE IF NOT EXISTS `AccountBranch` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `accountId` INTEGER NOT NULL,
  `branchId` INTEGER NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccountBranch_accountId_branchId_key`(`accountId`, `branchId`),
  INDEX `AccountBranch_accountId_isPrimary_idx`(`accountId`, `isPrimary`),
  INDEX `AccountBranch_branchId_idx`(`branchId`),
  CONSTRAINT `AccountBranch_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AccountBranch_branchId_fkey`
    FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
