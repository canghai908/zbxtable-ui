import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  createRule,
  deleteRule,
  getGroupList,
  getRule,
  getRuleList,
  listZabbixInstances,
  updateRule,
  updateRuleStatus,
  getUserList,
} from "@/services/resources"

type Condition = {
  r_type: string
  r_func: string
  r_value: string
}

type RuleForm = {
  name: string
  z_ids: string[]
  conditions: Condition[]
  s_week: string[]
  s_time: string
  e_time: string
  channel: string[]
  user_ids: string[]
  group_ids: string[]
  note: string
  status: boolean
  m_type: string
}

const emptyRule = (mType: string): RuleForm => ({
  name: "",
  z_ids: [],
  conditions: [{ r_type: "host", r_func: "==", r_value: "" }],
  s_week: ["0", "1", "2", "3", "4", "5", "6"],
  s_time: "00:00",
  e_time: "23:59",
  channel: ["mail"],
  user_ids: [],
  group_ids: [],
  note: "",
  status: true,
  m_type: mType,
})

type Props = {
  mType: "1" | "3"
}

export function RuleManagementPage({ mType }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [form, setForm] = useState<RuleForm>(emptyRule(mType))

  const rulesQuery = useQuery({
    queryKey: ["rules", mType, name],
    queryFn: () => getRuleList({ page: 1, limit: 50, name, m_type: mType }),
  })
  const instancesQuery = useQuery({ queryKey: ["zabbix-instances"], queryFn: listZabbixInstances })
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => getGroupList({ page: 1, limit: 200 }) })
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => getUserList({ page: 1, limit: 200 }) })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        z_ids: form.z_ids.join(","),
        conditions: JSON.stringify(form.conditions),
        s_week: form.s_week.join(","),
        channel: form.channel.join(","),
        user_ids: form.user_ids.join(","),
        group_ids: form.group_ids.join(","),
        status: form.status ? "0" : "1",
      }
      if (editingId) {
        return updateRule(editingId, payload)
      }
      return createRule(payload)
    },
    onSuccess: async () => {
      toast.success("保存成功")
      setOpen(false)
      setEditingId(null)
      setForm(emptyRule(mType))
      await queryClient.invalidateQueries({ queryKey: ["rules"] })
    },
  })

  const items = rulesQuery.data?.items ?? []
  const users = usersQuery.data?.items ?? []
  const groups = groupsQuery.data?.items ?? []

  const weekOptions = useMemo(
    () => [
      ["0", "周日"],
      ["1", "周一"],
      ["2", "周二"],
      ["3", "周三"],
      ["4", "周四"],
      ["5", "周五"],
      ["6", "周六"],
    ],
    []
  )

  return (
    <PageLayout>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void rulesQuery.refetch()}>
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setName("")
                  setForm(emptyRule(mType))
                }}
              >
                重置
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyRule(mType))
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新建
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="lg:grid lg:grid-cols-[minmax(0,1fr)]">
            <Field>
              <FieldLabel htmlFor={`rule-name-${mType}`}>规则名称</FieldLabel>
              <Input id={`rule-name-${mType}`} value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入规则名称" />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="text-sm font-medium">规则列表</CardTitle>
              <div className="text-xs text-muted-foreground">条件匹配、通知通道、时间窗与接收对象</div>
            </div>
            <Badge variant="secondary">共 {items.length} 条规则</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>实例</TableHead>
              <TableHead>条件</TableHead>
              <TableHead>通道</TableHead>
              <TableHead>接收人</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={String(item.id)}>
                <TableCell>{String(item.name ?? "-")}</TableCell>
                <TableCell>{String(item.z_ids ?? item.zid ?? "-")}</TableCell>
                <TableCell className="max-w-80 truncate">{String(item.conditions ?? "-")}</TableCell>
                <TableCell>{String(item.channel ?? "-")}</TableCell>
                <TableCell>{String(item.user_ids ?? "-")}</TableCell>
                <TableCell>
                  <Switch
                    checked={String(item.status ?? "0") === "0"}
                    onCheckedChange={async (checked) => {
                      await updateRuleStatus(String(item.id), { status: checked ? "0" : "1" })
                      await queryClient.invalidateQueries({ queryKey: ["rules"] })
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const id = String(item.id)
                        const detail = (await getRule(id)) as Record<string, unknown>
                        setEditingId(id)
                        setForm({
                          name: String(detail.name ?? item.name ?? ""),
                          z_ids: String(detail.z_ids ?? item.z_ids ?? "").split(",").filter(Boolean),
                          conditions: (() => {
                            try {
                              return JSON.parse(String(detail.conditions ?? item.conditions ?? "[]")) as Condition[]
                            } catch {
                              return [{ r_type: "host", r_func: "==", r_value: "" }]
                            }
                          })(),
                          s_week: String(detail.s_week ?? item.s_week ?? "").split(",").filter(Boolean),
                          s_time: String(detail.s_time ?? item.s_time ?? "00:00"),
                          e_time: String(detail.e_time ?? item.e_time ?? "23:59"),
                          channel: String(detail.channel ?? item.channel ?? "").split(",").filter(Boolean),
                          user_ids: String(detail.user_ids ?? item.user_ids ?? "").split(",").filter(Boolean),
                          group_ids: String(detail.group_ids ?? item.group_ids ?? "").split(",").filter(Boolean),
                          note: String(detail.note ?? item.note ?? ""),
                          status: String(detail.status ?? item.status ?? "0") === "0",
                          m_type: mType,
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
                        await deleteRule(String(item.id))
                        toast.success("删除成功")
                        await queryClient.invalidateQueries({ queryKey: ["rules"] })
                      }}
                    >
                      <Trash2 data-icon="inline-start" />
                      删除
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑规则" : "新建规则"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-3">
          <div className="grid gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rule-name">规则名</FieldLabel>
                <Input id="rule-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>实例</FieldLabel>
                <div className="grid gap-2 md:grid-cols-3">
                  {(instancesQuery.data ?? []).map((item) => {
                    const value = String(item.id)
                    return (
                      <label key={value} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-3 text-sm">
                        <Checkbox
                          checked={form.z_ids.includes(value)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              z_ids: checked
                                ? [...form.z_ids, value]
                                : form.z_ids.filter((entry) => entry !== value),
                            })
                          }
                        />
                        {String(item.name ?? item.instance ?? value)}
                      </label>
                    )
                  })}
                </div>
              </Field>
            </FieldGroup>
            <Card className="console-panel border-0">
              <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                <CardTitle className="text-sm font-medium">匹配条件</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-3">
                {form.conditions.map((condition, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-4">
                    <Select
                      value={condition.r_type}
                      onValueChange={(value) => {
                        const next = [...form.conditions]
                        next[index] = { ...condition, r_type: value }
                        setForm({ ...form, conditions: next })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {["host", "group", "item", "key", "trigger", "severity"].map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Select
                      value={condition.r_func}
                      onValueChange={(value) => {
                        const next = [...form.conditions]
                        next[index] = { ...condition, r_func: value }
                        setForm({ ...form, conditions: next })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {["==", "=~", "!="].map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      value={condition.r_value}
                      onChange={(event) => {
                        const next = [...form.conditions]
                        next[index] = { ...condition, r_value: event.target.value }
                        setForm({ ...form, conditions: next })
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setForm({
                            ...form,
                            conditions: [...form.conditions, { r_type: "host", r_func: "==", r_value: "" }],
                          })
                        }
                      >
                        添加
                      </Button>
                      {form.conditions.length > 1 ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setForm({
                              ...form,
                              conditions: form.conditions.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        >
                          删除
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <FieldGroup className="md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="rule-stime">开始时间</FieldLabel>
                <Input id="rule-stime" value={form.s_time} onChange={(event) => setForm({ ...form, s_time: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="rule-etime">结束时间</FieldLabel>
                <Input id="rule-etime" value={form.e_time} onChange={(event) => setForm({ ...form, e_time: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel>星期</FieldLabel>
                <div className="grid gap-2 md:grid-cols-4">
                  {weekOptions.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-2 text-sm">
                      <Checkbox
                        checked={form.s_week.includes(value)}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            s_week: checked ? [...form.s_week, value] : form.s_week.filter((entry) => entry !== value),
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field>
                <FieldLabel>通道</FieldLabel>
                <div className="grid gap-2 md:grid-cols-3">
                  {["mail", "wechat", "wechat_robot"].map((value) => (
                    <label key={value} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-2 text-sm">
                      <Checkbox
                        checked={form.channel.includes(value)}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            channel: checked ? [...form.channel, value] : form.channel.filter((entry) => entry !== value),
                          })
                        }
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </Field>
              <Field>
                <FieldLabel>接收用户</FieldLabel>
                <div className="grid gap-2 md:grid-cols-3">
                  {users.map((item) => {
                    const value = String(item.id)
                    return (
                      <label key={value} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-2 text-sm">
                        <Checkbox
                          checked={form.user_ids.includes(value)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              user_ids: checked
                                ? [...form.user_ids, value]
                                : form.user_ids.filter((entry) => entry !== value),
                            })
                          }
                        />
                        {String(item.username ?? item.name ?? value)}
                      </label>
                    )
                  })}
                </div>
              </Field>
              <Field>
                <FieldLabel>接收组</FieldLabel>
                <div className="grid gap-2 md:grid-cols-3">
                  {groups.map((item) => {
                    const value = String(item.id)
                    return (
                      <label key={value} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-2 text-sm">
                        <Checkbox
                          checked={form.group_ids.includes(value)}
                          onCheckedChange={(checked) =>
                            setForm({
                              ...form,
                              group_ids: checked
                                ? [...form.group_ids, value]
                                : form.group_ids.filter((entry) => entry !== value),
                            })
                          }
                        />
                        {String(item.name ?? value)}
                      </label>
                    )
                  })}
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="rule-note">备注</FieldLabel>
                <Textarea id="rule-note" rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="rule-status">启用</FieldLabel>
                <Switch id="rule-status" checked={form.status} onCheckedChange={(checked) => setForm({ ...form, status: checked })} />
              </Field>
            </FieldGroup>
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => saveMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
