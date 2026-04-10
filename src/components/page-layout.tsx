import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

type PageLayoutProps = {
  actions?: ReactNode
  children: ReactNode
}

export function PageLayout({ actions, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="border-0 shadow-none ring-1 ring-border/60">
        <CardContent className="p-3">
          {actions ? <div className="mb-4 flex flex-wrap justify-end gap-2">{actions}</div> : null}
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
