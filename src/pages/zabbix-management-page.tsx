import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Cable, Clipboard, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Webhook } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createZabbixInstance,
  deleteZabbixInstance,
  getZabbixInstance,
  getWebhookInfo,
  installWebhook,
  listZabbixInstances,
  setZabbixInstanceEnabled,
  testZabbixInstance,
  testZabbixInstanceConfig,
  uninstallWebhook,
  updateZabbixInstance,
} from "@/services/resources"

type ZabbixForm = {
  instance: string
  name: string
  url: string
  user: string
  pass: string
  token: string
  enabled: boolean
  notify_method: string
}

type WebhookInfo = {
  webhook_url?: string
  instance?: string
  webhook_token?: string
  method?: string
  content_type?: string
  headers?: string
}

const emptyForm: ZabbixForm = {
  instance: "",
  name: "",
  url: "",
  user: "",
  pass: "",
  token: "",
  enabled: true,
  notify_method: "webhook",
}

function authBadges(value: unknown) {
  const items = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : []

  if (!items.length) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={String(item)} variant="secondary">
          {String(item) === "password" ? "密码" : "Token"}
        </Badge>
      ))}
    </div>
  )
}

function CopyField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-sm">{value || "-"}</code>
        <Button
          size="sm"
          variant="outline"
          disabled={!value}
          onClick={async () => {
            await navigator.clipboard.writeText(value ?? "")
            toast.success(`${label} 已复制`)
          }}
        >
          <Clipboard data-icon="inline-start" />
          复制
        </Button>
      </div>
    </div>
  )
}

