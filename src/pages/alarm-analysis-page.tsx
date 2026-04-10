import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BarChart3, FileDown, PieChart, RefreshCw } from "lucide-react"
import { saveAs } from "file-saver"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { analyzeAlarm, exportAlarmAnalysis, listZabbixInstances } from "@/services/resources"

type AlarmLevelItem = {
  name?: string
  value?: number
  level?: string
  count?: number
}

type AlarmAnalysisResponse = {
  level_count?: AlarmLevelItem[]
  host?: string[]
  host_count?: number[]
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

function normalizeLevelRows(items: AlarmLevelItem[]) {
  return items.map((item, index) => ({
    name: String(item.name ?? item.level ?? `等级 ${index + 1}`),
    value: Number(item.value ?? item.count ?? 0),
  }))
}

function TopBarList({ rows }: { rows: Array<{ name: string; value: number }> }) {
  const max = Math.max(...rows.map((item) => item.value), 1)

  return (
    <div className="flex flex-col gap-3">
      {rows.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{item.name}</span>
            <Badge variant="secondary">{item.value}</Badge>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AlarmAnalysisPage() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [selectedInstance, setSelectedInstance] = useState("all")
  const [beginTime, setBeginTime] = useState(formatDateTimeLocal(weekAgo))
  const [endTime, setEndTime] = useState(formatDateTimeLocal(now))

  const instancesQuery = useQuery({
    queryKey: ["zabbix-instances"],
    queryFn: listZabbixInstances,
  })

  const payload = useMemo(
    () => ({
      begin: toRequestDateTime(beginTime),
      end: toRequestDateTime(endTime),
      ...(selectedInstance !== "all" ? { zid: selectedInstance } : {}),
    }),
    [beginTime, endTime, selectedInstance]
  )

  const analysisMutation = useMutation({
    mutationFn: () => analyzeAlarm(payload),
  })

  const data = (analysisMutation.data ?? {}) as AlarmAnalysisResponse
  const levelRows = normalizeLevelRows(data.level_count ?? [])
  const hostRows = (data.host ?? []).map((name, index) => ({
    name,
    value: Number(data.host_count?.[index] ?? 0),
  }))

  const totalAlarmCount = levelRows.reduce((sum, item) => sum + item.value, 0)
  const topLevel = [...levelRows].sort((a, b) => b.value - a.value)[0]
  const topHost = [...hostRows].sort((a, b) => b.value - a.value)[0]

  return (
    <PageLayout>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => analysisMutation.mutate()}>
                <RefreshCw data-icon="inline-start" />
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const file = await exportAlarmAnalysis(payload)
                  saveAs(file, "alarm-analysis.xlsx")
                }}
              >
                <FileDown data-icon="inline-start" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="xl:grid xl:grid-cols-3">
            <Field>
              <FieldLabel>实例</FieldLabel>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="全部实例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部实例</SelectItem>
                    {(instancesQuery.data ?? [])
                      .filter((item) => !!item.enabled)
                      .map((item) => (
                        <SelectItem key={String(item.id)} value={String(item.id)}>
                          {String(item.name ?? item.instance ?? item.id)}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="analysis-begin">开始时间</FieldLabel>
              <Input id="analysis-begin" type="datetime-local" value={beginTime} onChange={(event) => setBeginTime(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="analysis-end">结束时间</FieldLabel>
              <Input id="analysis-end" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">告警总量</CardTitle>
              <Badge variant="secondary">{totalAlarmCount}</Badge>
            </div>
          </CardHeader>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">最高等级</CardTitle>
              <Badge variant="outline">{topLevel ? `${topLevel.name} · ${topLevel.value}` : "-"}</Badge>
            </div>
          </CardHeader>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">TOP 主机</CardTitle>
              <Badge variant="outline">{topHost ? `${topHost.name} · ${topHost.value}` : "-"}</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      {levelRows.length || hostRows.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="border-0 shadow-none ring-1 ring-border/60">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">主机排行</CardTitle>
                <div className="flex text-xs text-muted-foreground">
                <BarChart3 data-icon="inline-start" />
                TOP10
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {hostRows.length ? <TopBarList rows={hostRows} /> : <div className="text-sm text-muted-foreground">暂无主机统计数据</div>}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none ring-1 ring-border/60">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">等级分布</CardTitle>
                <div className="flex text-xs text-muted-foreground">
                <PieChart data-icon="inline-start" />
                等级分布
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="max-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>等级</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>占比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levelRows.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.value}</TableCell>
                        <TableCell>{totalAlarmCount ? `${((item.value / totalAlarmCount) * 100).toFixed(1)}%` : "0%"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>暂无分析结果</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => analysisMutation.mutate()}>立即分析</Button>
          </EmptyContent>
        </Empty>
      )}
    </PageLayout>
  )
}
