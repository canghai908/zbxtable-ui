import { apiDelete, apiGet, apiPage, apiPost, apiPut } from "@/lib/http"
import { http } from "@/lib/http"

export function getAlarmList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/alarm", params)
}

export function analyzeAlarm(payload: object) {
  return apiPost("/v1/alarm/analysis", payload)
}

export async function exportAlarmAnalysis(payload: object) {
  const response = await http.post("/v1/alarm/export", payload, {
    responseType: "blob",
  })
  return response.data as Blob
}

export function getRuleList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/rule", params)
}

export function getRule(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/rule/${id}`)
}

export function createRule(payload: object) {
  return apiPost("/v1/rule", payload)
}

export function updateRule(id: string | number, payload: object) {
  return apiPut(`/v1/rule/${id}`, payload)
}

export function updateRuleStatus(id: string | number, payload: object) {
  return apiPut(`/v1/rule/status/${id}`, payload)
}

export function deleteRule(id: string | number) {
  return apiDelete(`/v1/rule/${id}`)
}

export function getTopologyList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/topology", params)
}

export function getTopology(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/topology/${id}`)
}

export function updateTopologyStatus(payload: object) {
  return apiPost("/v1/topology/status", payload)
}

export function createTopology(payload: object) {
  return apiPost("/v1/topology", payload)
}

export function updateTopology(id: string | number, payload: object) {
  return apiPut(`/v1/topology/${id}`, payload)
}

export function deleteTopology(id: string | number) {
  return apiDelete(`/v1/topology/${id}`)
}

export function uploadTopologyBackground(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  return apiPost<{ path: string; filename: string; size: number }>("/v1/topology/upload-background", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export function deleteTopologyBackground(path: string) {
  return apiDelete(`/v1/topology/delete-background?path=${encodeURIComponent(path)}`)
}

export function getReportList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/report", params)
}

export function getReport(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/report/${id}`)
}

export function createReport(payload: object) {
  return apiPost("/v1/report", payload)
}

export function updateReport(id: string | number, payload: object) {
  return apiPut(`/v1/report/${id}`, payload)
}

export function deleteReport(id: string | number) {
  return apiDelete(`/v1/report/${id}`)
}

export function checkNowReport(payload: object) {
  return apiPost("/v1/report/checknow", payload)
}

export function updateReportStatus(payload: object) {
  return apiPost("/v1/report/status", payload)
}

export function getTaskLogs(params: object) {
  return apiPage<Record<string, unknown>>("/v1/task_log", params)
}

export function deleteTaskLog(id: string | number) {
  return apiDelete(`/v1/task_log/${id}`)
}

export function getUserList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/user", params)
}

export function createUser(payload: object) {
  return apiPost("/v1/user", payload)
}

export function updateUser(id: string | number, payload: object) {
  return apiPut(`/v1/user/${id}`, payload)
}

export function deleteUser(id: string | number) {
  return apiDelete(`/v1/user/${id}`)
}

export function changePassword(payload: { old: string; new: string }) {
  return apiPost("/v1/manager/chpwd", payload)
}

export function getGroupList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/group", params)
}

export function createGroup(payload: object) {
  return apiPost("/v1/group", payload)
}

export function updateGroup(id: string | number, payload: object) {
  return apiPut(`/v1/group/${id}`, payload)
}

export function updateGroupMember(id: string | number, payload: object) {
  return apiPut(`/v1/group/member/${id}`, payload)
}

export function deleteGroup(id: string | number) {
  return apiDelete(`/v1/group/${id}`)
}

export function getMenuList() {
  return apiGet<Record<string, unknown>[]>("/v1/menu")
}

export function getParentMenus() {
  return apiGet<Record<string, unknown>[]>("/v1/menu/parents")
}

export function createMenu(payload: object) {
  return apiPost("/v1/menu", payload)
}

export function updateMenu(id: string | number, payload: object) {
  return apiPut(`/v1/menu/${id}`, payload)
}

export function deleteMenu(id: string | number) {
  return apiDelete(`/v1/menu/${id}`)
}

export function getMetricMappings(params: object) {
  return apiPage<Record<string, unknown>>("/v1/metric_mapping", params)
}

export function getMetricMapping(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/metric_mapping/${id}`)
}

export function createMetricMapping(payload: object) {
  return apiPost("/v1/metric_mapping", payload)
}

export function updateMetricMapping(id: string | number, payload: object) {
  return apiPut(`/v1/metric_mapping/${id}`, payload)
}

