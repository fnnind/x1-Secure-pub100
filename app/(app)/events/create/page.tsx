import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/user'
import { CreateEventForm } from '@/components/event/CreateEventForm'

export default async function CreateEventPage() {
  const user = await getUser()
  if ('error' in user) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/events" className="text-sm text-muted-foreground hover:underline">
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Create new Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an event without a publication. You can link a publication or SubXeuron later.
        </p>
      </div>
      <CreateEventForm />
    </div>
  )
}
