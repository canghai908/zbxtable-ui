import Cookies from "js-cookie"

const TOKEN_KEY = "X-Token"
const USER_KEY = "zbxtable-user"
const ROLES_KEY = "zbxtable-roles"
const ROUTES_KEY = "zbxtable-routes"
const SYSTEM_KEY = "zbxtable-system"

export function getToken() {
  return Cookies.get(TOKEN_KEY) ?? ""
}

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token)
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY)
}

export function setStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function clearSession() {
  clearToken()
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ROLES_KEY)
  localStorage.removeItem(ROUTES_KEY)
}

export const sessionKeys = {
  user: USER_KEY,
  roles: ROLES_KEY,
  routes: ROUTES_KEY,
  system: SYSTEM_KEY,
}
