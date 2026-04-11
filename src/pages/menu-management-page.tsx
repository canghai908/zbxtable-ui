import { useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createMenu, deleteMenu, getMenuList, getParentMenus, updateMenu } from "@/services/resources"

type MenuForm = {
  parent_id: string
  name: string
  path: string
  router: string
  icon: string
  role: string
  permission: string
  highlight: string
  invisible: boolean
  is_available: boolean
  cacheable: boolean
}

const emptyForm: MenuForm = {
  parent_id: "0",
  name: "",
  path: "",
  router: "",
  icon: "",
  role: "admin,user",
  permission: "",
  highlight: "",
  invisible: false,
  is_available: false,
  cacheable: false,
}

type MenuRow = Record<string, unknown> & { level: number }

function buildRows(items: Record<string, unknown>[], parentId = 0, level = 0): MenuRow[] {
  return items
    .filter((item) => Number(item.parent_id ?? 0) === parentId)
    .flatMap((item) => [{ ...item, level }, ...buildRows(items, Number(item.id ?? 0), level + 1)])
}

export function MenuManagementPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MenuForm>(emptyForm)

  const menusQuery = useQuery({ queryKey: ["menu-management"], queryFn: getMenuList })
  const parentMenusQuery = useQuery({ queryKey: ["menu-parents"], queryFn: getParentMenus })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        parent_id: Number(form.parent_id),
      }
      if (editingId) {
        return updateMenu(editingId, payload)
      }
      return createMenu(payload)
    },
    onSuccess: async () => {
      toast.success("菜单已保存")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ["menu-management"] })
      await queryClient.invalidateQueries({ queryKey: ["menu-parents"] })
    },
  })

  const rows = useMemo(() => buildRows(menusQuery.data ?? []), [menusQuery.data])
  const parentMenus = parentMenusQuery.data ?? []

  return (
    <PageLayout>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">菜单概览</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">共 {rows.length} 条菜单</Badge>
              <Button
                size="sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                新增菜单
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card className="console-panel border-0">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-sm font-medium">菜单列表</CardTitle>
            <div className="text-xs text-muted-foreground">导航层级、路由、权限与显示策略</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>路由</TableHead>
              <TableHead>图标</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>隐藏</TableHead>
              <TableHead>禁用</TableHead>
              <TableHead>缓存</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const id = String(item.id ?? "")
              const level = Number(item.level ?? 0)
              return (
                <TableRow key={id}>
                  <TableCell>
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 16}px` }}>
                      <span>{String(item.name ?? "-")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{String(item.path ?? "-")}</TableCell>
                  <TableCell>{String(item.router ?? "-")}</TableCell>
                  <TableCell>{String(item.icon ?? "-")}</TableCell>
                  <TableCell>{String(item.role ?? "-")}</TableCell>
                  <TableCell>{item.invisible ? "是" : "否"}</TableCell>
                  <TableCell>{item.is_available ? "是" : "否"}</TableCell>
                  <TableCell>{item.cacheable ? "是" : "否"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(id)
                          setForm({
                            parent_id: String(item.parent_id ?? 0),
                            name: String(item.name ?? ""),
                            path: String(item.path ?? ""),
                            router: String(item.router ?? ""),
                            icon: String(item.icon ?? ""),
                            role: String(item.role ?? "admin,user"),
                            permission: String(item.permission ?? ""),
                            highlight: String(item.highlight ?? ""),
                            invisible: Boolean(item.invisible),
                            is_available: Boolean(item.is_available),
                            cacheable: Boolean(item.cacheable),
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
                          if (!window.confirm("确认删除该菜单吗？")) {
                            return
                          }
                          await deleteMenu(id)
                          toast.success("删除成功")
                          await queryClient.invalidateQueries({ queryKey: ["menu-management"] })
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
            <DialogTitle>{editingId ? "编辑菜单" : "新增菜单"}</DialogTitle>
          </DialogHeader>
          <Card className="console-panel border-0">
            <CardContent className="p-3">
          <FieldGroup>
            <Field>
              <FieldLabel>父菜单</FieldLabel>
              <Select value={form.parent_id} onValueChange={(value) => setForm({ ...form, parent_id: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="0">根菜单</SelectItem>
                    {parentMenus.map((item) => (
                      <SelectItem key={String(item.id)} value={String(item.id)}>
                        {String(item.name ?? item.display_name ?? item.id)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <FieldGroup className="md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="menu-name">名称</FieldLabel>
                <Input id="menu-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="menu-icon">图标</FieldLabel>
                <Input id="menu-icon" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
              </Field>
            </FieldGroup>
            <FieldGroup className="md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="menu-path">路径</FieldLabel>
                <Input id="menu-path" value={form.path} onChange={(event) => setForm({ ...form, path: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="menu-router">路由键</FieldLabel>
                <Input id="menu-router" value={form.router} onChange={(event) => setForm({ ...form, router: event.target.value })} />
              </Field>
            </FieldGroup>
            <FieldGroup className="md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="menu-role">角色</FieldLabel>
                <Input id="menu-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="menu-permission">权限</FieldLabel>
                <Input
                  id="menu-permission"
                  value={form.permission}
                  onChange={(event) => setForm({ ...form, permission: event.target.value })}
                />
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="menu-highlight">高亮路径</FieldLabel>
              <Input
                id="menu-highlight"
                value={form.highlight}
                onChange={(event) => setForm({ ...form, highlight: event.target.value })}
              />
            </Field>
            <FieldGroup className="md:grid md:grid-cols-3">
              <Field orientation="horizontal">
                <FieldLabel htmlFor="menu-invisible">隐藏</FieldLabel>
                <Switch id="menu-invisible" checked={form.invisible} onCheckedChange={(checked) => setForm({ ...form, invisible: checked })} />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="menu-disabled">禁用</FieldLabel>
                <Switch id="menu-disabled" checked={form.is_available} onCheckedChange={(checked) => setForm({ ...form, is_available: checked })} />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="menu-cache">缓存</FieldLabel>
                <Switch id="menu-cache" checked={form.cacheable} onCheckedChange={(checked) => setForm({ ...form, cacheable: checked })} />
              </Field>
            </FieldGroup>
          </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate()}>{editingId ? "保存修改" : "创建菜单"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
