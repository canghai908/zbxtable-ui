import { useMutation, useQuery } from "@tanstack/react-query"
import { RefreshCw, Rocket } from "lucide-react"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { checkSystemUpdate, doSystemUpdate, getSystemVersion } from "@/services/resources"

declare const __APP_VERSION__: string

export function VersionPage() {
  const versionQuery = useQuery({ queryKey: ["system-version"], queryFn: getSystemVersion })
  const checkUpdateMutation = useMutation({ mutationFn: checkSystemUpdate })
  const doUpdateMutation = useMutation({
    mutationFn: doSystemUpdate,
    onSuccess: (data) => {
      toast.success("更新已完成，请按提示重启服务")
      const restart = String(data?.needRestart ?? "")
      if (restart) {
        window.alert("更新成功，请手动执行 `systemctl restart zbxtable` 后刷新页面。")
      }
    },
  })

  const updateInfo = checkUpdateMutation.data

  return (
    <PageLayout>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">v{__APP_VERSION__}</div>
          </CardHeader>
          <CardContent className="grid gap-2 p-3 text-sm">
            <div>前端版本：{__APP_VERSION__}</div>
            <div>后端版本：{String(versionQuery.data?.version ?? "-")}</div>
            <div>Git Hash：{String(versionQuery.data?.gitHash ?? "-")}</div>
            <div>构建时间：{String(versionQuery.data?.buildTime ?? "-")}</div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="text-sm font-medium">系统更新</div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex gap-2">
              <Button onClick={() => checkUpdateMutation.mutate()}>
                <RefreshCw data-icon="inline-start" />
                检查更新
              </Button>
              <Button
                variant="outline"
                disabled={!updateInfo?.hasUpdate}
                onClick={() => {
                  if (window.confirm(`确认升级到 ${String(updateInfo?.latestVersion ?? "")} 吗？`)) {
                    doUpdateMutation.mutate()
                  }
                }}
              >
                <Rocket data-icon="inline-start" />
                立即升级
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {updateInfo ? (
                updateInfo.hasUpdate ? (
                  <span className="text-sm font-medium">发现新版本</span>
                ) : (
                  <span className="text-sm text-muted-foreground">已是最新版本</span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">未检查更新</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">升级完成后请手动执行 `systemctl restart zbxtable`。</div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
