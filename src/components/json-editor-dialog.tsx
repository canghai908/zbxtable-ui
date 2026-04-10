import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type JsonEditorDialogProps = {
  open: boolean
  title: string
  initialValue?: object
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: object) => Promise<void> | void
}

export function JsonEditorDialog({
  open,
  title,
  initialValue,
  onOpenChange,
  onSubmit,
}: JsonEditorDialogProps) {
  const [value, setValue] = useState(() => JSON.stringify(initialValue ?? {}, null, 2))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardContent className="p-3">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="payload-json">Payload</FieldLabel>
                <Textarea
                  id="payload-json"
                  rows={18}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit(JSON.parse(value))
              onOpenChange(false)
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
