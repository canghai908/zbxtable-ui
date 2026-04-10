import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Eye, Pencil, Plus, Share2, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteTopology, getTopologyList, updateTopologyStatus } from "@/services/resources"

const formatDateTime = (value: unknown) => {
  if (!value) {
    return "-"
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleString("zh-CN")
}

export function TopologyListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState("")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const listQuery = useQuery({
    queryKey: ["topology-list", searchKeyword, page, pageSize],
    queryFn: () => getTopologyList({ page, limit: pageSize, name: searchKeyword }),
  })

  const toggleShareMutation = useMutation({
    mutationFn: (id: string | number) => updateTopologyStatus({ id }),
    onSuccess: async () => {
      toast.success("共享状态已更新")
      await queryClient.invalidateQueries({ queryKey: ["topology-list"] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string | number) => deleteTopology(id),
    onSuccess: async () => {
      toast.success("删除成功")
      await queryClient.invalidateQueries({ queryKey: ["topology-list"] })
    },
  })

  const items = listQuery.data?.items ?? []
  const total = Number(listQuery.data?.total ?? 0)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const copyShareLink = async (id: string | number) => {
    const url = `${window.location.origin}/share/topology?id=${id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("共享链接已复制")
    } catch {
      window.prompt("请手动复制链接", url)
    }
  }

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
                  setPage(1)
                }}
              >
                重置
              </Button>
              <Button size="sm" onClick={() => navigate("/topology/detail")}>
                <Plus data-icon="inline-start" />
                新建拓扑
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <FieldGroup className="md:grid md:grid-cols-[minmax(0,1fr)]">
            <Field>
              <FieldLabel htmlFor="topology-keyword">拓扑名称</FieldLabel>
              <Input
                id="topology-keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="请输入拓扑名称"
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">拓扑列表</CardTitle>
            <Badge variant="secondary">共 {total} 条拓扑</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-w-full">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>拓扑名称</TableHead>
              <TableHead>共享状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const id = String(item.id ?? "")
              const isShared = String(item.status ?? "0") === "1"
              return (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell>{String(item.topology ?? "-")}</TableCell>
                  <TableCell>
                    <Badge variant={isShared ? "secondary" : "outline"}>{isShared ? "已共享" : "未共享"}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                  <TableCell>{formatDateTime(item.updated_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleShareMutation.mutate(id)}>
                        <Share2 data-icon="inline-start" />
                        {isShared ? "取消共享" : "共享"}
                      </Button>
                      {isShared ? (
                        <Button size="sm" variant="outline" onClick={() => void copyShareLink(id)}>
                          <Copy data-icon="inline-start" />
                          复制链接
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => navigate(`/topology/detail?id=${id}`)}>
                        <Pencil data-icon="inline-start" />
                        编辑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/topology/show?id=${id}`)}>
                        <Eye data-icon="inline-start" />
                        预览
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm("确认删除该拓扑吗？")) {
                            removeMutation.mutate(id)
                          }
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
    </PageLayout>
  )
}
