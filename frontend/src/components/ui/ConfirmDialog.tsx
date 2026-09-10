import { useEffect, useRef } from 'react'
import { Modal } from '@shehandon/vcs-ui'
import { useConfirmContext } from '../../contexts/ConfirmContext'
import { Button } from './Button'

export function ConfirmDialog() {
  const { state, resolve } = useConfirmContext()
  const confirmBtnRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)

  useEffect(() => {
    if (state.isOpen) confirmBtnRef.current?.focus()
  }, [state.isOpen])

  const { message, options } = state
  const confirmLabel = options.confirmLabel ?? 'Confirm'
  const variant = options.variant ?? 'default'

  return (
    <Modal
      open={state.isOpen}
      onClose={() => resolve(false)}
      title={options.title}
      description={message}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => resolve(false)}>
            Cancel
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => resolve(true)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
