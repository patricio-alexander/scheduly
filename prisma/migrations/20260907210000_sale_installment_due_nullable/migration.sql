-- Crédito cliente: cuota puede quedar sin fecha de pago
ALTER TABLE `SalePaymentInstallment` MODIFY `dueDate` DATE NULL;
