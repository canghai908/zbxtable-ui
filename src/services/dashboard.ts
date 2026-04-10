import { apiGet } from "@/lib/http"

export function getBaseInfo() {
  return apiGet<Record<string, number>>("/v1/index/baseinfo")
}

export function getTriggerList() {
  return apiGet<{ items?: unknown[]; total?: number }>("/v1/trigger")
}

export function getResourceTop(hostType: string, metricsType: string, topNum?: number) {
  return apiGet<unknown[]>("/v1/index/restop", {
    host_type: hostType,
    metrics_type: metricsType,
    top_num: topNum,
  })
}

export function getOverview() {
  return apiGet<Record<string, unknown>>("/v1/index/overview")
}

export function getInventory() {
  return apiGet<Record<string, unknown>>("/v1/index/inventory")
}

export function getEgress() {
  return apiGet<unknown[]>("/v1/index/egress")
}
