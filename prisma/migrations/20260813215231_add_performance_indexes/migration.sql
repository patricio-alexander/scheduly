-- CreateIndex
CREATE INDEX `Appointment_appointmentDate_idx` ON `Appointment`(`appointmentDate`);

-- CreateIndex
CREATE INDEX `Appointment_branchId_appointmentDate_idx` ON `Appointment`(`branchId`, `appointmentDate`);

-- CreateIndex
CREATE INDEX `Appointment_userId_appointmentDate_idx` ON `Appointment`(`userId`, `appointmentDate`);

-- CreateIndex
CREATE INDEX `Appointment_branchId_status_appointmentDate_idx` ON `Appointment`(`branchId`, `status`, `appointmentDate`);

-- CreateIndex
CREATE INDEX `Appointment_status_appointmentDate_idx` ON `Appointment`(`status`, `appointmentDate`);

-- CreateIndex
CREATE INDEX `BranchStock_branchId_stock_idx` ON `BranchStock`(`branchId`, `stock`);

-- CreateIndex
CREATE INDEX `CommissionRecord_userId_createdAt_idx` ON `CommissionRecord`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `EmployeePayment_userId_paidAt_idx` ON `EmployeePayment`(`userId`, `paidAt`);

-- CreateIndex
CREATE INDEX `EmployeePayment_branchId_paidAt_idx` ON `EmployeePayment`(`branchId`, `paidAt`);

-- CreateIndex
CREATE INDEX `Entitlement_status_updatedAt_idx` ON `Entitlement`(`status`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Expense_expenseDate_idx` ON `Expense`(`expenseDate`);

-- CreateIndex
CREATE INDEX `Expense_branchId_expenseDate_idx` ON `Expense`(`branchId`, `expenseDate`);

-- CreateIndex
CREATE INDEX `FeedPost_isActive_startsAt_idx` ON `FeedPost`(`isActive`, `startsAt`);

-- CreateIndex
CREATE INDEX `Notification_userId_read_idx` ON `Notification`(`userId`, `read`);

-- CreateIndex
CREATE INDEX `Notification_userId_createdAt_idx` ON `Notification`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `PointTransaction_customerId_createdAt_idx` ON `PointTransaction`(`customerId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Product_stock_idx` ON `Product`(`stock`);

-- CreateIndex
CREATE INDEX `ProductSale_paidAt_idx` ON `ProductSale`(`paidAt`);

-- CreateIndex
CREATE INDEX `ProductSale_branchId_paidAt_idx` ON `ProductSale`(`branchId`, `paidAt`);

-- CreateIndex
CREATE INDEX `ProductSale_userId_paidAt_idx` ON `ProductSale`(`userId`, `paidAt`);

-- CreateIndex
CREATE INDEX `Purchase_purchasedAt_idx` ON `Purchase`(`purchasedAt`);

-- CreateIndex
CREATE INDEX `Purchase_branchId_purchasedAt_idx` ON `Purchase`(`branchId`, `purchasedAt`);

-- CreateIndex
CREATE INDEX `Purchase_userId_purchasedAt_idx` ON `Purchase`(`userId`, `purchasedAt`);

-- CreateIndex
CREATE INDEX `Reward_isActive_sortOrder_idx` ON `Reward`(`isActive`, `sortOrder`);

-- CreateIndex
CREATE INDEX `ServiceBranch_branchId_isActive_idx` ON `ServiceBranch`(`branchId`, `isActive`);

-- CreateIndex
CREATE INDEX `ServicePromotion_isActive_startsAt_idx` ON `ServicePromotion`(`isActive`, `startsAt`);

-- CreateIndex
CREATE INDEX `StockTransfer_fromBranchId_createdAt_idx` ON `StockTransfer`(`fromBranchId`, `createdAt`);

-- CreateIndex
CREATE INDEX `StockTransfer_toBranchId_createdAt_idx` ON `StockTransfer`(`toBranchId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Task_status_sortOrder_idx` ON `Task`(`status`, `sortOrder`);

-- CreateIndex
CREATE INDEX `Task_assigneeId_status_idx` ON `Task`(`assigneeId`, `status`);

-- CreateIndex
CREATE INDEX `UserBranch_userId_isPrimary_idx` ON `UserBranch`(`userId`, `isPrimary`);

-- RenameIndex
ALTER TABLE `Appointment` RENAME INDEX `Appointment_customerId_fkey` TO `Appointment_customerId_idx`;

-- RenameIndex
ALTER TABLE `AppointmentsProducts` RENAME INDEX `AppointmentsProducts_productId_fkey` TO `AppointmentsProducts_productId_idx`;

-- RenameIndex
ALTER TABLE `AppointmentsServices` RENAME INDEX `AppointmentsServices_serviceId_fkey` TO `AppointmentsServices_serviceId_idx`;

-- RenameIndex
ALTER TABLE `Expense` RENAME INDEX `Expense_categoryId_fkey` TO `Expense_categoryId_idx`;

-- RenameIndex
ALTER TABLE `Product` RENAME INDEX `Product_categoryId_fkey` TO `Product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `ProductSale` RENAME INDEX `ProductSale_customerId_fkey` TO `ProductSale_customerId_idx`;

-- RenameIndex
ALTER TABLE `UserBranch` RENAME INDEX `UserBranch_branchId_fkey` TO `UserBranch_branchId_idx`;
