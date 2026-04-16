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
            >
              <div
                className={c.collab_type === 'person' ? styles.heroImagePerson : styles.heroImageLogo}
                style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
              />
              {c.collab_type === 'person' && <span className={styles.heroName}>{c.name}</span>}
            </a>
          ))}
        </div>
      )}

      {persons.length > 0 && renderStrip(persons)}
      {logos.length > 0 && renderStrip(logos)}
    </section>
  )
}
