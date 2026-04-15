import { useEffect, useState } from 'react'
import { getCollaborators } from '../../api/collaborators'
import type { Collaborator } from '../../types'
import styles from './CollaboratorsSection.module.css'

export function CollaboratorsSection() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  useEffect(() => {
    getCollaborators().then(setCollaborators).catch(() => {})
  }, [])

  if (collaborators.length === 0) return null

  const featured = collaborators.filter(c => c.is_featured)
  const strip = collaborators.filter(c => !c.is_featured)

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Collaborators</h2>

      {featured.length > 0 && (
        <div className={styles.heroRow}>
          {featured.map(c => (
            <a
              key={c.id}
              href={c.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroCard}
              style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
            >
              <span className={styles.heroName}>{c.name}</span>
            </a>
          ))}
        </div>
      )}

      {strip.length > 0 && (
        <div className={styles.stripWrap}>
          <div className={styles.strip}>
            {[...strip, ...strip].map((c, i) => (
              <a
                key={`${c.id}-${i}`}
                href={c.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.stripItem}
              >
                <div
                  className={styles.stripImage}
                  style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
                />
                <span className={styles.stripName}>{c.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
