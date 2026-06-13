import { axiosInstance } from './axiosInstance';
import type { ApiSuccessResponse, DashboardMetrics } from '../types';

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const res = await axiosInstance.get<ApiSuccessResponse<DashboardMetrics>>('/dashboard');
  return res.data.data;
};
