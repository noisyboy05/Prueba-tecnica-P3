// InvoicesController — thin HTTP adapter for invoice use cases

import type { Request, Response, NextFunction } from 'express';
import type { GetUserInvoicesUseCase } from '../../../application/use-cases/invoices/GetUserInvoicesUseCase';
import type { GetAllInvoicesUseCase } from '../../../application/use-cases/invoices/GetAllInvoicesUseCase';
import type { PayInvoiceUseCase } from '../../../application/use-cases/invoices/PayInvoiceUseCase';
import { UnauthorizedError } from '../../../domain/errors/AuthErrors';
import { successResponse } from '../helpers/apiResponse';
import { billingLogger } from '../../../infrastructure/logging/logger';

export class InvoicesController {
  constructor(
    private readonly getUserInvoicesUseCase: GetUserInvoicesUseCase,
    private readonly getAllInvoicesUseCase: GetAllInvoicesUseCase,
    private readonly payInvoiceUseCase: PayInvoiceUseCase,
  ) {}

  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoices = await this.getAllInvoicesUseCase.execute();
      res.status(200).json(successResponse(invoices));
    } catch (error) {
      next(error);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) { next(new UnauthorizedError()); return; }

      const invoices = await this.getUserInvoicesUseCase.execute(userId);
      res.status(200).json(successResponse(invoices));
    } catch (error) {
      next(error);
    }
  };

  pay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) { next(new UnauthorizedError()); return; }

      const invoice = await this.payInvoiceUseCase.execute(req.params['id'] ?? '', userId);
      billingLogger.info('Invoice paid', {
        invoiceId: invoice.id,
        userId,
        amount: invoice.amount,
      });
      res.status(200).json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  };
}
