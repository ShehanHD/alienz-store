import { type FormEvent, useEffect, useState } from 'react'
import { getAddress, upsertAddress, changePassword, updateProfile } from '../../api/account'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Address } from '../../types'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { user } = useAuth()

  // Personal info state
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Address state
  const [address, setAddress] = useState<Omit<Address, 'id' | 'user_id'>>({
    street: '', city: '', country: '', postal_code: '', is_default: false,
  })
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressSuccess, setAddressSuccess] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
      setPhone(user.phone ?? '')
    }
  }, [user])

  useEffect(() => {
    getAddress()
      .then((data) => {
        if (data) {
          setAddress({
            street: data.street,
            city: data.city,
            country: data.country,
            postal_code: data.postal_code,
            is_default: data.is_default,
          })
        }
      })
      .catch(() => {
        // Address simply not set yet — not an error worth showing
      })
  }, [])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(false)
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, phone })
      setProfileSuccess(true)
    } catch {
      setProfileError('Failed to update profile. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

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
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPwError('Failed to change password. Please check your current password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile &amp; Address</h1>

      {/* Personal info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Personal Details</h2>
        <form onSubmit={(e) => void handleProfileSubmit(e)}>
          {profileError && <p className={styles.error} role="alert">{profileError}</p>}
          {profileSuccess && <p className={styles.success} role="status">Profile updated.</p>}
          <div className={styles.row}>
            <Input label="First Name" value={firstName} onChange={(e) => { setProfileSuccess(false); setFirstName(e.target.value) }} required />
            <Input label="Last Name" value={lastName} onChange={(e) => { setProfileSuccess(false); setLastName(e.target.value) }} required />
          </div>
          <Input label="Phone" type="tel" value={phone} onChange={(e) => { setProfileSuccess(false); setPhone(e.target.value) }} required />
          <p className={styles.emailNote}>{user?.email}</p>
          <Button type="submit" loading={profileSaving}>Save Details</Button>
        </form>
      </section>

      {/* Address */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Delivery Address</h2>
        <form onSubmit={(e) => void handleAddressSubmit(e)}>
          {addressError && <p className={styles.error} role="alert">{addressError}</p>}
          {addressSuccess && <p className={styles.success} role="status">Address saved.</p>}
          <Input label="Street" value={address.street} onChange={(e) => { setAddressSuccess(false); setAddress((p) => ({ ...p, street: e.target.value })) }} required />
          <Input label="City" value={address.city} onChange={(e) => { setAddressSuccess(false); setAddress((p) => ({ ...p, city: e.target.value })) }} required />
          <div className={styles.row}>
            <Input label="Country" value={address.country} onChange={(e) => { setAddressSuccess(false); setAddress((p) => ({ ...p, country: e.target.value })) }} required />
            <Input label="Postal Code" value={address.postal_code} onChange={(e) => { setAddressSuccess(false); setAddress((p) => ({ ...p, postal_code: e.target.value })) }} required />
          </div>
          <Button type="submit" loading={addressSaving}>Save Address</Button>
        </form>
      </section>

      {/* Password */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={(e) => void handlePasswordSubmit(e)}>
          {pwError && <p className={styles.error} role="alert">{pwError}</p>}
          {pwSuccess && <p className={styles.success} role="status">Password changed.</p>}
          <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => { setPwSuccess(false); setCurrentPassword(e.target.value) }} required />
          <Input label="New Password" type="password" value={newPassword} onChange={(e) => { setPwSuccess(false); setNewPassword(e.target.value) }} required />
          <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => { setPwSuccess(false); setConfirmPassword(e.target.value) }} required />
          <Button type="submit" loading={pwSaving}>Change Password</Button>
        </form>
      </section>
    </div>
  )
}
