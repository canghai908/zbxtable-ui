import { useMemo, useState } from "react"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  checkNowReport,
  createReport,
  deleteReport,
  deleteTaskLog,
  getHostItems,
  getReport,
  getReportList,
  getTaskLogs,
  listZabbixInstances,
  searchHosts,
  updateReport,
  updateReportStatus,
} from "@/services/resources"

type ReportForm = {
  name: string
  report_mode: "realtime" | "scheduled"
  start: string
  end: string
  cycle: string
  emails: string
  desc: string
  status: string
  report_type: string
}

type HostConfig = {
  zid: string
  host_id: string
  item_ids: string[]
}

const emptyForm: ReportForm = {
  name: "",
  report_mode: "realtime",
  start: "",
  end: "",
  cycle: "day",
  emails: "",
  desc: "",
  status: "1",
  report_type: "host",
}

const emptyHostConfig = (): HostConfig => ({
  zid: "",
  host_id: "",
  item_ids: [],
})

const formatDateTime = (value: unknown) => {
  if (!value) {
    return "-"
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleString("zh-CN")
}

export function ReportManagementPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState("")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ReportForm>(emptyForm)
  const [hostConfigs, setHostConfigs] = useState<HostConfig[]>([emptyHostConfig()])
  const [hostSearchTerms, setHostSearchTerms] = useState<string[]>([""])
  const [itemSearchTerms, setItemSearchTerms] = useState<string[]>([""])
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [logReportId, setLogReportId] = useState("")
  const [logPage, setLogPage] = useState(1)
  const [logPageSize] = useState(10)

  const reportsQuery = useQuery({
    queryKey: ["host-report", searchKeyword, page, pageSize],
    queryFn: () => getReportList({ page, limit: pageSize, name: searchKeyword, report_type: "host" }),
  })
  const instancesQuery = useQuery({ queryKey: ["zabbix-instances"], queryFn: listZabbixInstances })
  const hostOptionsQueries = useQueries({
    queries: hostConfigs.map((config, index) => ({
      queryKey: ["report-hosts", index, config.zid, hostSearchTerms[index] ?? ""],
      queryFn: () => searchHosts({ page: 1, limit: 200, zid: config.zid, name: hostSearchTerms[index] ?? "" }),
      enabled: open && !!config.zid,
    })),
  })
  const itemOptionsQueries = useQueries({
    queries: hostConfigs.map((config, index) => ({
      queryKey: ["report-items", index, config.zid, config.host_id],
      queryFn: () => getHostItems({ hostid: config.host_id, zid: config.zid }),
      enabled: open && !!config.zid && !!config.host_id,
    })),
  })
  const logsQuery = useQuery({
    queryKey: ["report-logs", logReportId, logPage, logPageSize],
    queryFn: () => getTaskLogs({ page: logPage, limit: logPageSize, report_id: logReportId }),
    enabled: !!logReportId,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) {
        throw new Error("请填写报表名称")
      }
      if (hostConfigs.some((config) => !config.zid || !config.host_id || !config.item_ids.length)) {
        throw new Error("请完整配置实例、主机和监控项")
      }
      if (form.report_mode === "realtime" && (!form.start.trim() || !form.end.trim())) {
        throw new Error("实时报表需要填写开始时间和结束时间")
      }
      if (form.report_mode === "scheduled" && !form.emails.trim()) {
        throw new Error("周期报表需要填写收件邮箱")
      }
      const payload = {
        ...form,
        host_ids: JSON.stringify(
          hostConfigs.map((config) => ({
            zid: config.zid,
            host_id: config.host_id,
            item_ids: config.item_ids,
          }))
        ),
        item_ids: JSON.stringify(hostConfigs.flatMap((config) => config.item_ids)),
      }
      if (editingId) {
        return updateReport(editingId, payload)
      }
      return createReport(payload)
    },
    onSuccess: async () => {
      toast.success("报表已保存")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setHostConfigs([emptyHostConfig()])
      setHostSearchTerms([""])
      setItemSearchTerms([""])
      await queryClient.invalidateQueries({ queryKey: ["host-report"] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "报表保存失败")
    },
  })

  const items = reportsQuery.data?.items ?? []
  const logs = logsQuery.data?.items ?? []
  const total = Number(reportsQuery.data?.total ?? 0)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const logTotal = Number(logsQuery.data?.total ?? 0)
  const logTotalPages = Math.max(Math.ceil(logTotal / logPageSize), 1)
  const instances = instancesQuery.data ?? []
  const selectedConfigCount = hostConfigs.filter((config) => config.host_id && config.item_ids.length).length

  const cycleArray = useMemo(() => form.cycle.split(",").filter(Boolean), [form.cycle])
  const filteredItemOptions = itemOptionsQueries.map((query, index) => {
    const source = (query.data?.items ?? []) as Record<string, unknown>[]
    const keyword = (itemSearchTerms[index] ?? "").trim().toLowerCase()
    if (!keyword) {
      return source
    }
    return source.filter((item) =>
      [item.name, item.key_, item.itemid].some((value) => String(value ?? "").toLowerCase().includes(keyword))
    )
  })

  const reportModeBadge = (value: unknown) => (
    <Badge variant={String(value ?? "") === "realtime" ? "secondary" : "outline"}>
      {String(value ?? "") === "realtime" ? "实时报表" : "周期报表"}
    </Badge>
  )

  const reportStatusBadge = (value: unknown) => {
    if (String(value ?? "") === "1") return <Badge variant="secondary">启用</Badge>
    if (String(value ?? "") === "0") return <Badge variant="destructive">停用</Badge>
    return <Badge variant="outline">未知</Badge>
  }

  const execStatusBadge = (value: unknown) => {
    if (String(value ?? "") === "0") return <Badge variant="outline">空闲</Badge>
    if (String(value ?? "") === "1") return <Badge>生成中</Badge>
    if (String(value ?? "") === "2") return <Badge variant="secondary">已生成</Badge>
    if (String(value ?? "") === "3") return <Badge variant="destructive">失败</Badge>
    return <Badge variant="outline">未知</Badge>
  }

  return (
    <PageLayout>
      <Alert className="border-primary/20 bg-primary/5">
        <CircleAlert data-icon="inline-start" />
        <AlertTitle>多实例报表</AlertTitle>
        <AlertDescription>一个报表任务可组合多个实例、多个主机和监控项，适合做统一汇总。</AlertDescription>
      </Alert>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setSearchKeyword(keyword)}>
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setKeyword("")
                  setSearchKeyword("")
                  setPage(1)
                }}
              >
                重置
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setHostConfigs([instances.length === 1 ? { ...emptyHostConfig(), zid: String(instances[0].id ?? "") } : emptyHostConfig()])
                  setHostSearchTerms([""])
                  setItemSearchTerms([""])
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新建报表
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="md:grid md:grid-cols-[minmax(0,1fr)]">
            <Field>
              <FieldLabel htmlFor="report-keyword">任务名称</FieldLabel>
              <Input
                id="report-keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="请输入报表任务名"
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="text-sm font-medium">报表列表</CardTitle>
              <div className="text-xs text-muted-foreground">任务、实例、执行状态与生成结果</div>
            </div>
            <Badge variant="secondary">共 {total} 个报表任务</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>模式</TableHead>
              <TableHead>实例</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>执行状态</TableHead>
              <TableHead>报表开始</TableHead>
              <TableHead>报表结束</TableHead>
              <TableHead>最近执行</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const id = String(item.id ?? "")
              const enabled = String(item.status ?? "1") === "1"
              return (
                <TableRow key={id}>
                  <TableCell>{String(item.name ?? "-")}</TableCell>
                  <TableCell>{reportModeBadge(item.report_mode)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{String(item.instance ?? "-")}</Badge>
                  </TableCell>
                  <TableCell>{reportStatusBadge(item.status)}</TableCell>
                  <TableCell>{execStatusBadge(item.exec_status)}</TableCell>
                  <TableCell>{formatDateTime(item.start)}</TableCell>
                  <TableCell>{formatDateTime(item.end)}</TableCell>
                  <TableCell>{formatDateTime(item.start_at)}</TableCell>
                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                  <TableCell className="max-w-64 truncate">{String(item.desc ?? "-")}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await checkNowReport({ id })
                          toast.success("报表生成已触发")
                          await queryClient.invalidateQueries({ queryKey: ["host-report"] })
                        }}
                      >
                        <Play data-icon="inline-start" />
                        生成
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await updateReportStatus({ id })
                          toast.success("状态已切换")
                          await queryClient.invalidateQueries({ queryKey: ["host-report"] })
                        }}
                      >
                        {enabled ? "停用" : "启用"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const detail = (await getReport(id)) as Record<string, unknown>
                          setEditingId(id)
                          setForm({
                            name: String(detail.name ?? item.name ?? ""),
                            report_mode: String(detail.report_mode ?? item.report_mode ?? "realtime") as "realtime" | "scheduled",
                            start: String(detail.start ?? item.start ?? ""),
                            end: String(detail.end ?? item.end ?? ""),
                            cycle: String(detail.cycle ?? item.cycle ?? "day"),
                            emails: String(detail.emails ?? item.emails ?? ""),
                            desc: String(detail.desc ?? item.desc ?? ""),
                            status: String(detail.status ?? item.status ?? "1"),
                            report_type: "host",
                          })
                          try {
                            const parsed = JSON.parse(String(detail.host_ids ?? item.host_ids ?? "[]")) as Array<Record<string, unknown>>
                            if (Array.isArray(parsed) && parsed.length) {
                              setHostSearchTerms(parsed.map(() => ""))
                              setItemSearchTerms(parsed.map(() => ""))
                              setHostConfigs(
                                parsed.map((config) => ({
                                  zid: String(config.zid ?? ""),
                                  host_id: String(config.host_id ?? ""),
                                  item_ids: Array.isArray(config.item_ids) ? config.item_ids.map((value) => String(value)) : [],
                                }))
                              )
                            } else {
                              setHostConfigs([emptyHostConfig()])
                              setHostSearchTerms([""])
                              setItemSearchTerms([""])
                            }
                          } catch {
                            setHostConfigs([emptyHostConfig()])
                            setHostSearchTerms([""])
                            setItemSearchTerms([""])
                          }
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
                          setLogReportId(id)
                          setLogPage(1)
                          setLogDialogOpen(true)
                        }}
                      >
                        日志
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!window.confirm("确认删除该报表吗？")) {
                            return
                          }
                          await deleteReport(id)
                          toast.success("删除成功")
                          await queryClient.invalidateQueries({ queryKey: ["host-report"] })
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
      {total > pageSize ? (
        <Pagination className="mt-4 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="上一页"
                onClick={(event) => {
                  event.preventDefault()
                  setPage((current) => Math.max(current - 1, 1))
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive onClick={(event) => event.preventDefault()}>
                {page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                text={`下一页 / ${totalPages}`}
                onClick={(event) => {
                  event.preventDefault()
                  setPage((current) => Math.min(current + 1, totalPages))
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑报表" : "新建报表"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-3">
            <FieldGroup>
              <Card className="console-panel border-0">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">基础配置</CardTitle>
                    <Badge variant="secondary">{selectedConfigCount} 组有效配置</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-3">
                  <Field>
                    <FieldLabel htmlFor="report-name">名称</FieldLabel>
                    <Input id="report-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </Field>
                  <FieldGroup className="md:grid md:grid-cols-2">
                    <Field>
                      <FieldLabel>模式</FieldLabel>
                      <Select
                        value={form.report_mode}
                        onValueChange={(value) => setForm({ ...form, report_mode: value as "realtime" | "scheduled" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="realtime">实时报表</SelectItem>
                            <SelectItem value="scheduled">周期报表</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>已选主机配置</FieldLabel>
                      <Input readOnly value={`${selectedConfigCount} 组有效配置`} />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
              <FieldGroup>
              {hostConfigs.map((config, index) => {
                const hosts = hostOptionsQueries[index]?.data?.items ?? []
                const items = filteredItemOptions[index] ?? []
                return (
                  <Card key={`host-config-${index}`} className="border-0 bg-background shadow-none ring-1 ring-border/60">
                    <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-sm font-medium">主机配置 #{index + 1}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={hostConfigs.length <= 1}
                          onClick={() => {
                            setHostConfigs((current) => current.filter((_, currentIndex) => currentIndex !== index))
                            setHostSearchTerms((current) => current.filter((_, currentIndex) => currentIndex !== index))
                            setItemSearchTerms((current) => current.filter((_, currentIndex) => currentIndex !== index))
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 p-3">
                      <FieldGroup className="md:grid md:grid-cols-3">
                        <Field>
                          <FieldLabel>实例</FieldLabel>
                          <Select
                            value={config.zid || "none"}
                            onValueChange={(value) => {
                              setHostConfigs((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index
                                    ? { zid: value === "none" ? "" : value, host_id: "", item_ids: [] }
                                    : item
                                )
                              )
                              setHostSearchTerms((current) => current.map((item, currentIndex) => (currentIndex === index ? "" : item)))
                              setItemSearchTerms((current) => current.map((item, currentIndex) => (currentIndex === index ? "" : item)))
                            }}
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
                          <FieldLabel htmlFor={`report-host-search-${index}`}>主机搜索</FieldLabel>
                          <Input
                            id={`report-host-search-${index}`}
                            value={hostSearchTerms[index] ?? ""}
                            onChange={(event) =>
                              setHostSearchTerms((current) =>
                                current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item))
                              )
                            }
                            placeholder="输入主机名筛选"
                            disabled={!config.zid}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>主机</FieldLabel>
                          <Select
                            value={config.host_id || "none"}
                            onValueChange={(value) => {
                              setHostConfigs((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index
                                    ? { ...item, host_id: value === "none" ? "" : value, item_ids: [] }
                                    : item
                                )
                              )
                              setItemSearchTerms((current) => current.map((item, currentIndex) => (currentIndex === index ? "" : item)))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={config.zid ? "请选择主机" : "请先选择实例"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="none">请选择主机</SelectItem>
                                {hosts.map((item) => (
                                  <SelectItem key={String(item.hostid ?? item.host_id)} value={String(item.hostid ?? item.host_id)}>
                                    {String(item.name ?? item.hostid ?? "-")}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      </FieldGroup>
                      <FieldGroup className="md:grid md:grid-cols-2">
                      <Field>
                          <FieldLabel htmlFor={`report-items-${index}`}>监控项 IDs</FieldLabel>
                          <Input
                            id={`report-items-${index}`}
                            value={config.item_ids.join(",")}
                            onChange={(event) =>
                              setHostConfigs((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                        ...item,
                                        item_ids: event.target.value
                                          .split(",")
                                          .map((value) => value.trim())
                                          .filter(Boolean),
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder="多个 itemid 用逗号分隔"
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`report-items-search-${index}`}>监控项搜索</FieldLabel>
                          <Input
                            id={`report-items-search-${index}`}
                            value={itemSearchTerms[index] ?? ""}
                            onChange={(event) =>
                              setItemSearchTerms((current) =>
                                current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item))
                              )
                            }
                            placeholder="输入名称、key 或 itemid 筛选"
                            disabled={!config.host_id}
                          />
                        </Field>
                      </FieldGroup>
                      <Field>
                        <FieldLabel>可选监控项</FieldLabel>
                        {items.length ? (
                          <ScrollArea className="h-56 rounded-lg border bg-muted/10 p-3">
                            <div className="flex flex-col gap-2">
                              {items.slice(0, 50).map((item) => {
                                const itemId = String(item.itemid ?? "")
                                const checked = config.item_ids.includes(itemId)
                                return (
                                  <Field key={itemId} orientation="horizontal" className="rounded-lg border bg-background p-3">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) =>
                                        setHostConfigs((current) =>
                                          current.map((currentConfig, currentIndex) =>
                                            currentIndex === index
                                              ? {
                                                  ...currentConfig,
                                                  item_ids: nextChecked === true
                                                    ? [...new Set([...currentConfig.item_ids, itemId])]
                                                    : currentConfig.item_ids.filter((value) => value !== itemId),
                                                }
                                              : currentConfig
                                          )
                                        )
                                      }
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-medium">{String(item.name ?? item.key_ ?? itemId)}</div>
                                      <div className="truncate text-xs text-muted-foreground">{itemId}</div>
                                    </div>
                                  </Field>
                                )
                              })}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                            {config.host_id ? "当前主机暂无可用监控项，或尚未返回监控项列表。" : "请先选择主机。"}
                          </div>
                        )}
                      </Field>
                    </CardContent>
                  </Card>
                )
              })}
                <Button
                  variant="outline"
                  onClick={() => {
                    setHostConfigs((current) => [
                      ...current,
                      instances.length === 1 ? { ...emptyHostConfig(), zid: String(instances[0].id ?? "") } : emptyHostConfig(),
                    ])
                    setHostSearchTerms((current) => [...current, ""])
                    setItemSearchTerms((current) => [...current, ""])
                  }}
                >
                  新增主机配置
                </Button>
              </FieldGroup>
              <Card className="console-panel border-0">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <CardTitle className="text-sm font-medium">{form.report_mode === "realtime" ? "时间范围" : "调度配置"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-3">
                  {form.report_mode === "realtime" ? (
                    <FieldGroup className="md:grid md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="report-start">开始时间</FieldLabel>
                        <Input
                          id="report-start"
                          value={form.start}
                          onChange={(event) => setForm({ ...form, start: event.target.value })}
                          placeholder="YYYY-MM-DD HH:mm:ss"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="report-end">结束时间</FieldLabel>
                        <Input
                          id="report-end"
                          value={form.end}
                          onChange={(event) => setForm({ ...form, end: event.target.value })}
                          placeholder="YYYY-MM-DD HH:mm:ss"
                        />
                      </Field>
                    </FieldGroup>
                  ) : (
                    <FieldGroup className="md:grid md:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="report-cycle">周期</FieldLabel>
                        <Select
                          value={cycleArray.length > 1 ? "day,week" : cycleArray[0] || "day"}
                          onValueChange={(value) => setForm({ ...form, cycle: value === "day,week" ? "day,week" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="day">日报</SelectItem>
                              <SelectItem value="week">周报</SelectItem>
                              <SelectItem value="day,week">日报 + 周报</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="report-emails">收件邮箱</FieldLabel>
                        <Input
                          id="report-emails"
                          value={form.emails}
                          onChange={(event) => setForm({ ...form, emails: event.target.value })}
                          placeholder="多个邮箱用逗号分隔"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="report-status">状态</FieldLabel>
                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="1">启用</SelectItem>
                              <SelectItem value="0">停用</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                  )}
                  <Field>
                    <FieldLabel htmlFor="report-desc">备注</FieldLabel>
                    <Textarea id="report-desc" rows={5} value={form.desc} onChange={(event) => setForm({ ...form, desc: event.target.value })} />
                  </Field>
                </CardContent>
              </Card>
            </FieldGroup>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={logDialogOpen}
        onOpenChange={(openState) => {
          setLogDialogOpen(openState)
          if (!openState) {
            setLogReportId("")
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>任务日志</DialogTitle>
          </DialogHeader>
          <Card className="console-panel border-0">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">日志列表</CardTitle>
                <Badge variant="secondary">{logTotal} 条</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>周期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>结束时间</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>文件</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((item) => (
                      <TableRow key={String(item.id)}>
                        <TableCell>{String(item.cycle ?? "-") === "day" ? "日报" : String(item.cycle ?? "-") === "week" ? "周报" : String(item.cycle ?? "-")}</TableCell>
                        <TableCell>{execStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatDateTime(item.start_time)}</TableCell>
                        <TableCell>{formatDateTime(item.end_time)}</TableCell>
                        <TableCell>{item.total_time ? `${String(item.total_time)}s` : "-"}</TableCell>
                        <TableCell className="max-w-80 truncate">{String(item.result ?? "-")}</TableCell>
                        <TableCell className="max-w-60 truncate">
                          {item.files ? (
                            <a href={`/download/${String(item.files)}`} target="_blank" rel="noreferrer">
                              {String(item.files)}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await deleteTaskLog(String(item.id))
                              toast.success("日志已删除")
                              await queryClient.invalidateQueries({ queryKey: ["report-logs", logReportId] })
                            }}
                          >
                            删除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
          {logTotal > logPageSize ? (
            <Pagination className="mt-4 justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text="上一页"
                    onClick={(event) => {
                      event.preventDefault()
                      setLogPage((current) => Math.max(current - 1, 1))
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive onClick={(event) => event.preventDefault()}>
                    {logPage}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text={`下一页 / ${logTotalPages}`}
                    onClick={(event) => {
                      event.preventDefault()
                      setLogPage((current) => Math.min(current + 1, logTotalPages))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
