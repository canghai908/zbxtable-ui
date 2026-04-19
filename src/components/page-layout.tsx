import type { ReactNode } from "react"

type PageLayoutProps = {
  actions?: ReactNode
  children: ReactNode
}

export function PageLayout({ actions, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {actions ? (
        <div className="app-shell-surface flex flex-wrap items-center justify-end gap-2 rounded-xl border px-4 py-2.5">
          {actions}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 md:gap-4">{children}</div>
    </div>
  )
}
