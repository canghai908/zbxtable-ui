import { AlertTriangle, Ban } from "lucide-react"

import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

export function ForbiddenPage() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>403</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.history.back()}>
            <Ban data-icon="inline-start" />
            返回
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>404</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => (window.location.href = "/")}>
            <AlertTriangle data-icon="inline-start" />
            回到首页
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
