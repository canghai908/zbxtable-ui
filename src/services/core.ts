import type { BackendMenuNode, LoginResponse } from "@/lib/types"
import { apiGet, apiPost } from "@/lib/http"

export type PublicSystemInfo = {
  system_name: string
  system_logo: string
  demo_mode: boolean
}

export type InstallStatus = {
  installed: boolean
}

export function getInstallStatus() {
  return apiGet<InstallStatus>("/install/status")
}

export function checkDatabase(data: object) {
  return apiPost("/install/check-db", data)
}

export function doInstall(data: object) {
  return apiPost("/install/install", data)
}

export function getPublicSystemInfo() {
  return apiGet<PublicSystemInfo>("/v1/info")
}

export function login(username: string, password: string) {
  return apiPost<LoginResponse>("/v1/login", { username, password })
}

export function getRoutesConfig() {
  return apiGet<BackendMenuNode[]>("/v1/index/routers")
}
