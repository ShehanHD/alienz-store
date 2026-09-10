import { useState } from 'react'
import fadeStyles from './FadeImage.module.css'

interface Props {
  readonly src: string
  readonly alt: string
  readonly className?: string
}

export function FadeImage({ src, alt, className }: Props) {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ''} ${fadeStyles.image} ${loaded ? fadeStyles.loaded : ''}`}
    />
  )
}
