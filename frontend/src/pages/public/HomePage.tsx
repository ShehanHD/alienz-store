import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getProducts } from '../../api/products'
import { ProductCard } from '../../components/ui/ProductCard'
import { CollaboratorsSection } from '../../components/ui/CollaboratorsSection'
import type { Product } from '../../types'
import styles from './HomePage.module.css'

const INTERVAL = 4500

function HeroCarousel({ slides }: { slides: string[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((i) => (i + 1) % slides.length), [slides.length])
  const prev = () => setCurrent((i) => (i - 1 + slides.length) % slides.length)

  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(next, INTERVAL)
    return () => clearInterval(id)
  }, [next, slides.length])

  return (
    <section className={styles.hero}>
      {/* Slides */}
      <div className={styles.carousel} aria-hidden="true">
        {slides.length === 0
          ? <div className={styles.carouselFallback} />
          : slides.map((src, i) => (
            <div
              key={src}
              className={`${styles.carouselSlide} ${i === current ? styles.carouselSlideActive : ''}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))
        }
        <div className={styles.carouselOverlay} />
      </div>

      {/* Text */}
      <div className={styles.heroContent}>
        <h1>New Season,<br />New Stories</h1>
        <p>Curated luxury for the discerning few</p>
        <Link to="/shop" className={styles.cta}>Explore Collection</Link>
      </div>

      {/* Controls */}
      {slides.length > 1 && (
        <>
          <button className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`} onClick={prev} aria-label="Previous slide">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button className={`${styles.carouselArrow} ${styles.carouselArrowRight}`} onClick={next} aria-label="Next slide">
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
          <div className={styles.carouselDots}>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [slides, setSlides] = useState<string[]>([])

  useEffect(() => {
    void getProducts({ page: 1, page_size: 8 }).then((r) => {
      setFeatured(r.items.slice(0, 4))
      const imgs = r.items
        .flatMap((p) => p.images)
        .filter((img) => img.url)
        .map((img) => img.url)
        .slice(0, 6)
      setSlides(imgs)
    })
  }, [])

  return (
    <>
      <HeroCarousel slides={slides} />

      <div className={styles.page}>
        {featured.length > 0 && (
          <section className={styles.featured}>
            <h2>Featured</h2>
            <div className={styles.grid}>
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <CollaboratorsSection />
      </div>
    </>
  )
}
