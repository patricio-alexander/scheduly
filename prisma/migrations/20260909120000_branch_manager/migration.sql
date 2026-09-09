-- Admin principal (encargado) por local
ALTER TABLE `Branch`
  ADD COLUMN `managerAccountId` INTEGER NULL;

CREATE INDEX `Branch_managerAccountId_idx` ON `Branch`(`managerAccountId`);
