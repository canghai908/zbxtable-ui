import axios from "axios"
import { toast } from "sonner"

import type { ApiEnvelope, PagedResult } from "@/lib/types"
import { clearSession, getToken } from "@/lib/session"
import { useAuthStore } from "@/stores/auth-store"

function resetClientAuthState() {
  clearSession()
  useAuthStore.getState().reset()
}

export const http = axios.create({
  timeout: 20000,
  withCredentials: true,
  xsrfCookieName: "X-Token",
  xsrfHeaderName: "X-Token",
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set("X-Token", token)
    config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown>
    if (payload?.code === 50014) {
      resetClientAuthState()
      window.location.href = "/login"
      throw new Error("token expired")
    }
    return response
  },
  (error) => {
    const message =
      error?.response?.data?.message ?? error?.message ?? "请求失败"
    if (error?.response?.status === 401) {
      resetClientAuthState()
      window.location.href = "/login"
    } else {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

export async function apiGet<T>(url: string, params?: object) {
  const response = await http.get<ApiEnvelope<T>>(url, { params })
  return response.data.data
}

export async function apiPost<T>(url: string, data?: object, config?: object) {
  const response = await http.post<ApiEnvelope<T>>(url, data, config)
  return response.data.data
}

export async function apiPut<T>(url: string, data?: object) {
  const response = await http.put<ApiEnvelope<T>>(url, data)
  return response.data.data
}

export async function apiDelete<T>(url: string) {
  const response = await http.delete<ApiEnvelope<T>>(url)
  return response.data.data
}

export async function apiPage<T>(url: string, params?: object) {
  const response = await http.get<ApiEnvelope<PagedResult<T>>>(url, { params })
  return response.data.data
}
