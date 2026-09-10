import { Badge } from '@shehandon/vcs-ui'
import styles from './Chip.module.css'

interface Props {
  readonly selected: boolean
  readonly onClick: () => void
  readonly children: React.ReactNode
  readonly title?: string
  readonly icon?: React.ReactNode
}

export function Chip({ selected, onClick, children, title, icon }: Props) {
  return (
    <button type="button" className={styles.chipBtn} onClick={onClick} aria-pressed={selected} title={title}>
      <Badge variant={selected ? 'subtle' : 'outline'} color="default" icon={icon} size="md" className={selected ? styles.selected : undefined}>
        {children}
      </Badge>
    </button>
  )
}
