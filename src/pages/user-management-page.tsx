import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { createUser, deleteUser, getUserList, updateUser } from "@/services/resources"

type UserForm = {
  username: string
  password: string
  role: string
  email: string
  phone: string
  wechat: string
  wechat_robot_key: string
  ding_talk: string
  status: string
}

const emptyForm: UserForm = {
  username: "",
  password: "",
  role: "user",
  email: "",
  phone: "",
  wechat: "",
  wechat_robot_key: "",
  ding_talk: "",
  status: "0",
}

const formatDateTime = (value: unknown) => {
  if (!value) {
    return "-"
  }
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN")
}

const maskValue = (value: unknown) => {
  const text = String(value ?? "")
  if (!text) {
    return "-"
  }
  if (text.length <= 8) {
    return "********"
  }
  return `${text.slice(0, 4)}****${text.slice(-4)}`
}

const roleLabel = (value: unknown) => (String(value) === "admin" ? "管理员" : "普通用户")

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState("")
  const [searchUsername, setSearchUsername] = useState("")
  const [status, setStatus] = useState("")
  const [searchStatus, setSearchStatus] = useState("")
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [visibleSecretIds, setVisibleSecretIds] = useState<string[]>([])

  const usersQuery = useQuery({
    queryKey: ["system-users", searchUsername, searchStatus],
    queryFn: () => getUserList({ page: 1, limit: 50, username: searchUsername, status: searchStatus }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const payload: Record<string, unknown> = {
          role: form.role,
          email: form.email,
          phone: form.phone,
          wechat: form.wechat,
          wechat_robot_key: form.wechat_robot_key,
          ding_talk: form.ding_talk,
          status: Number(form.status),
        }
        if (form.password) {
          payload.password = form.password
        }
        return updateUser(editingId, payload)
      }
      return createUser(form)
    },
    onSuccess: async () => {
      toast.success("保存成功")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ["system-users"] })
    },
  })

  const items = usersQuery.data?.items ?? []
  const visibleSecretSet = useMemo(() => new Set(visibleSecretIds), [visibleSecretIds])

  return (
    <PageLayout>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSearchUsername(username)
                  setSearchStatus(status)
                }}
              >
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setUsername("")
                  setStatus("")
                  setSearchUsername("")
                  setSearchStatus("")
                }}
              >
                重置
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新增用户
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="lg:grid lg:grid-cols-[minmax(0,1fr)_180px]">
            <Field>
              <FieldLabel htmlFor="user-username">用户名</FieldLabel>
              <Input id="user-username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>状态</FieldLabel>
              <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="0">启用</SelectItem>
                    <SelectItem value="1">禁用</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">用户列表</CardTitle>
            <Badge variant="secondary">共 {items.length} 位用户</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>手机</TableHead>
              <TableHead>微信</TableHead>
              <TableHead>企业微信机器人</TableHead>
              <TableHead>钉钉</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const id = String(item.id ?? "")
              const enabled = String(item.status ?? "0") === "0"
              return (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell className="font-medium">{String(item.username ?? "-")}</TableCell>
                  <TableCell>
                    <Badge variant={String(item.role ?? "") === "admin" ? "secondary" : "outline"}>{roleLabel(item.role)}</Badge>
                  </TableCell>
                  <TableCell>{String(item.email ?? "-")}</TableCell>
                  <TableCell>{String(item.phone ?? "-")}</TableCell>
                  <TableCell>{String(item.wechat ?? "-")}</TableCell>
                  <TableCell>
                    {String(item.wechat_robot_key ?? "") ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate">
                          {visibleSecretSet.has(id) ? String(item.wechat_robot_key ?? "-") : maskValue(item.wechat_robot_key)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setVisibleSecretIds((current) =>
                              current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
                            )
                          }
                        >
                          {visibleSecretSet.has(id) ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{String(item.ding_talk ?? "-")}</TableCell>
                  <TableCell>{formatDateTime(item.created)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={enabled}
                        onCheckedChange={async (checked) => {
                          if (!checked && String(item.username ?? "") === "admin") {
                            toast.error("不能禁用 admin 用户")
                            return
                          }
                          await updateUser(id, { status: checked ? 0 : 1 })
                          toast.success("状态已更新")
                          await queryClient.invalidateQueries({ queryKey: ["system-users"] })
                        }}
                      />
                      <span className="text-sm text-muted-foreground">{enabled ? "启用" : "禁用"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(id)
                          setForm({
                            username: String(item.username ?? ""),
                            password: "",
                            role: String(item.role ?? "user"),
                            email: String(item.email ?? ""),
                            phone: String(item.phone ?? ""),
                            wechat: String(item.wechat ?? ""),
                            wechat_robot_key: String(item.wechat_robot_key ?? ""),
                            ding_talk: String(item.ding_talk ?? ""),
                            status: String(item.status ?? "0"),
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
                          if (String(item.username ?? "") === "admin") {
                            toast.error("不能删除 admin 用户")
                            return
                          }
                          if (!window.confirm("确认删除该用户吗？")) {
                            return
                          }
                          await deleteUser(id)
                          toast.success("删除成功")
                          await queryClient.invalidateQueries({ queryKey: ["system-users"] })
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
            <DialogTitle>{editingId ? "编辑用户" : "新增用户"}</DialogTitle>
          </DialogHeader>
          <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="form-username">用户名</FieldLabel>
                  <Input
                    id="form-username"
                    disabled={!!editingId}
                    value={form.username}
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
                  />
                </Field>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="form-password">密码</FieldLabel>
                    <Input
                      id="form-password"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder={editingId ? "留空则不修改" : "请输入密码"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>角色</FieldLabel>
                    <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="form-email">邮箱</FieldLabel>
                    <Input id="form-email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="form-phone">手机</FieldLabel>
                    <Input id="form-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                  </Field>
                </FieldGroup>
                <FieldGroup className="md:grid md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="form-wechat">微信</FieldLabel>
                    <Input id="form-wechat" value={form.wechat} onChange={(event) => setForm({ ...form, wechat: event.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="form-ding">钉钉</FieldLabel>
                    <Input
                      id="form-ding"
                      value={form.ding_talk}
                      onChange={(event) => setForm({ ...form, ding_talk: event.target.value })}
                    />
                  </Field>
                </FieldGroup>
                <Field>
                  <FieldLabel htmlFor="form-robot-key">企业微信机器人 Key</FieldLabel>
                  <Input
                    id="form-robot-key"
                    type="password"
                    value={form.wechat_robot_key}
                    onChange={(event) => setForm({ ...form, wechat_robot_key: event.target.value })}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate()}>{editingId ? "保存修改" : "创建用户"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
