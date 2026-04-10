import { useForm, useWatch } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { changePassword } from "@/services/resources"

type FormValues = {
  old: string
  next: string
  confirm: string
}

export function ChangePasswordPage() {
  const form = useForm<FormValues>({
    defaultValues: {
      old: "",
      next: "",
      confirm: "",
    },
  })
  const { control, register, handleSubmit, reset } = form

  const nextPassword = useWatch({ control, name: "next" })
  const confirmPassword = useWatch({ control, name: "confirm" })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => changePassword({ old: values.old, new: values.next }),
    onSuccess: () => {
      toast.success("密码修改成功")
      reset()
    },
  })

  return (
    <PageLayout>
      <Card className="max-w-2xl border-0 shadow-none ring-1 ring-border/60">
        <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
          <CardTitle className="text-sm font-medium">修改当前账号密码</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <form
            className="flex flex-col gap-6"
            onSubmit={handleSubmit(async (values) => {
              if (!values.old || !values.next) {
                toast.error("请完整填写密码信息")
                return
              }
              if (values.next.length < 6) {
                toast.error("新密码至少 6 位")
                return
              }
              if (values.next !== values.confirm) {
                toast.error("两次输入的新密码不一致")
                return
              }
              await mutation.mutateAsync(values)
            })}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password-old">当前密码</FieldLabel>
                <Input id="password-old" type="password" autoComplete="current-password" {...register("old")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password-next">新密码</FieldLabel>
                <Input id="password-next" type="password" autoComplete="new-password" {...register("next")} />
              </Field>
              <Field data-invalid={(Boolean(confirmPassword) && confirmPassword !== nextPassword) || undefined}>
                <FieldLabel htmlFor="password-confirm">确认新密码</FieldLabel>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(confirmPassword) && confirmPassword !== nextPassword}
                  {...register("confirm")}
                />
              </Field>
            </FieldGroup>
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                保存
              </Button>
              <Button type="button" variant="outline" onClick={() => reset()}>
                重置
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
