'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ImageIcon, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateUserProfileAction } from '@/action/updateUserProfile'
import { uploadAvatar } from '@/action/uploadAvatar'
import { toPublicImageUrl } from '@/lib/image'
import type { AppUser, UserCategory } from '@/lib/supabase/types'

const CATEGORY_LABELS: Record<UserCategory, string> = {
  researcher: 'Researcher',
  academic: 'Academic',
  industry_professional: 'Industry Professional',
  independent_scientist: 'Independent Scientist',
  builder: 'Builder',
  engineer: 'Engineer',
  professional: 'Professional',
  curiosity: 'Curious Mind',
  intellect: 'Intellect',
  other: 'Other',
}

interface Props {
  profile: AppUser
}

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Avatar state
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.imageUrl ? toPublicImageUrl(profile.imageUrl) : null
  )
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [lastName, setLastName] = useState(profile.lastName ?? '')
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '))
  const [expertise, setExpertise] = useState((profile.expertise ?? []).join(', '))
  const [category, setCategory] = useState<UserCategory | ''>(profile.category ?? '')
  const [innovationSummary, setInnovationSummary] = useState(profile.innovationSummary ?? '')
  const [isProfilePublic, setIsProfilePublic] = useState(profile.isProfilePublic ?? false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)
    setIsUploadingAvatar(true)

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload to S3 via server action
    const dataUrl = await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.readAsDataURL(file)
    })

    const result = await uploadAvatar(dataUrl, file.name)
    setIsUploadingAvatar(false)

    if ('error' in result) {
      setAvatarError(result.error)
      setAvatarPreview(profile.imageUrl ? toPublicImageUrl(profile.imageUrl) : null)
    } else {
      setAvatarPreview(result.url)
      router.refresh()
    }

    // Reset input so the same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateUserProfileAction({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        nickname: nickname.trim() || null,
        interestsRaw: interests,
        expertiseRaw: expertise,
        category: (category || null) as UserCategory | null,
        innovationSummary: innovationSummary.trim() || null,
        isProfilePublic,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">Profile updated successfully.</p>}

      {/* Avatar upload */}
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Profile picture"
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <UserCircle2 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <span className="text-xs text-white">Uploading…</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="avatar-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <ImageIcon className="h-4 w-4" />
            {avatarPreview ? 'Change photo' : 'Upload photo'}
          </label>
          <input
            id="avatar-upload"
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={isUploadingAvatar}
          />
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF · max 8 MB</p>
          {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-sm font-medium">
            First Name
          </label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={100}
            placeholder="Jane"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-sm font-medium">
            Last Name
          </label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={100}
            placeholder="Smith"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nickname" className="text-sm font-medium">
          Nickname
        </label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={50}
          placeholder={profile.username}
        />
        <p className="text-xs text-muted-foreground">Shown publicly in place of your username. Defaults to your username if left blank.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as UserCategory | '')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">— Select category —</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="interests" className="text-sm font-medium">
          Interests
        </label>
        <Input
          id="interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          maxLength={1000}
          placeholder="neuroscience, machine learning, synthetic biology"
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Max 1000 characters.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="expertise" className="text-sm font-medium">
          Expertise
        </label>
        <Input
          id="expertise"
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          maxLength={1000}
          placeholder="deep learning, CRISPR, fMRI analysis"
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Max 1000 characters.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="innovationSummary" className="text-sm font-medium">
          Innovation Summary
        </label>
        <Textarea
          id="innovationSummary"
          value={innovationSummary}
          onChange={(e) => setInnovationSummary(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Briefly describe your research focus or what you're building..."
        />
        <p className="text-xs text-muted-foreground">{innovationSummary.length}/1000</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isProfilePublic"
          checked={isProfilePublic}
          onChange={(e) => setIsProfilePublic(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <label htmlFor="isProfilePublic" className="text-sm font-medium">
          Make my profile public
        </label>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        When public, visitors can see your name, interests, expertise, category, and innovation summary. Your email is never shown.
      </p>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? 'Saving…' : 'Save Profile'}
      </Button>
    </form>
  )
}
