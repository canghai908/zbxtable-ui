import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, FileDown, History, ShieldOff } from "lucide-react"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { analyzeAlarm, createRule, getAlarmList, getEventLog, listZabbixInstances } from "@/services/resources"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Textarea } from "@/components/ui/textarea"
import { http } from "@/lib/http"
import { toast } from "sonner"

const statusOptions = [
  { value: "", label: "全部" },
  { value: "1", label: "告警中" },
  { value: "0", label: "已恢复" },
]

const levelOptions = [
  { value: "", label: "全部" },
  { value: "0", label: "未分类" },
  { value: "1", label: "信息" },
  { value: "2", label: "警告" },
  { value: "3", label: "一般" },
  { value: "4", label: "严重" },
  { value: "5", label: "灾难" },
]

const notifyStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "0": { label: "已通知", variant: "secondary" },
  "1": { label: "已静默", variant: "outline" },
  "2": { label: "默认规则", variant: "default" },
}

const channelMap: Record<string, string> = {
  mail: "邮件",
  wechat: "企业微信",
  wechat_robot: "企业微信机器人",
  dingding: "钉钉",
  sms: "短信",
  webhook: "Webhook",
}

function formatDateTimeLocal(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

function toRequestDateTime(value: string) {
  if (!value) {
    return ""
  }
  return `${value.replace("T", " ")}:00`
}

function levelBadge(level: unknown) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "0": { label: "未分类", variant: "outline" },
    "1": { label: "信息", variant: "secondary" },
    "2": { label: "警告", variant: "default" },
    "3": { label: "一般", variant: "default" },
    "4": { label: "严重", variant: "destructive" },
    "5": { label: "灾难", variant: "destructive" },
  }
  const meta = map[String(level ?? "")] ?? { label: String(level ?? "-"), variant: "outline" as const }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

function statusBadge(status: unknown) {
  if (String(status ?? "") === "1") {
    return <Badge variant="destructive">告警中</Badge>
  }
  if (String(status ?? "") === "0") {
    return <Badge variant="secondary">已恢复</Badge>
  }
  return <Badge variant="outline">{String(status ?? "-")}</Badge>
}

