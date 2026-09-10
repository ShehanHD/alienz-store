import { Input as VcsInput } from '@shehandon/vcs-ui'
import type { InputProps as VcsInputProps } from '@shehandon/vcs-ui'

interface Props extends Omit<VcsInputProps, 'error' | 'label'> {
  readonly label: string
  readonly error?: string
}

export function Input({ label, error, ...rest }: Props) {
  return <VcsInput label={label} error={!!error} helperText={error} {...rest} />
}
