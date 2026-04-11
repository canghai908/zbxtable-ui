import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { History, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  createMetricMapping,
  deleteMetricMapping,
  executeMetricMapping,
  getHostGroups,
  getMetricMapping,
  getMetricMappingHistory,
  getMetricMappings,
  listZabbixInstances,
  updateMetricMapping,
} from "@/services/resources"

type MappingForm = {
  zid: string
  system_type: string
  host_group_ids: string[]
  metric_config: string
  auto_init: boolean
  init_cron: string
  init_on_new_host: boolean
  max_retry: string
}

type MetricConfig = {
  host_type?: string
  ping_template_id?: string
  metrics?: Record<string, string>
}

const systemTypes = [
  { value: "linux", label: "Linux", hostType: "VM_LIN" },
  { value: "windows", label: "Windows", hostType: "VM_WIN" },
  { value: "network", label: "网络设备", hostType: "HW_NET" },
  { value: "server", label: "物理服务器", hostType: "HW_SRV" },
]

const metricLabels: Record<string, string> = {
  uptime: "运行时间",
  cpu_core: "CPU 核数",
  cpu_utilization: "CPU 使用率",
  memory_utilization: "内存使用率",
  memory_total: "内存总量",
  memory_used: "内存已用",
  model: "设备型号",
}

const emptyMapping: MappingForm = {
  zid: "",
  system_type: "linux",
  host_group_ids: [],
  metric_config: JSON.stringify({ host_type: "VM_LIN", metrics: {}, ping_template_id: "" }, null, 2),
  auto_init: false,
  init_cron: "0 0 2 * * *",
  init_on_new_host: false,
  max_retry: "3",
}

function parseMetricConfig(value: string): MetricConfig {
  try {
    const parsed = JSON.parse(value || "{}") as MetricConfig
    return {
      ...parsed,
      metrics: parsed.metrics ?? {},
    }
  } catch {
    return { metrics: {} }
  }
}

function formatMetricConfig(config: MetricConfig) {
  return JSON.stringify(
    {
      host_type: config.host_type ?? "",
      metrics: config.metrics ?? {},
      ping_template_id: config.ping_template_id ?? "",
    },
    null,
    2
  )
}

function toMetricConfig(systemType: string, currentValue: string) {
  const current = parseMetricConfig(currentValue)
  return {
    ...current,
    host_type: systemTypes.find((item) => item.value === systemType)?.hostType ?? "VM_LIN",
    metrics: current.metrics ?? {},
  }
}

function statusBadge(status: unknown) {
  const value = Number(status ?? 0)
  if (value === 1) return <Badge>运行中</Badge>
  if (value === 2) return <Badge variant="secondary">成功</Badge>
  if (value === 3) return <Badge variant="destructive">失败</Badge>
  return <Badge variant="outline">未初始化</Badge>
}