export function AlarmQueryPage() {
  const queryClient = useQueryClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [hosts, setHosts] = useState("")
  const [hostIp, setHostIp] = useState("")
  const [selectedInstance, setSelectedInstance] = useState("all")
  const [status, setStatus] = useState("")
  const [level, setLevel] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [beginTime, setBeginTime] = useState(formatDateTimeLocal(weekAgo))
  const [endTime, setEndTime] = useState(formatDateTimeLocal(now))
  const [aiOpen, setAiOpen] = useState(false)
  const [chat, setChat] = useState("")
  const [eventOpen, setEventOpen] = useState(false)
  const [eventAlarm, setEventAlarm] = useState<Record<string, unknown> | null>(null)
  const [eventCache, setEventCache] = useState<Record<string, Record<string, unknown>[]>>({})
  const [muteOpen, setMuteOpen] = useState(false)
  const [muteAlarm, setMuteAlarm] = useState<Record<string, unknown> | null>(null)
  const [muteName, setMuteName] = useState("")
  const [muteNote, setMuteNote] = useState("")
  const [muteStart, setMuteStart] = useState("")
  const [muteEnd, setMuteEnd] = useState("")

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      hosts,
      host_ip: hostIp,
      zid: selectedInstance === "all" ? "" : selectedInstance,
      status,
      level,
      begin: toRequestDateTime(beginTime),
      end: toRequestDateTime(endTime),
      order: "desc",
      order_by: "id",
    }),
    [beginTime, endTime, hostIp, hosts, level, page, pageSize, selectedInstance, status]
  )

  const alarmsQuery = useQuery({
    queryKey: ["alarm-query", params],
    queryFn: () => getAlarmList(params),
  })
  const instancesQuery = useQuery({
    queryKey: ["zabbix-instances"],
    queryFn: listZabbixInstances,
  })
  const analysisMutation = useMutation({
    mutationFn: (payload: object) => analyzeAlarm(payload),
    onSuccess: (data) => {
      setChat(JSON.stringify(data, null, 2))
    },
  })
  const eventQuery = useQuery({
    queryKey: ["alarm-event-log", eventAlarm?.id],
    queryFn: () => getEventLog(String(eventAlarm?.id ?? "")),
    enabled: !!eventAlarm?.id,
    staleTime: 60_000,
  })
  const muteMutation = useMutation({
    mutationFn: async () =>
      createRule({
        name: muteName,
        z_ids: String(muteAlarm?.zid ?? ""),
        conditions: JSON.stringify([
          { r_type: "host", r_func: "==", r_value: String(muteAlarm?.hostname ?? "") },
          { r_type: "message", r_func: "like", r_value: String(muteAlarm?.message ?? "") },
        ]),
        s_week: "0,1,2,3,4,5,6",
        s_time: muteStart,
        e_time: muteEnd,
        channel: "mail,wechat,dingtalk,webhook",
        user_ids: "",
        group_ids: "",
        note: muteNote,
        status: "0",
        m_type: "3",
      }),
    onSuccess: async () => {
      toast.success("屏蔽规则已创建")
      setMuteOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["rules"] })
    },
  })

  const exportCsv = async () => {
    const response = await http.post("/v1/alarm/export", params, { responseType: "blob" })
    const blob = new Blob([response.data])
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "alarm-export.xlsx"
    link.click()
    URL.revokeObjectURL(url)
  }

  const items = alarmsQuery.data?.items ?? []
  const total = Number(alarmsQuery.data?.total ?? 0)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const eventItems = (eventAlarm?.id ? eventCache[String(eventAlarm.id)] : undefined) ?? (eventQuery.data ?? [])
  const instanceMap = useMemo(
    () =>
      Object.fromEntries(
        ((instancesQuery.data ?? []) as Record<string, unknown>[]).map((item) => [String(item.id ?? ""), String(item.name ?? item.instance ?? item.id ?? "")])
      ),
    [instancesQuery.data]
  )

  const formatChannel = (value: unknown) => {
    const key = String(value ?? "").trim().toLowerCase()
    return channelMap[key] ?? String(value ?? "-")
  }

  const openEventDetail = (item: Record<string, unknown>) => {
    setEventAlarm(item)
    setEventOpen(true)
    const cacheKey = String(item.id ?? "")
    if (!eventCache[cacheKey]) {
      void getEventLog(cacheKey).then((data) => {
        setEventCache((current) => ({ ...current, [cacheKey]: data }))
      })
    }
  }

  return (
    <PageLayout>
      <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void alarmsQuery.refetch()}>
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHosts("")
                  setHostIp("")
                  setSelectedInstance("all")
                  setStatus("")
                  setLevel("")
                  setPage(1)
                  setBeginTime(formatDateTimeLocal(weekAgo))
                  setEndTime(formatDateTimeLocal(new Date()))
                }}
              >
                重置
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportCsv()}>
                <FileDown data-icon="inline-start" />
                导出
              </Button>
              <Badge variant="outline">共 {total} 条</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="xl:grid xl:grid-cols-7">
            <Field>
              <FieldLabel htmlFor="alarm-host">主机名</FieldLabel>
              <Input id="alarm-host" value={hosts} onChange={(event) => setHosts(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="alarm-ip">IP</FieldLabel>
              <Input id="alarm-ip" value={hostIp} onChange={(event) => setHostIp(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>实例</FieldLabel>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="全部实例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部实例</SelectItem>
                    {(instancesQuery.data ?? []).map((item) => (
                      <SelectItem key={String(item.id)} value={String(item.id)}>
                        {String(item.name ?? item.instance ?? item.id)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="alarm-begin">开始时间</FieldLabel>
              <Input id="alarm-begin" type="datetime-local" value={beginTime} onChange={(event) => setBeginTime(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="alarm-end">结束时间</FieldLabel>
              <Input id="alarm-end" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>状态</FieldLabel>
              <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.value || "all"} value={item.value || "all"}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>等级</FieldLabel>
              <Select value={level || "all"} onValueChange={(value) => setLevel(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {levelOptions.map((item) => (
                      <SelectItem key={item.value || "all"} value={item.value || "all"}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">告警列表</CardTitle>
            <Badge variant="outline">共 {total} 条</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
      <ScrollArea className="max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>实例</TableHead>
              <TableHead>主机</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>详情</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>触发时间</TableHead>
              <TableHead>通知状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={String(item.id)}>
                <TableCell>
                  <Badge variant="outline">{String(item.instance_name ?? instanceMap[String(item.zid ?? "")] ?? item.zid ?? "-")}</Badge>
                </TableCell>
                <TableCell>{String(item.hostname ?? "-")}</TableCell>
                <TableCell>{String(item.host_ip ?? "-")}</TableCell>
                <TableCell className="max-w-80 truncate">{String(item.message ?? "-")}</TableCell>
                <TableCell className="max-w-80 truncate">{String(item.detail ?? "-")}</TableCell>
                <TableCell>{statusBadge(item.status)}</TableCell>
                <TableCell>{levelBadge(item.level)}</TableCell>
                <TableCell>{String(item.occur_time ? formatDateTimeLocal(new Date(String(item.occur_time).replace(" ", "T"))) : item.created ?? "-")}</TableCell>
                <TableCell>
                  <Badge variant={notifyStatusMap[String(item.notify_status ?? "")]?.variant ?? "outline"}>
                    {notifyStatusMap[String(item.notify_status ?? "")]?.label ?? String(item.notify_status ?? "-")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={String(item.notify_status ?? "") === "1"}
                      onClick={() => {
                        setMuteAlarm(item)
                        setMuteName(`屏蔽-${String(item.hostname ?? "host")}-${Date.now()}`)
                        setMuteNote(String(item.message ?? ""))
                        const now = new Date()
                        const later = new Date(now.getTime() + 60 * 60 * 1000)
                        setMuteStart(now.toISOString().slice(0, 19).replace("T", " "))
                        setMuteEnd(later.toISOString().slice(0, 19).replace("T", " "))
                        setMuteOpen(true)
                      }}
                    >
                      <ShieldOff data-icon="inline-start" />
                      屏蔽
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEventDetail(item)}
                    >
                      <History data-icon="inline-start" />
                      事件
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAiOpen(true)
                        setEventAlarm(item)
                        setChat("")
                        analysisMutation.mutate(item)
                      }}
                    >
                      <Bot data-icon="inline-start" />
                      AI 分析
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI 告警分析</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {eventAlarm ? (
              <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <CardTitle className="text-sm font-medium">当前告警</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 p-3 text-sm">
                  <div>主机：{String(eventAlarm.hostname ?? "-")}</div>
                  <div>实例：{String(eventAlarm.instance_name ?? instanceMap[String(eventAlarm.zid ?? "")] ?? eventAlarm.zid ?? "-")}</div>
                  <div className="break-all">内容：{String(eventAlarm.message ?? "-")}</div>
                  <div className="break-all">详情：{String(eventAlarm.detail ?? "-")}</div>
                </CardContent>
              </Card>
            ) : null}
            <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
              <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                <CardTitle className="text-sm font-medium">分析结果</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <Textarea
                  readOnly
                  rows={16}
                  value={chat || (analysisMutation.isPending ? "正在分析中..." : "暂无分析结果")}
                />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>事件日志</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {eventAlarm ? (
              <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
                <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">当前告警</CardTitle>
                    {statusBadge(eventAlarm.status)}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 p-3 text-sm">
                  <div>主机：{String(eventAlarm.hostname ?? "-")}</div>
                  <div>实例：{String(eventAlarm.instance_name ?? eventAlarm.zid ?? "-")}</div>
                  <div className="break-all">内容：{String(eventAlarm.message ?? "-")}</div>
                </CardContent>
              </Card>
            ) : null}
            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-col gap-3">
                {eventItems.map((item, index) => (
                  <Card key={String(item.id ?? index)} className="border-0 bg-background shadow-none ring-1 ring-border/60">
                    <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <CardTitle className="text-sm font-medium">{String(item.rule ?? "通知规则")}</CardTitle>
                          <div className="text-xs text-muted-foreground">{String(item.notify_time ?? "-")}</div>
                        </div>
                        <Badge variant={String(item.status ?? "") === "0" ? "secondary" : String(item.status ?? "") === "1" ? "destructive" : "outline"}>
                          {String(item.status ?? "") === "0" ? "投递成功" : String(item.status ?? "") === "1" ? "投递失败" : String(item.status ?? "-")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 p-3 text-sm">
                      <div>接收人：{String(item.user ?? "-")}</div>
                      <div>账号：{String(item.account ?? "-")}</div>
                      <div>通道：{formatChannel(item.channel)}</div>
                      <div className="break-all">通知内容：{String(item.notify_content ?? item.result ?? "-")}</div>
                      <div className="break-all">错误信息：{String(item.notify_error ?? "-")}</div>
                    </CardContent>
                  </Card>
                ))}
                {!eventItems.length && !eventQuery.isPending ? (
                  <Card className="border-0 bg-muted/10 shadow-none ring-1 ring-border/60">
                    <CardContent className="p-3 text-sm text-muted-foreground">暂无通知记录</CardContent>
                  </Card>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={muteOpen} onOpenChange={setMuteOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>快捷创建屏蔽规则</DialogTitle>
          </DialogHeader>
          <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="mute-name">规则名称</FieldLabel>
                  <Input id="mute-name" value={muteName} onChange={(event) => setMuteName(event.target.value)} />
                </Field>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="mute-start">开始时间</FieldLabel>
                    <Input id="mute-start" value={muteStart} onChange={(event) => setMuteStart(event.target.value)} placeholder="YYYY-MM-DD HH:mm:ss" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="mute-end">结束时间</FieldLabel>
                    <Input id="mute-end" value={muteEnd} onChange={(event) => setMuteEnd(event.target.value)} placeholder="YYYY-MM-DD HH:mm:ss" />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel htmlFor="mute-note">备注</FieldLabel>
                  <Textarea id="mute-note" rows={4} value={muteNote} onChange={(event) => setMuteNote(event.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMuteOpen(false)}>取消</Button>
            <Button onClick={() => muteMutation.mutate()}>创建屏蔽</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
