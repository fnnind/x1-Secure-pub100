import Link from 'next/link'
import { getUser } from '@/lib/supabase/user'
import { redirect } from 'next/navigation'
import { CreatePublicationForm } from '@/components/publication/CreatePublicationForm'

export default async function CreatePublicationPage() {
  const user = await getUser()
  if ('error' in user) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Create Publication</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish your research paper, preprint, thesis, or whitepaper.
        </p>
      </div>
      <CreatePublicationForm />
    </div>
  )
}
