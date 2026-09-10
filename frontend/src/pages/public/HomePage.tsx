import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton, Container, Box, AspectRatio } from '@shehandon/vcs-ui'
import { getProducts } from '../../api/products'
import { ProductCard } from '../../components/ui/ProductCard'
import { ProductCardSkeleton } from '../../components/ui/ProductCardSkeleton'
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

// Sits as the final tile in the Featured grid; matches the product card's
// 3/4 image shape and links through to the full shop.
function SeeMoreCard() {
  return (
    <Link to="/shop" className={styles.seeMore} aria-label="See more products in the shop">
      <AspectRatio ratio="3 / 4">
        <span className={styles.seeMoreInner}>
          See more
          <ChevronRight size={18} strokeWidth={1.5} />
        </span>
      </AspectRatio>
    </Link>
  )
}

// Featured products. Desktop: a multi-row 4-col grid (arrows hidden via CSS).
// Tablet/mobile: a snap-scrolling carousel driven by the prev/next arrows.
function FeaturedSection({ products }: { products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, products.length])

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <Box as="section" className={styles.featured}>
      <div className={styles.featuredHeader}>
        <h2 className={styles.sectionTitle}>Featured</h2>
        <div className={styles.carouselArrows}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            aria-label="Previous products"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            aria-label="Next products"
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className={styles.featuredScroller}>
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
        <SeeMoreCard />
      </div>
    </Box>
  )
}

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [slides, setSlides] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Two calls: the hero draws from all products, the Featured section only
    // from products flagged is_featured (a client-side filter would be wrong
    // once pagination kicks in).
    void Promise.all([
      getProducts({ page: 1, page_size: 8 }),
      getProducts({ page: 1, page_size: 8, featured: true }),
    ])
      .then(([all, feat]) => {
        // Desktop shows a multi-row 4-col grid (up to 7 products + the "See
        // more" tile = 8 = two full rows); tablet/mobile show these as a
        // horizontal carousel with "See more" as the last slide.
        setFeatured(feat.items.slice(0, 7))
        const imgs = all.items
          .flatMap((p) => p.images)
          .filter((img) => img.url)
          .map((img) => img.url)
          .slice(0, 6)
        setSlides(imgs)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <Skeleton variant="rect" animation="shimmer" className={styles.hero} />
        <Container size="lg" padding="6">
          <Box as="section" className={styles.featured}>
            <h2 className={styles.sectionTitle}>Featured</h2>
            <div className={styles.featuredScroller}>
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          </Box>
        </Container>
      </>
    )
  }

  // On the 4-column desktop grid, "See more" would orphan on its own row when
  // (products + 1) % 4 === 1 — i.e. when the product count is a multiple of 4 —
  // so drop one in that case. Tablet/mobile render as a carousel (one scroll
  // row), where orphaning can't happen.
  const shownFeatured =
    featured.length > 0 && featured.length % 4 === 0 ? featured.slice(0, -1) : featured

  return (
    <>
      <HeroCarousel slides={slides} />

      <Container size="lg" padding="6">
        {shownFeatured.length > 0 && <FeaturedSection products={shownFeatured} />}

        <CollaboratorsSection />
      </Container>
    </>
  )
}
