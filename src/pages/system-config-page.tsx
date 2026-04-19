import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageUp, Link, Mail, MessageCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getConfigList, testEmailConfig, testWechatConfig, updateConfig, uploadSystemLogo } from "@/services/resources"
import { useSystemStore } from "@/stores/system-store"

type ConfigItem = Record<string, unknown>

const tabMeta = [
  { value: "system", label: "系统" },
  { value: "email", label: "邮件" },
  { value: "wechat", label: "企业微信" },
  { value: "ai", label: "AI" },
]

const hiddenSystemKeys = ["demo_mode", "initial_setup_completed"]
const booleanKeys = ["sync_inventory", "wechat_enabled", "email_isSSl"]
const passwordKeys = ["email_secret", "wechat_secret", "deepseek_api_key", "encryption_key"]

function detectGroup(key: string) {
  if (key.startsWith("email_")) return "email"
  if (key.startsWith("wechat_")) return "wechat"
  if (key.startsWith("ollama_") || key.startsWith("deepseek_") || key === "ai_type" || key === "alarm_analysis_prompt") return "ai"
  return "system"
}

function visibleInGroup(item: ConfigItem, group: string, aiType: string) {
  const key = String(item.config_key ?? "")
  if (group === "system") {
    return detectGroup(key) === "system" && !hiddenSystemKeys.includes(key)
  }
  if (group === "ai") {
    if (key === "ai_type" || key === "alarm_analysis_prompt") return true
    if (aiType === "deepseek") return key.startsWith("deepseek_")
    return key.startsWith("ollama_")
  }
  return detectGroup(key) === group
}

function booleanOptions(key: string) {
  if (key === "email_isSSl") {
    return [
      { value: "true", label: "启用" },
      { value: "false", label: "禁用" },
    ]
  }
  return [
    { value: "1", label: "启用" },
    { value: "0", label: "禁用" },
  ]
}

type ConfigSection = {
  key: string
  title: string
  items: ConfigItem[]
}

