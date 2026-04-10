import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Navigate, useNavigate } from "react-router-dom"

import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { checkDatabase, doInstall } from "@/services/core"
import { useSystemStore } from "@/stores/system-store"

type InstallForm = {
  dbtype: string
  dbhost: string
  dbuser: string
  dbpass: string
  dbname: string
  dbport: string
  httpport: string
  runmode: string
  timeout: string
}

export function InstallPage() {
  const navigate = useNavigate()
  const installed = useSystemStore((state) => state.installed)
  const { register, handleSubmit, getValues } = useForm<InstallForm>({
    defaultValues: {
      dbtype: "mysql",
      dbhost: "127.0.0.1",
      dbuser: "root",
      dbpass: "",
      dbname: "zbxtable",
      dbport: "3306",
      httpport: "8088",
      runmode: "prod",
      timeout: "12",
    },
  })

  if (installed) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <PageLayout>
        <Card className="border-0 shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">安装配置</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit(async (values) => {
                await doInstall(values)
                toast.success("安装完成")
                navigate("/login")
              })}
            >
              <FieldGroup>
                {[
                  ["dbtype", "数据库类型"],
                  ["dbhost", "数据库地址"],
                  ["dbuser", "数据库用户"],
                  ["dbpass", "数据库密码"],
                  ["dbname", "数据库名称"],
                  ["dbport", "数据库端口"],
                  ["httpport", "服务端口"],
                  ["runmode", "运行模式"],
                  ["timeout", "会话超时"],
                ].map(([key, label]) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={key}>{label}</FieldLabel>
                    <Input id={key} type={key.includes("pass") ? "password" : "text"} {...register(key as keyof InstallForm)} />
                  </Field>
                ))}
              </FieldGroup>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await checkDatabase(getValues())
                    toast.success("数据库连接正常")
                  }}
                >
                  检查数据库
                </Button>
                <Button type="submit">执行安装</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  )
}