export function deleteMetricMapping(id: string | number) {
  return apiDelete(`/v1/metric_mapping/${id}`)
}

export function executeMetricMapping(id: string | number) {
  return apiPost(`/v1/metric_mapping/${id}/execute`)
}

export function getMetricMappingHistory(params: object) {
  return apiPage<Record<string, unknown>>("/v1/metric_mapping/history", params)
}

export async function getConfigList() {
  const data = await apiGet<
    Record<string, unknown>[] | { items?: Record<string, unknown>[]; total?: number }
  >("/v1/system/config/")

  if (Array.isArray(data)) {
    return data
  }

  return Array.isArray(data?.items) ? data.items : []
}

export function updateConfig(id: string | number, payload: object) {
  return apiPut(`/v1/system/config/${id}`, payload)
}

export function uploadSystemLogo(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  return apiPost<{ url: string }>("/v1/system/upload-logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export function testEmailConfig(payload: { test_email: string }) {
  return apiPost("/v1/system/test-email", payload)
}

export function testWechatConfig(payload: { test_user_id: string }) {
  return apiPost("/v1/system/test-wechat", payload)
}

export function getSystemVersion() {
  return apiGet<Record<string, unknown>>("/v1/system/version")
}

export function checkSystemUpdate() {
  return apiGet<Record<string, unknown>>("/v1/system/check-update")
}

export function doSystemUpdate() {
  return apiPost<Record<string, unknown>>("/v1/system/update")
}

export function getEgressConfigs() {
  return apiGet<Record<string, unknown>[]>("/v1/egress/configs")
}

export function createEgressConfig(payload: object) {
  return apiPost("/v1/egress/configs", payload)
}

export function updateEgressConfig(id: string | number, payload: object) {
  return apiPut(`/v1/egress/configs/${id}`, payload)
}

export function deleteEgressConfig(id: string | number) {
  return apiDelete(`/v1/egress/configs/${id}`)
}

export function listZabbixInstances() {
  return apiGet<Record<string, unknown>[]>("/v1/zabbix/instance")
}

export function getZabbixInstance(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/zabbix/instance/${id}`)
}

export function createZabbixInstance(payload: object) {
  return apiPost("/v1/zabbix/instance", payload)
}

export function updateZabbixInstance(id: string | number, payload: object) {
  return apiPut(`/v1/zabbix/instance/${id}`, payload)
}

export function deleteZabbixInstance(id: string | number) {
  return apiDelete(`/v1/zabbix/instance/${id}`)
}

export function testZabbixInstanceConfig(payload: object) {
  return apiPost("/v1/zabbix/instance/test", payload)
}

export function testZabbixInstance(id: string | number) {
  return apiPost(`/v1/zabbix/instance/${id}/test`)
}

export function setZabbixInstanceEnabled(id: string | number, enabled: boolean) {
  return apiPut(`/v1/zabbix/instance/${id}/enabled`, { enabled })
}

export function installWebhook(id: string | number) {
  return apiPost(`/v1/zabbix/instance/${id}/install-webhook`)
}

export function getWebhookInfo(id: string | number) {
  return apiGet<Record<string, unknown>>(`/v1/zabbix/instance/${id}/webhook-info`)
}

export function uninstallWebhook(id: string | number) {
  return apiDelete(`/v1/zabbix/instance/${id}/uninstall-webhook`)
}

export function getHostGroups(zid?: string | number) {
  return apiPage<Record<string, unknown>>("/v1/host_group", zid ? { zid } : undefined)
}

export function searchHosts(params: object) {
  return apiPage<Record<string, unknown>>("/v1/host/search", params)
}

export function getTemplates(zid?: string | number) {
  return apiGet<Record<string, unknown>[]>("/v1/template", zid ? { zid } : undefined)
}

export function getTemplateItems(templateId: string | number, zid?: string | number) {
  return apiGet<Record<string, unknown>[]>(`/v1/template/item/${templateId}`, zid ? { zid } : undefined)
}

export function getEventLog(id: string | number) {
  return apiGet<Record<string, unknown>[]>(`/v1/event_log/${id}`)
}

export function getHostItems(params: { hostid: string | number; zid?: string | number }) {
  return apiPage<Record<string, unknown>>("/v1/item/list", params)
}

export function getTrafficItems(params: object) {
  return apiPage<Record<string, unknown>>("/v1/item/traffic", params)
}

export function getReceiveTrafficItems(params: object) {
  return apiPage<Record<string, unknown>>("/v1/item/topotraffic", params)
}
