import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/user'
import { getUserByUsername } from '@/lib/supabase/user'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'

export default async function SettingsProfilePage() {
  const user = await getUser()
  if ('error' in user) redirect('/login')

  const profile = await getUserByUsername(user.username)
  if (!profile) redirect('/login')

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile information.
        </p>
      </div>
      <ProfileEditForm profile={profile} />
    </main>
  )
}
