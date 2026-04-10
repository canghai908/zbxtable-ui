import {
  AlarmClock,
  Blocks,
  ChartBar,
  Cloud,
  Database,
  FileText,
  HardDrive,
  Home,
  LayoutDashboard,
  Network,
  Settings,
  ShieldAlert,
  Users,
  Waypoints,
  type LucideIcon,
} from "lucide-react"

import type { BackendMenuNode, MenuNode } from "@/lib/types"

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  home: Home,
  hdd: HardDrive,
  cloud: Cloud,
  database: Database,
  alert: ShieldAlert,
  picture: Waypoints,
  file: FileText,
  setting: Settings,
  user: Users,
  team: Users,
  hourglass: AlarmClock,
  block: Blocks,
  appstore: ChartBar,
  chrome: Network,
}

export function getMenuIcon(name?: string) {
  if (!name) {
    return LayoutDashboard
  }
  return iconMap[name] ?? LayoutDashboard
}

export function normalizeMenus(routes: BackendMenuNode[]): MenuNode[] {
  const root = routes.find((item) => item.router === "root")
  const source = root?.children ?? routes
  return source.map((item) => buildMenuNode(item, ""))
}

function buildMenuNode(node: BackendMenuNode, parentPath: string): MenuNode {
  const ownPath = node.path ? `${parentPath}/${node.path}`.replace(/\/+/g, "/") : parentPath
  const fullPath = ownPath || "/"
  return {
    ...node,
    fullPath,
    children: (node.children ?? []).map((child) => buildMenuNode(child, fullPath)),
  }
}

export function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children)])
}

export function findMenuByPath(menus: MenuNode[], path: string) {
  return flattenMenus(menus).find((menu) => menu.fullPath === path)
}

export function firstAvailablePath(menus: MenuNode[]) {
  const all = flattenMenus(menus)
  return all.find((item) => !item.children.length && !item.meta?.invisible)?.fullPath ?? "/dashboard/workplace"
}
