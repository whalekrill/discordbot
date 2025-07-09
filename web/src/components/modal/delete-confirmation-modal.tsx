'use client'

import { AppModal } from '@/components/app-modal'

interface DeleteConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
  title?: string
  message?: string
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isDeleting,
  title = 'Delete wallet',
  message = 'Confirm deletion?',
}: DeleteConfirmationModalProps) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submit={onConfirm}
      submitDisabled={isDeleting}
      submitLabel={isDeleting ? 'Deleting...' : 'Delete'}
      cancel={onCancel}
      cancelLabel="Cancel"
    >
      {message}
    </AppModal>
  )
}
