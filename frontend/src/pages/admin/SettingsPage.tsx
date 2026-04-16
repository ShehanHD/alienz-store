import { useEffect, useState } from 'react'
import { getSiteConfig, updateSiteConfig } from '../../api/admin'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/PageLoader'
import type { SiteConfig } from '../../types'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const [configs, setConfigs] = useState<SiteConfig[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSiteConfig()
      .then((data) => {
        setConfigs(data)
        const initial: Record<string, string> = {}
        data.forEach((c) => { initial[c.key] = c.value })
        setValues(initial)
      })
      .catch(() => setLoadError('Failed to load settings. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(key: string) {
    setSaveError(null)
    setSaveSuccess(false)
    setSaving(true)
    try {
      const updated = await updateSiteConfig(key, values[key] ?? '')
      setConfigs((prev) => prev.map((c) => (c.key === key ? updated : c)))
      setSaveSuccess(true)
    } catch {
      setSaveError(`Failed to save setting "${key}". Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>Site Settings</h1>

      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      {saveSuccess && <p className={styles.success}>Setting saved successfully.</p>}

      {configs.length === 0 ? (
        <p>No settings found.</p>
      ) : (
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.key}>
                <td>{config.key}</td>
                <td>
                  <input
                    type="text"
                    value={values[config.key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <Button type="button" variant="secondary" loading={saving} onClick={() => void handleSave(config.key)}>Save</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
