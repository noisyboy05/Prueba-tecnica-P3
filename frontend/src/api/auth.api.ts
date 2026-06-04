import { axiosInstance } from './axiosInstance';
import type { ApiSuccessResponse, LoginResponse } from '../types';

export const loginApi = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await axiosInstance.post<ApiSuccessResponse<LoginResponse>>('/auth/login', {
    email,
    password,
  });
  return res.data.data;
};

export const registerApi = async (
  name: string,
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await axiosInstance.post<ApiSuccessResponse<LoginResponse>>('/auth/register', {
    name,
    email,
    password,
  });
  return res.data.data;
};