export function ZabbixManagementPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [form, setForm] = useState<ZabbixForm>(emptyForm)
  const [webhookOpen, setWebhookOpen] = useState(false)
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [testResult, setTestResult] = useState("")

  const listQuery = useQuery({ queryKey: ["zabbix-list"], queryFn: listZabbixInstances })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tenant_id: form.instance,
      }
      if (editingId) {
        return updateZabbixInstance(editingId, payload)
      }
      return createZabbixInstance(payload)
    },
    onSuccess: async () => {
      toast.success("Zabbix 实例已保存")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setTestResult("")
      await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
    },
  })

  const items = listQuery.data ?? []

  return (
    <PageLayout>
      <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">实例概览</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">共 {items.length} 个实例</Badge>
              <Badge variant="secondary">已启用 {items.filter((item) => !!item.enabled).length} 个</Badge>
              <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
                <RefreshCw data-icon="inline-start" />
                刷新
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setTestResult("")
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新增实例
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {items.length ? (
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">实例列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-w-full">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>实例</TableHead>
                <TableHead>Zabbix</TableHead>
                <TableHead>认证方式</TableHead>
                <TableHead>连接</TableHead>
                <TableHead>告警接收</TableHead>
                <TableHead>启用</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const id = String(item.id)
                const installed = !!item.webhook_installed
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Badge variant="outline">{String(item.instance ?? id)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{String(item.name ?? "-")}</span>
                        <span className="max-w-72 truncate text-sm text-muted-foreground">{String(item.url ?? "-")}</span>
                        <span className="text-xs text-muted-foreground">版本：{String(item.version ?? "-")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{authBadges(item.auth_methods)}</TableCell>
                    <TableCell>
                      {item.enabled ? (
                        item.last_test_ok ? (
                          <Badge>已连接</Badge>
                        ) : (
                          <Badge variant="secondary">未验证</Badge>
                        )
                      ) : (
                        <Badge variant="outline">不可用</Badge>
                      )}
                      {item.last_test_message ? (
                        <div className="mt-1 max-w-64 truncate text-xs text-muted-foreground">{String(item.last_test_message)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary">{String(item.notify_method ?? "webhook")}</Badge>
                        <span className="text-xs text-muted-foreground">{installed ? "Webhook 已安装" : "Webhook 未安装"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!item.enabled}
                          onCheckedChange={async (checked) => {
                            await setZabbixInstanceEnabled(id, checked)
                            await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{item.enabled ? "启用" : "禁用"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const data = (await testZabbixInstance(id)) as Record<string, unknown> | undefined
                            toast.success(`连接测试完成${data?.version ? `：${String(data.version)}` : ""}`)
                            await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
                          }}
                        >
                          <Cable data-icon="inline-start" />
                          测试
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const detail = (await getZabbixInstance(id)) as Record<string, unknown>
                            setEditingId(id)
                            setTestResult("")
                            setForm({
                              instance: String(detail.instance ?? item.instance ?? ""),
                              name: String(detail.name ?? item.name ?? ""),
                              url: String(detail.url ?? item.url ?? ""),
                              user: String(detail.user ?? item.user ?? ""),
                              pass: "",
                              token: "",
                              enabled: Boolean(detail.enabled ?? item.enabled),
                              notify_method: String(detail.notify_method ?? item.notify_method ?? "webhook"),
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
                            if (installed) {
                              const data = (await getWebhookInfo(id)) as WebhookInfo
                              setWebhookInfo(data)
                              setWebhookOpen(true)
                              return
                            }
                            await installWebhook(id)
                            toast.success("Webhook 已安装")
                            await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
                          }}
                        >
                          <Webhook data-icon="inline-start" />
                          {installed ? "查看配置" : "安装 Webhook"}
                        </Button>
                        {installed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!window.confirm("确认卸载该实例的 Webhook 配置吗？")) {
                                return
                              }
                              await uninstallWebhook(id)
                              toast.success("Webhook 已卸载")
                              await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
                            }}
                          >
                            <Trash2 data-icon="inline-start" />
                            卸载
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!window.confirm("确认删除该 Zabbix 实例吗？")) {
                              return
                            }
                            await deleteZabbixInstance(id)
                            toast.success("删除成功")
                            await queryClient.invalidateQueries({ queryKey: ["zabbix-list"] })
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
            <EmptyTitle>暂无 Zabbix 实例</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑 Zabbix 实例" : "新增 Zabbix 实例"}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <FieldGroup className="md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="zabbix-instance">实例 ID</FieldLabel>
                <Input
                  id="zabbix-instance"
                  value={form.instance}
                  disabled={!!editingId}
                  onChange={(event) => setForm({ ...form, instance: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="zabbix-name">显示名称</FieldLabel>
                <Input id="zabbix-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="zabbix-url">Zabbix URL</FieldLabel>
              <Input id="zabbix-url" placeholder="https://zabbix.example.com" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            </Field>
            <FieldGroup className="md:grid md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="zabbix-user">用户名</FieldLabel>
                <Input id="zabbix-user" value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="zabbix-pass">密码</FieldLabel>
                <Input id="zabbix-pass" type="password" value={form.pass} onChange={(event) => setForm({ ...form, pass: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="zabbix-token">Token</FieldLabel>
                <Input id="zabbix-token" type="password" value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} />
              </Field>
            </FieldGroup>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="zabbix-enabled">启用实例</FieldLabel>
              <Switch id="zabbix-enabled" checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked })} />
            </Field>
            {testResult ? (
              <div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">{testResult}</div>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                const data = (await testZabbixInstanceConfig(form)) as Record<string, unknown> | undefined
                setTestResult(`连接成功${data?.version ? `，版本 ${String(data.version)}` : ""}`)
                toast.success("配置测试通过")
              }}
            >
              <Cable data-icon="inline-start" />
              测试连接
            </Button>
            <Button onClick={() => saveMutation.mutate()}>
              <ShieldCheck data-icon="inline-start" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Webhook 配置</DialogTitle>
          </DialogHeader>
          <Card>
            <CardHeader>
              <CardTitle>接收端信息</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <CopyField label="Webhook URL" value={webhookInfo?.webhook_url} />
              <CopyField label="实例标识" value={webhookInfo?.instance} />
              <CopyField label="Webhook Token" value={webhookInfo?.webhook_token} />
              <CopyField label="Headers" value={webhookInfo?.headers} />
              <div className="grid gap-3 md:grid-cols-2">
                <CopyField label="Method" value={webhookInfo?.method} />
                <CopyField label="Content-Type" value={webhookInfo?.content_type} />
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
