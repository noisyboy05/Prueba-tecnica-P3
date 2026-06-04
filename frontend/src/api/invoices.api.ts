import { axiosInstance } from './axiosInstance';
import type { ApiSuccessResponse, Invoice } from '../types';

export const getAllInvoices = async (): Promise<Invoice[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Invoice[]>>('/invoices');
  return res.data.data;
};

export const getMyInvoices = async (): Promise<Invoice[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Invoice[]>>('/invoices/me');
  return res.data.data;
};

export const payInvoice = async (id: string): Promise<Invoice> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<Invoice>>(`/invoices/${id}/pay`, {
    status: 'PAID',
  });
  return res.data.data;
};

/** ADMIN: manually override invoice status (PENDING | PAID | OVERDUE) */
export const adminUpdateInvoiceStatus = async (
  id: string,
  status: 'PENDING' | 'PAID' | 'OVERDUE',
): Promise<Invoice> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<Invoice>>(
    `/invoices/${id}/status`,
    { status },
  );
  return res.data.data;
};
