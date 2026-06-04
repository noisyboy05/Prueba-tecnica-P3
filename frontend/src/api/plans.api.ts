import { axiosInstance } from './axiosInstance';
import type { ApiSuccessResponse, Plan } from '../types';
import type { PlanName } from '../types';

export const getPlans = async (): Promise<Plan[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Plan[]>>('/plans');
  return res.data.data;
};

export const getPlanById = async (id: string): Promise<Plan> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Plan>>(`/plans/${id}`);
  return res.data.data;
};

export const createPlan = async (payload: {
  name: PlanName;
  price: number;
  description: string;
}): Promise<Plan> => {
  const res = await axiosInstance.post<ApiSuccessResponse<Plan>>('/plans', payload);
  return res.data.data;
};

export const updatePlan = async (
  id: string,
  payload: { price?: number; description?: string },
): Promise<Plan> => {
  const res = await axiosInstance.put<ApiSuccessResponse<Plan>>(`/plans/${id}`, payload);
  return res.data.data;
};

export const deletePlan = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/plans/${id}`);
};
