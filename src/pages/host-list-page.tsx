import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Eye, FileDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { saveAs } from "file-saver"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { exportHosts, getHostList } from "@/services/hosts"

type HostListPageProps = {
  hostType: string
  detailPath: string
}

export function HostListPage({ hostType, detailPath }: HostListPageProps) {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState("")
  const [ip, setIp] = useState("")
  const [available, setAvailable] = useState("")
  const queryParams = useMemo(
    () => ({ page: 1, limit: 50, hosttype: hostType, hosts, ip, available }),
    [available, hostType, hosts, ip]
  )
  const query = useQuery({
    queryKey: ["hosts", hostType, queryParams],
    queryFn: () => getHostList(queryParams),
  })

  const items = query.data?.items ?? []
  const total = Number(query.data?.total ?? 0)

  const statusBadge = (value: unknown) => {
    if (String(value ?? "") === "1") return <Badge variant="secondary">可用</Badge>
    if (String(value ?? "") === "2") return <Badge variant="destructive">不可用</Badge>
    return <Badge variant="outline">未知</Badge>
  }

  return (
    <PageLayout>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">共 {total} 条</Badge>
              <Button
                variant="outline"
                onClick={async () => {
                  const file = await exportHosts(queryParams)
                  saveAs(file, `${hostType}.xlsx`)
                }}
              >
                <FileDown data-icon="inline-start" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="lg:grid lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="host-search">主机名</FieldLabel>
              <Input id="host-search" value={hosts} onChange={(event) => setHosts(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ip-search">IP</FieldLabel>
              <Input id="ip-search" value={ip} onChange={(event) => setIp(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="avail-search">可用状态</FieldLabel>
              <Input id="avail-search" value={available} onChange={(event) => setAvailable(event.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <CardTitle className="text-sm font-medium">主机列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HostID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>实例</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>MEM</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={String(item.hostid ?? item.id)}>
                    <TableCell>{String(item.hostid ?? "--")}</TableCell>
                    <TableCell className="font-medium">{String(item.name ?? "--")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{String(item.instance_name ?? "--")}</Badge>
                    </TableCell>
                    <TableCell>{String(item.interfaces ?? "--")}</TableCell>
                    <TableCell>{String(item.cpu_utilization ?? "--")}</TableCell>
                    <TableCell>{String(item.memory_utilization ?? "--")}</TableCell>
                    <TableCell>{statusBadge(item.available)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`${detailPath}?hostid=${item.hostid ?? ""}&zid=${item.zid ?? ""}`)}
                      >
                        <Eye data-icon="inline-start" />
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
