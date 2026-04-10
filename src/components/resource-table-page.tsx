import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { JsonEditorDialog } from "@/components/json-editor-dialog"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

type ResourceTablePageProps = {
  title: string
  queryKey: string
  fetcher: () => Promise<unknown[] | { items?: unknown[] }>
  creator?: (payload: object) => Promise<unknown>
  updater?: (id: string | number, payload: object) => Promise<unknown>
  remover?: (id: string | number) => Promise<unknown>
  idField?: string
}

export function ResourceTablePage({
  title,
  queryKey,
  fetcher,
  creator,
  updater,
  remover,
  idField = "id",
}: ResourceTablePageProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Record<string, unknown> | undefined>()
  const [creating, setCreating] = useState(false)
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: fetcher,
  })

  const items = useMemo(() => {
    const data = query.data
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[]
    }
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
      return (data as { items: Record<string, unknown>[] }).items
    }
    return []
  }, [query.data])

  const columns = useMemo(() => {
    const first = items[0]
    return first ? Object.keys(first).slice(0, 8) : []
  }, [items])

  return (
    <PageLayout
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          {creator ? (
            <Button onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              新建
            </Button>
          ) : null}
        </div>
      }
    >
      {items.length ? (
        <ScrollArea className="max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const identifier = (item[idField] as string | number | undefined) ?? index
                return (
                  <TableRow key={String(identifier)}>
                    {columns.map((column) => (
                      <TableCell key={column} className="max-w-60 truncate align-top">
                        {String(item[column] ?? "--")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-2">
                        {updater ? (
                          <Button size="sm" variant="outline" onClick={() => setEditing(item)}>
                            <Pencil />
                            编辑
                          </Button>
                        ) : null}
                        {remover ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await remover(identifier)
                              toast.success("删除成功")
                              await queryClient.invalidateQueries({ queryKey: [queryKey] })
                            }}
                          >
                            <Trash2 />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>暂无数据</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void query.refetch()}>
              刷新
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {creator ? (
        <JsonEditorDialog
          open={creating}
          title={`${title} - 新建`}
          onOpenChange={setCreating}
          onSubmit={async (payload) => {
            await creator(payload)
            toast.success("创建成功")
            await queryClient.invalidateQueries({ queryKey: [queryKey] })
          }}
        />
      ) : null}
      {editing && updater ? (
        <JsonEditorDialog
          open={!!editing}
          title={`${title} - 编辑`}
          initialValue={editing}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(undefined)
            }
          }}
          onSubmit={async (payload) => {
            const identifier = (editing[idField] as string | number | undefined) ?? ""
            await updater(identifier, payload)
            toast.success("更新成功")
            await queryClient.invalidateQueries({ queryKey: [queryKey] })
            setEditing(undefined)
          }}
        />
      ) : null}
    </PageLayout>
  )
}
