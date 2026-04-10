import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  createGroup,
  deleteGroup,
  getGroupList,
  getUserList,
  updateGroup,
  updateGroupMember,
} from "@/services/resources"

type GroupForm = {
  name: string
  note: string
}

const emptyForm: GroupForm = {
  name: "",
  note: "",
}

const formatDateTime = (value: unknown) => {
  if (!value) {
    return "-"
  }
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN")
}

export function GroupManagementPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState("")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<GroupForm>(emptyForm)
  const [memberOpen, setMemberOpen] = useState(false)
  const [memberGroupId, setMemberGroupId] = useState<string | null>(null)
  const [memberGroupName, setMemberGroupName] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const groupsQuery = useQuery({
    queryKey: ["system-groups", searchKeyword],
    queryFn: () => getGroupList({ page: 1, limit: 50, name: searchKeyword }),
  })
  const usersQuery = useQuery({
    queryKey: ["system-group-users"],
    queryFn: () => getUserList({ page: 1, limit: 200 }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updateGroup(editingId, form)
      }
      return createGroup(form)
    },
    onSuccess: async () => {
      toast.success("保存成功")
      setOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await queryClient.invalidateQueries({ queryKey: ["system-groups"] })
    },
  })

  const memberMutation = useMutation({
    mutationFn: async () => {
      if (!memberGroupId) {
        return
      }
      return updateGroupMember(memberGroupId, { member: JSON.stringify(selectedMemberIds) })
    },
    onSuccess: async () => {
      toast.success("成员已更新")
      setMemberOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["system-groups"] })
    },
  })

  const items = groupsQuery.data?.items ?? []
  const users = usersQuery.data?.items ?? []
  const selectedSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds])

  return (
    <PageLayout>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">筛选条件</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setSearchKeyword(keyword)}>
                查询
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setKeyword("")
                  setSearchKeyword("")
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
                新增组织
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="md:grid md:grid-cols-[minmax(0,1fr)]">
            <Field>
              <FieldLabel htmlFor="group-keyword">组织名</FieldLabel>
              <Input id="group-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">组织列表</CardTitle>
            <Badge variant="secondary">共 {items.length} 个组织</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>组织名</TableHead>
              <TableHead>说明</TableHead>
              <TableHead>成员</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const id = String(item.id ?? "")
              const members = String(item.member ?? "")
                .split(",")
                .map((member) => member.trim())
                .filter(Boolean)
              return (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell>{String(item.name ?? "-")}</TableCell>
                  <TableCell>{String(item.note ?? "-")}</TableCell>
                  <TableCell>{members.length ? `${members.length} 人` : "-"}</TableCell>
                  <TableCell>{formatDateTime(item.created)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(id)
                          setForm({
                            name: String(item.name ?? ""),
                            note: String(item.note ?? ""),
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
                        onClick={() => {
                          setMemberGroupId(id)
                          setMemberGroupName(String(item.name ?? ""))
                          setSelectedMemberIds(members)
                          setMemberOpen(true)
                        }}
                      >
                        <Users data-icon="inline-start" />
                        成员
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!window.confirm("确认删除该组织吗？")) {
                            return
                          }
                          await deleteGroup(id)
                          toast.success("删除成功")
                          await queryClient.invalidateQueries({ queryKey: ["system-groups"] })
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑组织" : "新增组织"}</DialogTitle>
          </DialogHeader>
          <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardContent className="p-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="group-name">组织名</FieldLabel>
                  <Input id="group-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="group-note">备注</FieldLabel>
                  <Textarea id="group-note" rows={4} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => saveMutation.mutate()}>{editingId ? "保存修改" : "创建组织"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{memberGroupName} - 成员维护</DialogTitle>
          </DialogHeader>
          <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">成员列表</CardTitle>
                <Badge variant="secondary">{selectedMemberIds.length} 人</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh]">
                <div className="flex flex-col gap-3 p-4">
                  {users.map((user) => {
                    const id = String(user.id ?? "")
                    const checked = selectedSet.has(id)
                    return (
                      <label key={id} className="flex items-center gap-3 rounded-md border bg-muted/10 p-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setSelectedMemberIds((current) => {
                              if (value) {
                                return current.includes(id) ? current : [...current, id]
                              }
                              return current.filter((item) => item !== id)
                            })
                          }}
                        />
                        <div className="flex flex-col gap-1">
                          <span>{String(user.username ?? "-")}</span>
                          <span className="text-sm text-muted-foreground">{String(user.email ?? user.phone ?? "-")}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>取消</Button>
            <Button onClick={() => memberMutation.mutate()}>保存成员</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
