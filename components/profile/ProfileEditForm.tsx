'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateUserProfileAction } from '@/action/updateUserProfile'
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

  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [lastName, setLastName] = useState(profile.lastName ?? '')
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '))
  const [expertise, setExpertise] = useState((profile.expertise ?? []).join(', '))
  const [category, setCategory] = useState<UserCategory | ''>(profile.category ?? '')
  const [innovationSummary, setInnovationSummary] = useState(profile.innovationSummary ?? '')
  const [isProfilePublic, setIsProfilePublic] = useState(profile.isProfilePublic ?? false)

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
