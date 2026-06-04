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
