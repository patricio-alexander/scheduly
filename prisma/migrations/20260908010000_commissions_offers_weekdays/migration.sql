-- Comisiones producto/categoría + ofertas semanales (weekdays)
ALTER TABLE `Category` ADD COLUMN `commissionPct` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Product` ADD COLUMN `commissionPct` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `ServicePromotion` ADD COLUMN `weekdays` JSON NULL;
