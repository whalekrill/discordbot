import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { ReactNode } from 'react'

export function AppModal({
  children,
  title,
  submit,
  submitDisabled,
  submitLabel,
  open,
  onOpenChange,
  trigger,
  cancel,
  cancelLabel,
}: {
  children: ReactNode
  title: string
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  cancel?: () => void
  cancelLabel?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">{children}</div>
        <DialogFooter>
          <div className="flex gap-2 justify-end">
            {cancel && (
              <Button variant="outline" onClick={cancel} className="cursor-pointer">
                {cancelLabel || 'Cancel'}
              </Button>
            )}
            {submit && (
              <Button type="submit" onClick={submit} disabled={submitDisabled} className="cursor-pointer">
                {submitLabel || 'Save'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
