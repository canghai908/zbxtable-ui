import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { FileDown, Pencil, Save, Server, SquareTerminal, Waypoints, X } from "lucide-react"
import { saveAs } from "file-saver"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getInventory, getOverview } from "@/services/dashboard"
import { exportInventory, getHostList, updateHost } from "@/services/hosts"

type SummaryPageProps = {
  mode: "inventory" | "overview"
}

type InventoryNode = {
  id: number
  name: string
  children?: InventoryNode[]
}

type HostRecord = Record<string, unknown>

const inventoryCategories = [
  { id: 10, name: "Linux操作系统", hostType: "VM_LIN", icon: SquareTerminal },
  { id: 11, name: "Windows操作系统", hostType: "VM_WIN", icon: SquareTerminal },
  { id: 12, name: "网络设备", hostType: "HW_NET", icon: Waypoints },
  { id: 13, name: "物理服务器", hostType: "HW_SRV", icon: Server },
] as const

const formatCount = (value: number) => `${value} 台`

const availabilityText: Record<string, string> = {
  "0": "未知",
  "1": "可用",
  "2": "不可用",
}

function getStatusMeta(item: HostRecord) {
  const available = String(item.available ?? "")
  const alarm = Number(item.alarm ?? 0)
  if (available === "1" && alarm === 0) {
    return { label: "健康", variant: "secondary" as const, dotClass: "bg-primary" }
  }
  if (available === "1" && alarm > 0) {
    return { label: "告警", variant: "default" as const, dotClass: "bg-primary" }
  }
  if (available === "2") {
    return { label: "不可用", variant: "destructive" as const, dotClass: "bg-destructive" }
  }
  return { label: "未知", variant: "outline" as const, dotClass: "bg-muted-foreground" }
}

