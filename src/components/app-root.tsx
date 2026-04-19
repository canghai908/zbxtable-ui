import { useEffect, useMemo } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { LogOut, Moon, Search, Sun } from "lucide-react"

import { useAuthStore } from "@/stores/auth-store"
import { useSystemStore } from "@/stores/system-store"
import { clearSession, getToken } from "@/lib/session"
import { findMenuByPath, firstAvailablePath, getMenuIcon } from "@/lib/menu"
import { getInstallStatus, getPublicSystemInfo, getRoutesConfig } from "@/services/core"
import { useTheme } from "@/components/use-theme"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"
import { PageRenderer } from "@/pages/page-renderer"
import { ChevronRight } from "lucide-react"

export function AppRoot() {
  const { user, menus, setRoutes, reset, demoMode } = useAuthStore()
  const { systemName, systemLogo, installed, setSystemInfo } = useSystemStore()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    void getInstallStatus().then((data) => setSystemInfo({ installed: data.installed }))
    void getPublicSystemInfo().then((data) =>
      setSystemInfo({
        systemName: data.system_name,
        systemLogo: data.system_logo || "/logo.png",
        demoMode: data.demo_mode,
      })
    )
  }, [setSystemInfo])

  useEffect(() => {
    if (!getToken()) {
      return
    }
    if (!menus.length) {
      void getRoutesConfig().then((routes) => setRoutes(routes))
    }
  }, [menus.length, setRoutes])

  const currentMenu = useMemo(
    () => findMenuByPath(menus, location.pathname),
    [location.pathname, menus]
  )
  const rootMenus = menus.filter((menu) => !menu.meta?.invisible)
  const activeRoot = rootMenus.find((menu) => location.pathname.startsWith(menu.fullPath))

  useEffect(() => {
    const pageName = currentMenu?.name ?? activeRoot?.name ?? systemName ?? "ZbxTable"
    document.title = `${systemName || "ZbxTable"} | ${pageName}`
  }, [activeRoot?.name, currentMenu?.name, systemName])

  if (installed === false && location.pathname !== "/install") {
    return <Navigate to="/install" replace />
  }

  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  if (!menus.length) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (location.pathname === "/") {
    return <Navigate to={firstAvailablePath(menus)} replace />
  }

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-3 border-b px-2 pb-4">
          <div className="console-panel flex items-center gap-3 rounded-2xl px-3 py-3">
            <Avatar className="size-11 rounded-2xl border bg-background shadow-sm">
              <AvatarImage src={systemLogo} alt={systemName} />
              <AvatarFallback>{systemName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold tracking-[-0.02em]">{systemName}</span>
                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] tracking-[0.14em] uppercase">
                  Ops
                </Badge>
              </div>
              <span className="truncate text-xs text-muted-foreground">{user?.name ?? "anonymous"}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80">
              系统导航
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {rootMenus.map((menu) => {
                  const Icon = getMenuIcon(menu.icon)
                  const isActive = activeRoot?.fullPath === menu.fullPath
                  const visibleChildren = menu.children.filter((child) => !child.meta?.invisible)
                  const target = visibleChildren[0]?.fullPath ?? menu.fullPath
                  return (
                    <SidebarMenuItem key={menu.fullPath}>
                      {visibleChildren.length ? (
                        <Collapsible open={activeRoot?.fullPath === menu.fullPath}>
                          <SidebarMenuButton isActive={isActive} onClick={() => navigate(target)}>
                            <Icon />
                            <span>{menu.name ?? menu.router}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]:rotate-90" />
                          </SidebarMenuButton>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleChildren.map((child) => (
                                <SidebarMenuSubItem key={child.fullPath}>
                                  <SidebarMenuSubButton
                                    isActive={location.pathname === child.fullPath}
                                    onClick={() => navigate(child.fullPath)}
                                  >
                                    <span>{child.name ?? child.router}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <SidebarMenuButton isActive={isActive} onClick={() => navigate(target)}>
                          <Icon />
                          <span>{menu.name ?? menu.router}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Light" : "Dark"}</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              className="flex-1 justify-start"
              onClick={() => {
                clearSession()
                reset()
                navigate("/login")
              }}
            >
              <LogOut data-icon="inline-start" />
              退出登录
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-svh flex-col bg-transparent">
          <header className="sticky top-0 z-10">
            <div className="app-shell-surface flex h-(--header-height) items-center gap-3 border-b px-4 lg:px-6">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-sm font-medium tracking-[-0.02em]">
                      {activeRoot?.name ?? systemName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  {currentMenu && activeRoot && currentMenu.fullPath !== activeRoot.fullPath ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-muted-foreground">
                        {currentMenu.name ?? currentMenu.router}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : null}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto hidden w-full max-w-sm items-center lg:flex">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 rounded-xl border-0 bg-card/80 pl-9 shadow-none ring-1 ring-border/70"
                    placeholder="搜索菜单、主机或页面…"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {demoMode ? <Badge variant="secondary">DEMO</Badge> : null}
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                  <PageRenderer path={location.pathname} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
