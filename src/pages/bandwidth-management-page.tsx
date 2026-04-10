import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import {
  createEgressConfig,
  deleteEgressConfig,
  getEgressConfigs,
  getReceiveTrafficItems,
  getTrafficItems,
  listZabbixInstances,
  searchHosts,
  updateEgressConfig,
} from "@/services/resources"

type EgressForm = {
  name: string
  zid: string
  host_id: string
  in_item_id: string
  out_item_id: string
  status: string
  sort_order: string
}

const emptyForm: EgressForm = {
  name: "",
  zid: "",
  host_id: "",
  in_item_id: "",
  out_item_id: "",
  status: "1",
  sort_order: "0",
}

export function BandwidthManagementPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EgressForm>(emptyForm)

  const configsQuery = useQuery({ queryKey: ["egress-config"], queryFn: getEgressConfigs })
  const instancesQuery = useQuery({ queryKey: ["zabbix-instances"], queryFn: listZabbixInstances })
  const hostsQuery = useQuery({
    queryKey: ["egress-hosts", form.zid],
    queryFn: () => searchHosts({ zid: form.zid, name: "" }),
    enabled: !!form.zid,
  })
  const inItemsQuery = useQuery({
    queryKey: ["egress-in-items", form.zid, form.host_id],
    queryFn: () => getTrafficItems({ zid: form.zid, hostid: form.host_id }),
    enabled: !!form.zid && !!form.host_id,
  })
  const outItemsQuery = useQuery({
    queryKey: ["egress-out-items", form.zid, form.host_id],
    queryFn: () => getReceiveTrafficItems({ zid: form.zid, hostid: form.host_id }),
    enabled: !!form.zid && !!form.host_id,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        zid: Number(form.zid),
        status: Number(form.status),
        sort_order: Number(form.sort_order),
      }
      if (editingId) {
        return updateEgressConfig(editingId, payload)
      }
      return createEgressConfig(payload)
    },
    onSuccess: async () => {
      toast.success("出口配置已保存")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ["egress-config"] })
    },
  })

  const configs = configsQuery.data ?? []
  const instances = instancesQuery.data ?? []
  const hosts = hostsQuery.data?.items ?? []
  const inItems = inItemsQuery.data?.items ?? []
  const outItems = outItemsQuery.data?.items ?? []

  const getInstanceName = (zid: unknown) =>
    String(instances.find((item) => String(item.id) === String(zid))?.name ?? zid ?? "-")

  return (
    <PageLayout>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">出口列表</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">共 {configs.length} 条配置</Badge>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新增出口
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>实例</TableHead>
              <TableHead>主机 ID</TableHead>
              <TableHead>入流量指标</TableHead>
              <TableHead>出流量指标</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((item) => {
              const id = String(item.id ?? "")
              return (
                <TableRow key={id}>
                  <TableCell>{String(item.name ?? "-")}</TableCell>
                  <TableCell>{getInstanceName(item.zid)}</TableCell>
                  <TableCell>{String(item.host_id ?? "-")}</TableCell>
                  <TableCell className="max-w-64 truncate">{String(item.in_item_id ?? "-")}</TableCell>
                  <TableCell className="max-w-64 truncate">{String(item.out_item_id ?? "-")}</TableCell>
                  <TableCell>{String(item.sort_order ?? 0)}</TableCell>
                  <TableCell>{Number(item.status ?? 1) === 1 ? "启用" : "禁用"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(id)
                          setForm({
                            name: String(item.name ?? ""),
                            zid: String(item.zid ?? ""),
                            host_id: String(item.host_id ?? ""),
                            in_item_id: String(item.in_item_id ?? ""),
                            out_item_id: String(item.out_item_id ?? ""),
                            status: String(item.status ?? 1),
                            sort_order: String(item.sort_order ?? 0),
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
                        onClick={async () => {
                          if (!window.confirm("确认删除该出口配置吗？")) {
                            return
                          }
                          await deleteEgressConfig(id)
                          toast.success("删除成功")
                          await queryClient.invalidateQueries({ queryKey: ["egress-config"] })
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑出口配置" : "新增出口配置"}</DialogTitle>
          </DialogHeader>
          <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <CardTitle className="text-sm font-medium">基础配置</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="egress-name">出口名称</FieldLabel>
                  <Input id="egress-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </Field>
                <Field>
                  <FieldLabel>实例</FieldLabel>
                  <Select
                    value={form.zid || "none"}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        zid: value === "none" ? "" : value,
                        host_id: "",
                        in_item_id: "",
                        out_item_id: "",
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
                  <FieldLabel>主机</FieldLabel>
                  <Select
                    value={form.host_id || "none"}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        host_id: value === "none" ? "" : value,
                        in_item_id: "",
                        out_item_id: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择主机" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">请选择主机</SelectItem>
                        {hosts.map((item) => (
                          <SelectItem key={String(item.hostid ?? item.host_id)} value={String(item.hostid ?? item.host_id)}>
                            {String(item.name ?? item.host ?? item.hostid)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel>入流量指标</FieldLabel>
                    <Select value={form.in_item_id || "none"} onValueChange={(value) => setForm({ ...form, in_item_id: value === "none" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择入流量指标" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">请选择入流量指标</SelectItem>
                          {inItems.map((item) => (
                            <SelectItem key={String(item.itemid ?? item.id)} value={String(item.itemid ?? item.id)}>
                              {String(item.name ?? item.itemid ?? item.id)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>出流量指标</FieldLabel>
                    <Select value={form.out_item_id || "none"} onValueChange={(value) => setForm({ ...form, out_item_id: value === "none" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择出流量指标" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">请选择出流量指标</SelectItem>
                          {outItems.map((item) => (
                            <SelectItem key={String(item.itemid ?? item.id)} value={String(item.itemid ?? item.id)}>
                              {String(item.name ?? item.itemid ?? item.id)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="egress-sort">排序</FieldLabel>
                    <Input id="egress-sort" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>状态</FieldLabel>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="1">启用</SelectItem>
                          <SelectItem value="0">禁用</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate()}>{editingId ? "保存修改" : "创建配置"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