export function SystemConfigPage() {
  const queryClient = useQueryClient()
  const { setSystemInfo } = useSystemStore()
  const [activeTab, setActiveTab] = useState("system")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testWechatOpen, setTestWechatOpen] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testWechatUser, setTestWechatUser] = useState("")

  const configsQuery = useQuery({ queryKey: ["system-config-list"], queryFn: getConfigList })

  const saveMutation = useMutation({
    mutationFn: async (items: ConfigItem[]) => {
      for (const item of items) {
        await updateConfig(String(item.id), { config_value: item.config_value })
      }
    },
  })

  const testEmailMutation = useMutation({
    mutationFn: () => testEmailConfig({ test_email: testEmail }),
    onSuccess: () => {
      toast.success("测试邮件发送成功，请检查邮箱")
      setTestEmailOpen(false)
    },
  })

  const testWechatMutation = useMutation({
    mutationFn: () => testWechatConfig({ test_user_id: testWechatUser }),
    onSuccess: () => {
      toast.success("测试企业微信消息发送成功")
      setTestWechatOpen(false)
    },
  })

  const items = useMemo(() => {
    const data = configsQuery.data
    if (Array.isArray(data)) {
      return data as ConfigItem[]
    }
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
      return (data as { items: ConfigItem[] }).items
    }
    return [] as ConfigItem[]
  }, [configsQuery.data])
  const valueOf = (item: ConfigItem) => drafts[String(item.config_key ?? "")] ?? String(item.config_value ?? "")
  const aiType = drafts.ai_type ?? String(items.find((item) => item.config_key === "ai_type")?.config_value ?? "ollama")

  const grouped = useMemo(() => {
    return tabMeta.reduce<Record<string, ConfigItem[]>>((acc, tab) => {
      acc[tab.value] = items.filter((item) => visibleInGroup(item, tab.value, aiType))
      return acc
    }, {})
  }, [aiType, items])
  const activeTabValue =
    (grouped[activeTab] ?? []).length > 0
      ? activeTab
      : tabMeta.find((tab) => (grouped[tab.value] ?? []).length > 0)?.value ?? activeTab

  const sectioned = useMemo<Record<string, ConfigSection[]>>(() => {
    const byKey = new Map(items.map((item) => [String(item.config_key ?? ""), item]))
    const pick = (keys: string[]) => keys.map((key) => byKey.get(key)).filter(Boolean) as ConfigItem[]

    const sections: Record<string, ConfigSection[]> = {
      system: [
        { key: "appearance", title: "外观设置", items: pick(["system_name", "system_logo"]) },
        { key: "runtime", title: "系统设置", items: pick(["dash_top_lin_num", "dash_top_win_num", "sync_inventory", "webhook_url"]) },
      ].filter((section) => section.items.length > 0),
      email: [
        { key: "email", title: "邮件配置", items: grouped.email ?? [] },
      ].filter((section) => section.items.length > 0),
      wechat: [
        { key: "wechat", title: "企业微信配置", items: grouped.wechat ?? [] },
      ].filter((section) => section.items.length > 0),
      ai: [
        { key: "ai_type", title: "AI 引擎", items: pick(["ai_type"]) },
        ...(aiType === "ollama" ? [{ key: "ollama", title: "Ollama", items: items.filter((item) => String(item.config_key ?? "").startsWith("ollama_")) }] : []),
        ...(aiType === "deepseek" ? [{ key: "deepseek", title: "Deepseek", items: items.filter((item) => String(item.config_key ?? "").startsWith("deepseek_")) }] : []),
        { key: "prompt", title: "告警分析", items: pick(["alarm_analysis_prompt"]) },
      ].filter((section) => section.items.length > 0),
    }

    return sections
  }, [aiType, grouped.email, grouped.wechat, items])

  const setDraft = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }))
  }

  const saveGroup = (group: string) => {
    const payload: Array<ConfigItem & { config_value: string }> = (grouped[group] ?? []).map((item) => ({
      ...item,
      config_value: valueOf(item),
    }))
    saveItems(payload, group)
  }

  const saveItems = (payload: Array<ConfigItem & { config_value: string }>, group?: string) => {
    saveMutation.mutate(payload, {
      onSuccess: async () => {
        toast.success("配置已保存")
        if (group === "system") {
          const systemName = String(payload.find((item) => item.config_key === "system_name")?.config_value ?? "")
          const systemLogo = String(payload.find((item) => item.config_key === "system_logo")?.config_value ?? "")
          setSystemInfo({
            systemName: systemName || "ZbxTable",
            systemLogo: systemLogo || "/logo.png",
          })
        }
        await queryClient.invalidateQueries({ queryKey: ["system-config-list"] })
      },
    })
  }

  const renderConfigValue = (item: ConfigItem) => {
    const key = String(item.config_key ?? "")
    const value = valueOf(item)
    if (key === "ai_type") {
      return (
        <Select value={value || "ollama"} onValueChange={(next) => setDraft(key, next)}>
          <SelectTrigger className="min-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ollama">Ollama</SelectItem>
              <SelectItem value="deepseek">Deepseek</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )
    }

    if (booleanKeys.includes(key)) {
      return (
        <Select value={value || booleanOptions(key)[1].value} onValueChange={(next) => setDraft(key, next)}>
          <SelectTrigger className="min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {booleanOptions(key).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )
    }

    if (key === "webhook_url") {
      return (
        <div className="flex min-w-[320px] items-center gap-2">
          <Input value={value} onChange={(event) => setDraft(key, event.target.value)} />
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft(key, window.location.origin)}
          >
            <Link data-icon="inline-start" />
            当前地址
          </Button>
        </div>
      )
    }

    if (key === "system_logo") {
      return (
        <div className="flex min-w-[280px] flex-col gap-3">
          {value ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
              <img src={value} alt="system logo" className="size-16 rounded-lg border bg-background object-contain p-1" />
              <div className="text-sm text-muted-foreground">已上传 Logo</div>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={async () => {
              const input = document.createElement("input")
              input.type = "file"
              input.accept = "image/png,image/jpeg,image/jpg,image/svg+xml"
              input.onchange = async () => {
                const file = input.files?.[0]
                if (!file) {
                  return
                }
                const data = await uploadSystemLogo(file)
                setDraft(key, String(data.url ?? ""))
                toast.success("Logo 已上传")
              }
              input.click()
            }}
          >
            <ImageUp data-icon="inline-start" />
            上传 Logo
          </Button>
        </div>
      )
    }

    const isLong = key.includes("prompt")
    return (
      isLong ? (
        <Textarea rows={7} value={value} onChange={(event) => setDraft(key, event.target.value)} />
      ) : (
        <Input
          type={passwordKeys.includes(key) ? "password" : "text"}
          value={value}
          onChange={(event) => setDraft(key, event.target.value)}
        />
      )
    )
  }

  if (configsQuery.isLoading) {
    return (
      <PageLayout>
        <Card className="console-panel border-0">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">参数配置</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-muted-foreground">正在加载配置…</CardContent>
        </Card>
      </PageLayout>
    )
  }

  if (configsQuery.isError) {
    return (
      <PageLayout>
        <Card className="console-panel border-0">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">参数配置</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Empty className="border bg-background py-10">
              <EmptyHeader>
                <EmptyTitle>配置加载失败</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" variant="outline" onClick={() => void configsQuery.refetch()}>
                  <RefreshCw data-icon="inline-start" />
                  重新加载
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  if (!items.length) {
    return (
      <PageLayout>
        <Card className="console-panel border-0">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">参数配置</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Empty className="border bg-background py-10">
              <EmptyHeader>
                <EmptyTitle>暂无配置数据</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" variant="outline" onClick={() => void configsQuery.refetch()}>
                  <RefreshCw data-icon="inline-start" />
                  刷新配置
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Tabs value={activeTabValue} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="app-shell-surface h-auto flex-wrap justify-start gap-2 rounded-2xl border p-1.5">
          {tabMeta.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabMeta.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {(sectioned[tab.value] ?? []).length ? (
              <div className="flex flex-col gap-4">
                {tab.value !== "system" ? (
                  <Card className="console-panel border-0">
                    <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium">{tab.label}配置</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{grouped[tab.value]?.length ?? 0} 项</Badge>
                          <Button size="sm" onClick={() => saveGroup(tab.value)}>
                            保存
                          </Button>
                          {tab.value === "email" ? (
                            <Button size="sm" variant="outline" onClick={() => setTestEmailOpen(true)}>
                              <Mail data-icon="inline-start" />
                              测试邮件
                            </Button>
                          ) : null}
                          {tab.value === "wechat" ? (
                            <Button size="sm" variant="outline" onClick={() => setTestWechatOpen(true)}>
                              <MessageCircle data-icon="inline-start" />
                              测试企业微信
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ) : null}

                {sectioned[tab.value].map((section) => (
                  <Card key={section.key} className="console-panel border-0">
                    <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{section.items.length} 项</Badge>
                          {tab.value === "system" ? (
                            <Button size="sm" onClick={() => saveItems(section.items.map((item) => ({
                              ...item,
                              config_value: valueOf(item),
                            })), "system")}>
                              保存
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[220px]">配置项</TableHead>
                            <TableHead className="w-[320px]">说明</TableHead>
                            <TableHead>值</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.items.map((item) => (
                            <TableRow key={String(item.id)}>
                              <TableCell className="font-medium">{String(item.name ?? item.config_key ?? "-")}</TableCell>
                              <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">
                                {String(item.comment ?? "-")}
                              </TableCell>
                              <TableCell>{renderConfigValue(item)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="console-panel border-0">
                <CardContent className="p-3">
                  <Empty className="border bg-background py-10">
                    <EmptyHeader>
                      <EmptyTitle>当前分组暂无可配置项</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["system-config-list"] })}>
                        <RefreshCw data-icon="inline-start" />
                        刷新配置
                      </Button>
                    </EmptyContent>
                  </Empty>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>测试邮件配置</DialogTitle>
          </DialogHeader>
          <Card className="console-panel border-0">
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="test-email">接收邮箱</FieldLabel>
                  <Input id="test-email" type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              取消
            </Button>
            <Button onClick={() => testEmailMutation.mutate()}>发送测试</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testWechatOpen} onOpenChange={setTestWechatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>测试企业微信配置</DialogTitle>
          </DialogHeader>
          <Card className="console-panel border-0">
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="test-wechat">企业微信用户 ID</FieldLabel>
                  <Input id="test-wechat" value={testWechatUser} onChange={(event) => setTestWechatUser(event.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestWechatOpen(false)}>
              取消
            </Button>
            <Button onClick={() => testWechatMutation.mutate()}>发送测试</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
