import { type FormEvent, useEffect, useState } from 'react'
import { getAddress, upsertAddress, changePassword } from '../../api/account'
import type { Address } from '../../types'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  // Address state
  const [address, setAddress] = useState<Omit<Address, 'id' | 'user_id' | 'is_default'>>({
    street: '',
    city: '',
    country: '',
    postal_code: '',
  })
  const [addressLoading, setAddressLoading] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressSuccess, setAddressSuccess] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    getAddress()
      .then((data) => {
        if (data) {
          setAddress({
            street: data.street,
            city: data.city,
            country: data.country,
            postal_code: data.postal_code,
          })
        }
      })
      .catch(() => setAddressError('Failed to load address. Please try again.'))
      .finally(() => setAddressLoading(false))
  }, [])

  async function handleAddressSubmit(e: FormEvent) {
    e.preventDefault()
    setAddressSaving(true)
    setAddressError(null)
    setAddressSuccess(false)
    try {
      await upsertAddress(address)
      setAddressSuccess(true)
    } catch {
      setAddressError('Failed to save address. Please try again.')
    } finally {
      setAddressSaving(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch {
      setPwError('Failed to change password. Please check your current password and try again.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile &amp; Address</h1>

      {/* Address section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Delivery Address</h2>
        {addressLoading && <p>Loading…</p>}
        {!addressLoading && (
          <form onSubmit={(e) => void handleAddressSubmit(e)}>
            {addressError && (
              <p className={styles.error} role="alert">
                {addressError}
              </p>
            )}
            {addressSuccess && (
              <p className={styles.success} role="status">
                Address saved successfully.
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="street">
                Street
              </label>
              <input
                id="street"
                className={styles.input}
                type="text"
                value={address.street}
                onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="city">
                City
              </label>
              <input
                id="city"
                className={styles.input}
                type="text"
                value={address.city}
                onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="country">
                Country
              </label>
              <input
                id="country"
                className={styles.input}
                type="text"
                value={address.country}
                onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="postal_code">
                Postal Code
              </label>
              <input
                id="postal_code"
                className={styles.input}
                type="text"
                value={address.postal_code}
                onChange={(e) => setAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
                required
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={addressSaving}>
              {addressSaving ? 'Saving…' : 'Save Address'}
            </button>
          </form>
        )}
      </section>

      {/* Password section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={(e) => void handlePasswordSubmit(e)}>
          {pwError && (
            <p className={styles.error} role="alert">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className={styles.success} role="status">
              Password changed successfully.
            </p>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="current_password">
              Current Password
            </label>
            <input
              id="current_password"
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new_password">
              New Password
            </label>
            <input
              id="new_password"
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={pwSaving}>
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  )
}
