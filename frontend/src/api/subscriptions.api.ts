import { axiosInstance } from './axiosInstance';
import type { ApiSuccessResponse, Subscription } from '../types';

export const getAllSubscriptions = async (): Promise<Subscription[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Subscription[]>>('/subscriptions');
  return res.data.data;
};

export const getMySubscription = async (): Promise<Subscription | null> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Subscription | null>>('/subscriptions/me');
  return res.data.data;
};

export const createSubscription = async (payload: {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
}): Promise<Subscription> => {
  const res = await axiosInstance.post<ApiSuccessResponse<Subscription>>('/subscriptions', payload);
  return res.data.data;
};
