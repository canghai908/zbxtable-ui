import { Suspense, lazy } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { findMenuByPath } from "@/lib/menu"
import { useAuthStore } from "@/stores/auth-store"

const SummaryPage = lazy(() => import("@/pages/summary-page").then((module) => ({ default: module.SummaryPage })))
const WorkplacePage = lazy(() => import("@/pages/workplace-page").then((module) => ({ default: module.WorkplacePage })))
const HostListPage = lazy(() => import("@/pages/host-list-page").then((module) => ({ default: module.HostListPage })))
const HostDetailPage = lazy(() => import("@/pages/host-detail-page").then((module) => ({ default: module.HostDetailPage })))
const AlarmAnalysisPage = lazy(() => import("@/pages/alarm-analysis-page").then((module) => ({ default: module.AlarmAnalysisPage })))
const AlarmQueryPage = lazy(() => import("@/pages/alarm-query-page").then((module) => ({ default: module.AlarmQueryPage })))
const NotFoundPage = lazy(() => import("@/pages/status-pages").then((module) => ({ default: module.NotFoundPage })))
const RuleManagementPage = lazy(() => import("@/pages/rule-management-page").then((module) => ({ default: module.RuleManagementPage })))
const TopologyEditorPage = lazy(() => import("@/pages/topology-editor-page").then((module) => ({ default: module.TopologyEditorPage })))
const TopologyListPage = lazy(() => import("@/pages/topology-list-page").then((module) => ({ default: module.TopologyListPage })))
const TopologyViewPage = lazy(() => import("@/pages/topology-view-page").then((module) => ({ default: module.TopologyViewPage })))
const SystemConfigPage = lazy(() => import("@/pages/system-config-page").then((module) => ({ default: module.SystemConfigPage })))
const ZabbixManagementPage = lazy(() => import("@/pages/zabbix-management-page").then((module) => ({ default: module.ZabbixManagementPage })))
const MetricMappingPage = lazy(() => import("@/pages/metric-mapping-page").then((module) => ({ default: module.MetricMappingPage })))
const ReportManagementPage = lazy(() => import("@/pages/report-management-page").then((module) => ({ default: module.ReportManagementPage })))
const VersionPage = lazy(() => import("@/pages/version-page").then((module) => ({ default: module.VersionPage })))
const UserManagementPage = lazy(() => import("@/pages/user-management-page").then((module) => ({ default: module.UserManagementPage })))
const GroupManagementPage = lazy(() => import("@/pages/group-management-page").then((module) => ({ default: module.GroupManagementPage })))
const MenuManagementPage = lazy(() => import("@/pages/menu-management-page").then((module) => ({ default: module.MenuManagementPage })))
const BandwidthManagementPage = lazy(() => import("@/pages/bandwidth-management-page").then((module) => ({ default: module.BandwidthManagementPage })))
const ChangePasswordPage = lazy(() => import("@/pages/change-password-page").then((module) => ({ default: module.ChangePasswordPage })))

function PageLoadingFallback() {
  return (
    <div className="flex flex-col gap-5">
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardContent className="p-3">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function renderRoute(router: string | undefined) {
  switch (router) {
    case "workplace":
      return <WorkplacePage />
    case "inventory":
      return <SummaryPage mode="inventory" />
    case "overview":
      return <SummaryPage mode="overview" />
    case "linux":
      return <HostListPage hostType="VM_LIN" detailPath="/host/lindetail" />
    case "windows":
      return <HostListPage hostType="VM_WIN" detailPath="/host/windetail" />
    case "netList":
      return <HostListPage hostType="HW_NET" detailPath="/net/detail" />
    case "srvList":
      return <HostListPage hostType="HW_SRV" detailPath="/server/detail" />
    case "sanList":
      return <HostListPage hostType="HW_FIB" detailPath="/server/detail" />
    case "stoList":
      return <HostListPage hostType="HW_STO" detailPath="/server/detail" />
    case "linDetail":
      return <HostDetailPage />
    case "winDetail":
      return <HostDetailPage />
    case "netDetail":
      return <HostDetailPage />
    case "srvDetail":
      return <HostDetailPage />
    case "alarmAnalysis":
      return <AlarmAnalysisPage />
    case "alarmList":
      return <AlarmQueryPage />
    case "alarmRule":
      return <RuleManagementPage mType="1" />
    case "alarmMutes":
      return <RuleManagementPage mType="3" />
    case "topologyList":
      return <TopologyListPage />
    case "topologyDetail":
      return <TopologyEditorPage />
    case "topologyShow":
      return <TopologyViewPage />
    case "hostReport":
      return <ReportManagementPage />
    case "systemUsers":
      return <UserManagementPage />
    case "systemGroups":
      return <GroupManagementPage />
    case "menuManagement":
      return <MenuManagementPage />
    case "zabbix":
      return <ZabbixManagementPage />
    case "metricMapping":
      return <MetricMappingPage />
    case "systemBandwidth":
      return <BandwidthManagementPage />
    case "sysConfig":
      return <SystemConfigPage />
    case "systemChpwd":
      return <ChangePasswordPage />
    case "version":
      return <VersionPage />
    default:
      return <NotFoundPage />
  }
}

export function PageRenderer({ path }: { path: string }) {
  const menus = useAuthStore((state) => state.menus)
  const current = findMenuByPath(menus, path)

  return <Suspense fallback={<PageLoadingFallback />}>{renderRoute(current?.router)}</Suspense>
}