function InventoryView() {
  const inventoryTreeQuery = useQuery({ queryKey: ["inventory-tree"], queryFn: getInventory })
  const [selectedNodeId, setSelectedNodeId] = useState<number>(10)
  const [editingHostId, setEditingHostId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const selectedCategory = inventoryCategories.find((item) => item.id === selectedNodeId) ?? inventoryCategories[0]

  const hostsQuery = useQuery({
    queryKey: ["inventory-hosts", selectedCategory.hostType, page, pageSize],
    queryFn: () => getHostList({ page, limit: pageSize, hosttype: selectedCategory.hostType }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingHostId) {
        return
      }
      return updateHost({
        hostid: editingHostId,
        ...draft,
      })
    },
    onSuccess: async () => {
      toast.success("资产信息已保存")
      setEditingHostId(null)
      setDraft({})
      await hostsQuery.refetch()
    },
  })

  const tree = (inventoryTreeQuery.data ?? []) as InventoryNode[]
  const items = (hostsQuery.data?.items ?? []) as HostRecord[]
  const total = Number(hostsQuery.data?.total ?? 0)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const toDateInputValue = (value: unknown) => {
    const raw = String(value ?? "")
    if (!raw) {
      return ""
    }
    return raw.slice(0, 10)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">资产树</CardTitle>
            <Badge variant="outline">目录</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          {(tree[0]?.children ?? inventoryCategories).map((node) => {
            const category = inventoryCategories.find((item) => item.id === node.id)
            const Icon = category?.icon ?? Server
            const active = selectedNodeId === node.id
            return (
              <Button
                key={node.id}
                variant={active ? "default" : "outline"}
                className="justify-start rounded-xl"
                onClick={() => {
                  setSelectedNodeId(node.id)
                  setPage(1)
                }}
              >
                <Icon data-icon="inline-start" />
                {node.name}
              </Button>
            )
          })}
        </CardContent>
      </Card>

      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="text-sm font-medium">{selectedCategory.name}</CardTitle>
              <div className="text-xs text-muted-foreground">资产台账与硬件字段维护</div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const file = await exportInventory({ hostType: selectedCategory.hostType })
                saveAs(file, `${selectedCategory.hostType}-inventory.xlsx`)
              }}
            >
              <FileDown data-icon="inline-start" />
              导出
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>共 {total} 条</span>
            <span>·</span>
            <span>支持行内维护</span>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {items.length ? (
            <div className="max-w-full overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>主机名</TableHead>
                    <TableHead>实例</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>运行时长</TableHead>
                    <TableHead>可用性</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>资产编号</TableHead>
                    <TableHead>安装日期</TableHead>
                    <TableHead>维保到期</TableHead>
                    <TableHead>MAC</TableHead>
                    <TableHead className="sticky right-0 z-10 bg-muted/20 shadow-[-8px_0_8px_-8px_hsl(var(--border))]">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const hostId = String(item.hostid ?? "")
                    const editing = editingHostId === hostId
                    return (
                      <TableRow key={hostId}>
                        <TableCell>{hostId}</TableCell>
                        <TableCell>{String(item.name ?? "-")}</TableCell>
                        <TableCell>{String(item.instance_name ?? "-")}</TableCell>
                        <TableCell>{String(item.interfaces ?? "-")}</TableCell>
                        <TableCell>{String(item.uptime ?? "-")}</TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="text-left">
                                <Badge variant={getStatusMeta(item).variant}>
                                  {availabilityText[String(item.available ?? "")] ?? String(item.available ?? "-")}
                                </Badge>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                              <div className="flex flex-col gap-2">
                                <div>状态：{availabilityText[String(item.available ?? "")] ?? "-"}</div>
                                <div>错误：{String(item.error ?? "无")}</div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        {[
                          ["location", "位置", "text"],
                          ["department", "部门", "text"],
                          ["resource_id", "资产编号", "text"],
                          ["date_hw_install", "安装日期", "date"],
                          ["date_hw_expiry", "维保到期", "date"],
                          ["mac", "MAC", "text"],
                        ].map(([key, label, type]) => (
                          <TableCell key={key} className="min-w-32">
                            {editing ? (
                              type === "date" ? (
                                <Input
                                  aria-label={label}
                                  className="w-36 min-w-0"
                                  type="date"
                                  value={toDateInputValue(draft[key] ?? item[key])}
                                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                                />
                              ) : (
                                <Input
                                  aria-label={label}
                                  className="w-32 min-w-0"
                                  value={draft[key] ?? String(item[key] ?? "")}
                                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                                />
                              )
                            ) : (
                              String(item[key] ?? "-")
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="sticky right-0 z-10 bg-background shadow-[-8px_0_8px_-8px_hsl(var(--border))]">
                          <div className="flex min-w-36 gap-2">
                            {editing ? (
                              <>
                                <Button size="sm" onClick={() => saveMutation.mutate()}>
                                  <Save data-icon="inline-start" />
                                  保存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingHostId(null)
                                    setDraft({})
                                  }}
                                >
                                  <X data-icon="inline-start" />
                                  取消
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingHostId(hostId)
                                  setDraft({
                                    location: String(item.location ?? ""),
                                    department: String(item.department ?? ""),
                                    resource_id: String(item.resource_id ?? ""),
                                    date_hw_install: String(item.date_hw_install ?? ""),
                                    date_hw_expiry: String(item.date_hw_expiry ?? ""),
                                    mac: String(item.mac ?? ""),
                                  })
                                }}
                              >
                                <Pencil data-icon="inline-start" />
                                编辑
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无资产数据</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => void hostsQuery.refetch()}>
                  刷新
                </Button>
              </EmptyContent>
            </Empty>
          )}
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
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewSection({ title, items }: { title: string; items: HostRecord[] }) {
  const alarmCount = items.filter((item) => Number(item.alarm ?? 0) > 0).length

  return (
    <Card className="console-panel border-0">
      <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>总数 {items.length}</div>
            <div>告警 {alarmCount}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-8 gap-3 sm:grid-cols-10 lg:grid-cols-12">
          {items.map((item, index) => {
            const meta = getStatusMeta(item)
            return (
              <Popover key={`${title}-${index}`}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`relative flex size-5 rounded-full ${meta.dotClass} transition-transform hover:scale-110`}
                    aria-label={String(item.name ?? "host")}
                  >
                    {Number(item.alarm ?? 0) > 0 ? <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30" /> : null}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="font-medium">{String(item.name ?? "-")}</div>
                    <div>实例：{String(item.instance_name ?? "-")}</div>
                    <div>IP：{String(item.interfaces ?? "-")}</div>
                    <div>CPU：{String(item.cpu_utilization ?? "-")}</div>
                    <div>MEM：{String(item.memory_utilization ?? "-")}</div>
                    <div>告警数：{String(item.alarm ?? "0")}</div>
                    <div>错误信息：{String(item.error ?? "-")}</div>
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewView() {
  const query = useQuery({ queryKey: ["overview"], queryFn: getOverview })
  const data = (query.data ?? {}) as Record<string, HostRecord[]>

  const sections = [
    { title: "Windows主机", items: data.vm_win ?? [] },
    { title: "Linux主机", items: data.vm_lin ?? [] },
    { title: "网络设备", items: data.hw_net ?? [] },
    { title: "物理服务器", items: data.hw_srv ?? [] },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-4">
        {sections.map((section) => {
          const healthy = section.items.filter((item) => String(item.available ?? "") === "1" && Number(item.alarm ?? 0) === 0).length
          const warning = section.items.filter((item) => String(item.available ?? "") === "1" && Number(item.alarm ?? 0) > 0).length
          const error = section.items.filter((item) => ["0", "2"].includes(String(item.available ?? ""))).length
          return (
            <Card key={section.title} className="console-panel border-0">
              <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                <CardTitle className="text-2xl">{formatCount(section.items.length)}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 text-sm text-muted-foreground">
                <div>健康：{healthy}</div>
                <div>告警：{warning}</div>
                <div>异常：{error}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <OverviewSection key={section.title} title={section.title} items={section.items} />
        ))}
      </div>
    </div>
  )
}

export function SummaryPage({ mode }: SummaryPageProps) {
  return <PageLayout>{mode === "inventory" ? <InventoryView /> : <OverviewView />}</PageLayout>
}
