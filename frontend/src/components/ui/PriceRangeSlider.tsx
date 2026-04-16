import styles from './PriceRangeSlider.module.css'

interface Props {
  min: number
  max: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
}

export function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }: Props) {
  const rangeMin = Math.min(valueMin, valueMax)
  const rangeMax = Math.max(valueMin, valueMax)

  const leftPct = ((rangeMin - min) / (max - min)) * 100
  const widthPct = ((rangeMax - rangeMin) / (max - min)) * 100

  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), rangeMax)
    onChange(val, rangeMax)
  }

  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), rangeMin)
    onChange(rangeMin, val)
  }

  return (
    <div className={styles.wrapper}>
      {/* Track */}
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
      </div>

      {/* Min handle */}
      <input
        type="range"
        className={styles.thumb}
        min={min}
        max={max}
        value={rangeMin}
        onChange={handleMin}
        aria-label="Minimum price"
      />

      {/* Max handle */}
      <input
        type="range"
        className={styles.thumb}
        min={min}
        max={max}
        value={rangeMax}
        onChange={handleMax}
        aria-label="Maximum price"
      />

      {/* Labels */}
      <div className={styles.labels}>
        <span>€{rangeMin}</span>
        <span>€{rangeMax}</span>
      </div>
    </div>
  )
}
