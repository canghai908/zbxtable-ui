import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

export type PagedResult<T> = {
  items: T[]
  total: number
}

export type AppUser = {
  id?: number
  name: string
  avatar?: string
  role?: string
  created?: string
  theme?: string
}

export type AppRole = {
  id: string
  operation: string
}

export type MenuAuthority = {
  role?: string
  permission?: string
}

export type MenuMeta = {
  highlight?: string
  invisible?: boolean
  page?: {
    cacheAble?: boolean
  }
}

export type BackendMenuNode = {
  router: string
  path?: string
  name?: string
  icon?: string
  meta?: MenuMeta
  authority?: MenuAuthority
  children?: BackendMenuNode[]
}

export type MenuNode = Omit<BackendMenuNode, "children"> & {
  fullPath: string
  children: MenuNode[]
}

export type RouteRegistryItem = {
  key: string
  title: string
  description?: string
  icon?: LucideIcon
  render: () => ReactNode
}

export type LoginResponse = {
  token: string
  demo_mode: boolean
  user: AppUser
  roles: AppRole[]
}
