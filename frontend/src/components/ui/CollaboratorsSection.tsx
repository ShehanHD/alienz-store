import { useEffect, useState } from 'react'
import { Skeleton, Box, Stack, Grid } from '@shehandon/vcs-ui'
import { getCollaborators } from '../../api/collaborators'
import type { Collaborator } from '../../types'
import styles from './CollaboratorsSection.module.css'

export function CollaboratorsSection() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCollaborators().then(setCollaborators).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box as="section" mt="8" aria-hidden="true">
        <h2 className={styles.heading}>Collaborators</h2>
        <Stack direction="column" gap="6">
          <Grid columns={{ base: 1, sm: 2 }} gap="4">
            {[0, 1].map((i) => (
              <Stack key={i} direction="column" align="center" gap="3">
                <Skeleton variant="circle" animation="shimmer" width={140} height={140} />
                <Skeleton variant="text" animation="shimmer" width={80} />
              </Stack>
            ))}
          </Grid>
          <Stack direction="row" justify="center" gap="8">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="circle" animation="shimmer" width={72} height={72} />
            ))}
          </Stack>
        </Stack>
      </Box>
    )
  }

  if (collaborators.length === 0) return null

  const featured = collaborators.filter(c => c.is_featured)
  const persons = collaborators.filter(c => !c.is_featured && c.collab_type === 'person')
  const logos = collaborators.filter(c => !c.is_featured && c.collab_type === 'logo')

  function renderStrip(items: Collaborator[]) {
    const scrolling = items.length > 1
    return (
      <div className={styles.stripWrap}>
        <div className={scrolling ? styles.strip : styles.stripStatic}>
          {(scrolling ? [...items, ...items] : items).map((c, i) => (
            <a
              key={`${c.id}-${i}`}
              href={c.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className={c.collab_type === 'logo' ? styles.stripItemLogo : styles.stripItem}
            >
              <div
                className={c.collab_type === 'person' ? styles.stripImagePerson : styles.stripImageLogo}
                style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
              />
              {c.collab_type === 'person' && <span className={styles.stripName}>{c.name}</span>}
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Box as="section" mt="8">
      <h2 className={styles.heading}>Collaborators</h2>

      {featured.length > 0 && (
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          {featured.map(c => (
            <a
              key={c.id}
              href={c.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroCard}
            >
              <div
                className={c.collab_type === 'person' ? styles.heroImagePerson : styles.heroImageLogo}
                style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
              />
              {c.collab_type === 'person' && <span className={styles.heroName}>{c.name}</span>}
            </a>
          ))}
        </Grid>
      )}

      {persons.length > 0 && renderStrip(persons)}
      {logos.length > 0 && renderStrip(logos)}
    </Box>
  )
}
