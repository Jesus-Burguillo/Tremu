import api from "./axios";
import type { LoginResponse, RegisterResponse } from "@/interfaces/authInterface";
import type { LoginData, RegisterData } from "@/types/authTypes";


function isAxiosError(error: any): error is { response?: { data?: { message?: string } } } {
  return error && typeof error === 'object' && 'response' in error
}

export const login = async (data: LoginData): Promise<{ data: LoginResponse | null; error: string | null }> => {
  try {
    const response = await api.post<LoginResponse>("/auth/login", data)
    return { data: response.data, error: null }
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        data: null,
        error: error.response?.data?.message || "Something went wrong"
      }
    }
    return {
      data: null,
      error: error instanceof Error ? error.message : "Something went wrong"
    }
  }
}

export const register = async (data: RegisterData): Promise<{ data: RegisterResponse | null; error: string | null }> => {
  try {
    const response = await api.post<RegisterResponse>("/auth/register", data)
    return { data: response.data, error: null }
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        data: null,
        error: error.response?.data?.message || "Something went wrong"
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Something went wrong"
    }
  }
}