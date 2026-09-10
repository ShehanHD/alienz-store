import { Modal } from '@shehandon/vcs-ui'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Dialog({ open, onClose, title, children }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {children}
    </Modal>
  )
}
