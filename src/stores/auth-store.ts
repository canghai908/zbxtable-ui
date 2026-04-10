import { create } from "zustand"

import type { AppRole, AppUser, BackendMenuNode, MenuNode } from "@/lib/types"
import { normalizeMenus } from "@/lib/menu"
import { getStorage, sessionKeys, setStorage } from "@/lib/session"

type AuthState = {
  user: AppUser | null
  roles: AppRole[]
  routes: BackendMenuNode[]
  menus: MenuNode[]
  demoMode: boolean
  setAuth: (payload: {
    user: AppUser
    roles: AppRole[]
    routes: BackendMenuNode[]
    demoMode?: boolean
  }) => void
  setRoutes: (routes: BackendMenuNode[]) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStorage<AppUser | null>(sessionKeys.user, null),
  roles: getStorage<AppRole[]>(sessionKeys.roles, []),
  routes: getStorage<BackendMenuNode[]>(sessionKeys.routes, []),
  menus: normalizeMenus(getStorage<BackendMenuNode[]>(sessionKeys.routes, [])),
  demoMode: false,
  setAuth: ({ user, roles, routes, demoMode = false }) => {
    setStorage(sessionKeys.user, user)
    setStorage(sessionKeys.roles, roles)
    setStorage(sessionKeys.routes, routes)
    set({
      user,
      roles,
      routes,
      menus: normalizeMenus(routes),
      demoMode,
    })
  },
  setRoutes: (routes) => {
    setStorage(sessionKeys.routes, routes)
    set({
      routes,
      menus: normalizeMenus(routes),
    })
  },
  reset: () =>
    set({
      user: null,
      roles: [],
      routes: [],
      menus: [],
      demoMode: false,
    }),
}))
