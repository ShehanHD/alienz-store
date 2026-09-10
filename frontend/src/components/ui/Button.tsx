import { forwardRef } from 'react'
import { Button as VcsButton } from '@shehandon/vcs-ui'
import type { ButtonProps as VcsButtonProps } from '@shehandon/vcs-ui'

interface Props extends Omit<VcsButtonProps, 'variant'> {
  readonly variant?: 'primary' | 'secondary' | 'danger'
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function Button({ variant = 'primary', ...rest }, ref) {
    return <VcsButton ref={ref} variant={variant} {...rest} />
  }
)
