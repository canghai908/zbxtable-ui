import { apiGet, apiPage, apiPost, http } from "@/lib/http"

export function getHostList(params: object) {
  return apiPage<Record<string, unknown>>("/v1/host", params)
}

export function getHostDetail(id: string, zid?: string) {
  return apiGet<Record<string, unknown>>(`/v1/host/${id}`, zid ? { zid } : undefined)
}

export function getHostGraphs(id: string, payload: object) {
  return apiPost<Record<string, unknown>[]>(`/v1/host/graph/${id}`, payload)
}

export async function exportHosts(payload: object) {
  const response = await http.post("/v1/export/hosts", payload, {
    responseType: "blob",
  })
  return response.data as Blob
}

export async function exportInventory(payload: object) {
  const response = await http.post("/v1/export/inventory", payload, {
    responseType: "blob",
  })
  return response.data as Blob
}

export function updateHost(payload: object) {
  return apiPost("/v1/host", payload)
}