export function MetricMappingPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [form, setForm] = useState<MappingForm>(emptyMapping)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTarget, setHistoryTarget] = useState("")

  const mappingsQuery = useQuery({ queryKey: ["metric-mapping"], queryFn: () => getMetricMappings({ page: 1, limit: 100 }) })
  const instancesQuery = useQuery({ queryKey: ["zabbix-instances"], queryFn: listZabbixInstances })
  const groupsQuery = useQuery({
    queryKey: ["host-groups", form.zid],
    queryFn: () => getHostGroups(form.zid || undefined),
    enabled: open && !!form.zid,
  })
  const historyQuery = useQuery({
    queryKey: ["mapping-history", historyTarget],
    queryFn: () => getMetricMappingHistory({ mapping_id: historyTarget, page: 1, limit: 50 }),
    enabled: !!historyTarget,
  })

  const metricConfig = useMemo(() => parseMetricConfig(form.metric_config), [form.metric_config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        zid: form.zid,
        system_type: form.system_type,
        host_group_ids: form.host_group_ids.join(","),
        metric_config: form.metric_config,
        auto_init: form.auto_init ? 1 : 0,
        init_cron: form.init_cron,
        init_on_new_host: form.init_on_new_host ? 1 : 0,
        max_retry: Number(form.max_retry),
      }
      if (editingId) {
        return updateMetricMapping(editingId, payload)
      }
      return createMetricMapping(payload)
    },
    onSuccess: async () => {
      toast.success("指标映射已保存")
      setOpen(false)
      setEditingId(null)
      setForm(emptyMapping)
      await queryClient.invalidateQueries({ queryKey: ["metric-mapping"] })
    },
  })

  const items = mappingsQuery.data?.items ?? []
  const historyItems = historyQuery.data?.items ?? []
  const instances = instancesQuery.data ?? []
  const groups = groupsQuery.data?.items ?? []

  const getInstanceName = (zid: unknown) =>
    String(instances.find((item) => String(item.id) === String(zid))?.name ?? zid ?? "-")

  const selectedMetricKeys = form.system_type === "linux" || form.system_type === "windows"
    ? ["uptime", "cpu_core", "cpu_utilization", "memory_utilization", "memory_total", "memory_used"]
    : ["uptime", "cpu_utilization", "memory_utilization", "memory_total", "memory_used", "model"]

  const updateMetricValue = (key: string, value: string) => {
    const nextConfig = {
      ...metricConfig,
      metrics: {
        ...(metricConfig.metrics ?? {}),
        [key]: value,
      },
    }
    setForm((current) => ({ ...current, metric_config: formatMetricConfig(nextConfig) }))
  }

  const toggleGroup = (groupid: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      host_group_ids: checked
        ? [...new Set([...current.host_group_ids, groupid])]
        : current.host_group_ids.filter((item) => item !== groupid),
    }))
  }

  return (
    <PageLayout>
      {items.length ? (
        <Card className="console-panel border-0">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="text-sm font-medium">映射列表</CardTitle>
                <div className="text-xs text-muted-foreground">实例、主机组、指标字段与初始化状态</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">共 {items.length} 条映射</Badge>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyMapping)
                    setOpen(true)
                  }}
                >
                  <Plus data-icon="inline-start" />
                  新建映射
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-w-full">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>实例</TableHead>
                <TableHead>系统类型</TableHead>
                <TableHead>主机组</TableHead>
                <TableHead>指标字段</TableHead>
                <TableHead>自动初始化</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近成功</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const id = String(item.id)
                const config = parseMetricConfig(String(item.metric_config ?? "{}"))
                const metricCount = Object.values(config.metrics ?? {}).filter(Boolean).length
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Badge variant="outline">{getInstanceName(item.zid)}</Badge>
                    </TableCell>
                    <TableCell>{systemTypes.find((type) => type.value === item.system_type)?.label ?? String(item.system_type ?? "-")}</TableCell>
                    <TableCell className="max-w-64 truncate">{String(item.host_group_ids ?? "-")}</TableCell>
                    <TableCell>{metricCount} 项</TableCell>
                    <TableCell>{Number(item.auto_init ?? 0) === 1 ? <Badge>已开启</Badge> : <Badge variant="outline">未开启</Badge>}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell>{item.last_success_at ? new Date(String(item.last_success_at)).toLocaleString("zh-CN") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await executeMetricMapping(id)
                            toast.success("初始化任务已提交")
                          }}
                        >
                          <Play data-icon="inline-start" />
                          执行
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const detail = (await getMetricMapping(id)) as Record<string, unknown>
                            setEditingId(id)
                            setForm({
                              zid: String(detail.zid ?? item.zid ?? ""),
                              system_type: String(detail.system_type ?? item.system_type ?? "linux"),
                              host_group_ids: String(detail.host_group_ids ?? item.host_group_ids ?? "").split(",").filter(Boolean),
                              metric_config: String(detail.metric_config ?? item.metric_config ?? "{}"),
                              auto_init: Number(detail.auto_init ?? item.auto_init ?? 0) === 1,
                              init_cron: String(detail.init_cron ?? item.init_cron ?? "0 0 2 * * *"),
                              init_on_new_host: Number(detail.init_on_new_host ?? item.init_on_new_host ?? 0) === 1,
                              max_retry: String(detail.max_retry ?? item.max_retry ?? "3"),
                            })
                            setOpen(true)
                          }}
                        >
                          <Pencil data-icon="inline-start" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHistoryTarget(id)
                            setHistoryOpen(true)
                          }}
                        >
                          <History data-icon="inline-start" />
                          历史
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!window.confirm("确认删除该指标映射吗？")) {
                              return
                            }
                            await deleteMetricMapping(id)
                            toast.success("删除成功")
                            await queryClient.invalidateQueries({ queryKey: ["metric-mapping"] })
                          }}
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>暂无指标映射</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null)
                setForm(emptyMapping)
                setOpen(true)
              }}
            >
              <Plus data-icon="inline-start" />
              新建映射
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑指标映射" : "新建指标映射"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-3">
            <FieldGroup>
              <Card className="console-panel border-0">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">基础配置</CardTitle>
                    <Badge variant="secondary">{editingId ? "编辑中" : "新建中"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-3">
                  <FieldGroup className="md:grid md:grid-cols-2">
                    <Field>
                      <FieldLabel>实例</FieldLabel>
                      <Select
                        value={form.zid || "none"}
                        onValueChange={(value) =>
                          setForm({
                            ...form,
                            zid: value === "none" ? "" : value,
                            host_group_ids: [],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择实例" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">请选择实例</SelectItem>
                            {instances.map((item) => (
                              <SelectItem key={String(item.id)} value={String(item.id)}>
                                {String(item.name ?? item.instance ?? item.id)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>系统类型</FieldLabel>
                      <Select
                        value={form.system_type}
                        onValueChange={(value) => {
                          const nextConfig = toMetricConfig(value, form.metric_config)
                          setForm({ ...form, system_type: value, metric_config: formatMetricConfig(nextConfig) })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {systemTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>

                  <Field>
                    <FieldLabel>主机组</FieldLabel>
                    {form.zid ? (
                      groups.length ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {groups.map((group) => {
                            const groupid = String(group.groupid ?? group.id ?? "")
                            return (
                              <Field key={groupid} orientation="horizontal" className="rounded-lg border bg-muted/10 p-3">
                                <Checkbox
                                  checked={form.host_group_ids.includes(groupid)}
                                  onCheckedChange={(checked) => toggleGroup(groupid, checked === true)}
                                />
                                <FieldLabel className="min-w-0 truncate">{String(group.name ?? groupid)}</FieldLabel>
                              </Field>
                            )
                          })}
                        </div>
                      ) : (
                        <Card className="border-0 bg-muted/10 shadow-none ring-1 ring-border/60">
                          <CardContent className="p-3 text-sm text-muted-foreground">当前实例暂无主机组</CardContent>
                        </Card>
                      )
                    ) : (
                      <Card className="border-0 bg-muted/10 shadow-none ring-1 ring-border/60">
                        <CardContent className="p-3 text-sm text-muted-foreground">请先选择实例</CardContent>
                      </Card>
                    )}
                  </Field>
                </CardContent>
              </Card>

              <FieldSeparator>指标字段</FieldSeparator>

              <Card className="console-panel border-0">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <CardTitle className="text-sm font-medium">字段映射</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-3">
                  <Field>
                    <FieldLabel htmlFor="mapping-ping-template">ICMP 模板 ID</FieldLabel>
                    <Input
                      id="mapping-ping-template"
                      value={metricConfig.ping_template_id ?? ""}
                      onChange={(event) => setForm({ ...form, metric_config: formatMetricConfig({ ...metricConfig, ping_template_id: event.target.value }) })}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedMetricKeys.map((key) => (
                      <Field key={key}>
                        <FieldLabel htmlFor={`metric-${key}`}>{metricLabels[key] ?? key}</FieldLabel>
                        <Input
                          id={`metric-${key}`}
                          value={metricConfig.metrics?.[key] ?? ""}
                          placeholder="itemid 或逗号分隔 itemid"
                          onChange={(event) => updateMetricValue(key, event.target.value)}
                        />
                      </Field>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <FieldSeparator>自动化</FieldSeparator>

              <Card className="console-panel border-0">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <CardTitle className="text-sm font-medium">自动化</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-3">
                  <FieldGroup className="md:grid md:grid-cols-2">
                    <Field orientation="horizontal">
                      <FieldLabel htmlFor="mapping-auto-init">自动初始化</FieldLabel>
                      <Switch id="mapping-auto-init" checked={form.auto_init} onCheckedChange={(checked) => setForm({ ...form, auto_init: checked })} />
                    </Field>
                    <Field orientation="horizontal">
                      <FieldLabel htmlFor="mapping-new-host">新主机自动初始化</FieldLabel>
                      <Switch id="mapping-new-host" checked={form.init_on_new_host} onCheckedChange={(checked) => setForm({ ...form, init_on_new_host: checked })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="mapping-cron">Cron</FieldLabel>
                      <Input id="mapping-cron" value={form.init_cron} onChange={(event) => setForm({ ...form, init_cron: event.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="mapping-max-retry">最大重试</FieldLabel>
                      <Input id="mapping-max-retry" type="number" min={0} max={10} value={form.max_retry} onChange={(event) => setForm({ ...form, max_retry: event.target.value })} />
                    </Field>
                  </FieldGroup>

                  <Field>
                    <FieldLabel htmlFor="mapping-config-json">原始 JSON</FieldLabel>
                    <Textarea
                      id="mapping-config-json"
                      rows={8}
                      value={form.metric_config}
                      onChange={(event) => setForm({ ...form, metric_config: event.target.value })}
                    />
                  </Field>
                </CardContent>
              </Card>
            </FieldGroup>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => saveMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>执行历史</DialogTitle>
          </DialogHeader>
          <Card className="console-panel border-0">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">历史记录</CardTitle>
                <Badge variant="secondary">{historyItems.length} 条</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>结束时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>影响主机</TableHead>
                      <TableHead>消息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((item) => (
                      <TableRow key={String(item.id)}>
                        <TableCell>{String(item.exec_type ?? "-")}</TableCell>
                        <TableCell>{item.start_time ? new Date(String(item.start_time)).toLocaleString("zh-CN") : "-"}</TableCell>
                        <TableCell>{item.end_time ? new Date(String(item.end_time)).toLocaleString("zh-CN") : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={String(item.status ?? "") === "success" ? "secondary" : "outline"}>{String(item.status ?? "-")}</Badge>
                        </TableCell>
                        <TableCell>{String(item.affected_hosts ?? "0")}</TableCell>
                        <TableCell className="max-w-96 truncate">{String(item.error_message ?? item.detail_log ?? "-")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
