-- Make Role.name unique so system roles (admin, employee) can be upserted safely
ALTER TABLE `Role` ADD UNIQUE INDEX `Role_name_key`(`name`);
