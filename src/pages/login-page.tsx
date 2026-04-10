import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getPublicSystemInfo, getRoutesConfig, login } from "@/services/core"
import { setToken } from "@/lib/session"
import { useAuthStore } from "@/stores/auth-store"
import { useSystemStore } from "@/stores/system-store"

type LoginForm = {
  username: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()
  const { systemName, systemLogo, setSystemInfo } = useSystemStore()
  const { register, handleSubmit, setValue } = useForm<LoginForm>({
    defaultValues: {
      username: "admin",
      password: "Zbxtable",
    },
  })

  useEffect(() => {
    void getPublicSystemInfo().then((data) =>
      setSystemInfo({
        systemName: data.system_name,
        systemLogo: data.system_logo || "/logo.png",
        demoMode: data.demo_mode,
      })
    )
  }, [setSystemInfo])

  useEffect(() => {
    if (import.meta.env.DEV) {
      setValue("username", "admin")
      setValue("password", "Zbxtable")
    }
  }, [setValue])

  useEffect(() => {
    document.title = `${systemName || "ZbxTable"} | 登录`
  }, [systemName])

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src={systemLogo} alt={systemName} className="size-16 rounded-xl object-cover" />
          <CardTitle>{systemName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-6"
            onSubmit={handleSubmit(async (values) => {
              const result = await login(values.username, values.password)
              setToken(result.token)
              const routes = await getRoutesConfig()
              setAuth({
                user: result.user,
                roles: result.roles,
                routes,
                demoMode: result.demo_mode,
              })
              toast.success("登录成功")
              navigate("/")
            })}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">用户名</FieldLabel>
                <Input id="username" autoComplete="username" {...register("username")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              </Field>
            </FieldGroup>
            <Button type="submit">登录</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
