'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/supabase/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createPublication } from '@/action/createPublication'
import type { PublicationType } from '@/lib/supabase/types'
import { Plus } from 'lucide-react'

const PUBLICATION_TYPES: { value: PublicationType; label: string }[] = [
  { value: 'preprint', label: 'Preprint' },
  { value: 'journal_article', label: 'Journal Article' },
  { value: 'conference_paper', label: 'Conference Paper' },
  { value: 'book_chapter', label: 'Book Chapter' },
  { value: 'thesis', label: 'Thesis' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'technical_report', label: 'Technical Report' },
  { value: 'other', label: 'Other' },
]

const CURRENT_YEAR = new Date().getFullYear()

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export function CreatePublicationButton() {
  const { user } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [abstract, setAbstract] = useState('')
  const [description, setDescription] = useState('')
  const [pubType, setPubType] = useState<PublicationType>('preprint')
  const [doi, setDoi] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [publishedYear, setPublishedYear] = useState('')

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slugEdited) setSlug(generateSlug(v))
  }

  const resetForm = () => {
    setTitle('')
    setSlug('')
    setSlugEdited(false)
    setAbstract('')
    setDescription('')
    setPubType('preprint')
    setDoi('')
    setSourceUrl('')
    setPublishedYear('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    setIsLoading(true)
    try {
      const result = await createPublication({
        title: title.trim(),
        slug: slug || undefined,
        abstract: abstract.trim() || undefined,
        description: description.trim() || undefined,
        publicationType: pubType,
        doi: doi.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        publishedYear: publishedYear ? Number(publishedYear) : undefined,
      })
      if ('error' in result) { setError(result.error); return }
      if ('publication' in result) {
        setOpen(false)
        resetForm()
        router.push(`/p/${result.publication.slug}`)
      }
    } catch {
      setError('Failed to create publication')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger
        className="w-full p-2 pl-5 flex items-center rounded-md cursor-pointer bg-black text-white hover:bg-black transition-all duration-200 disabled:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!user}
      >
        <Plus className="mr-2 h-4 w-4 shrink-0" />
        {user ? 'Create new Publication' : 'Sign in to create publication'}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Publication</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="space-y-1">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Your publication title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">URL Slug</label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>xeuron.com/p/</span>
              <Input
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true) }}
                placeholder="auto-generated"
                className="h-7 flex-1 text-xs"
                maxLength={60}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Publication Type *</label>
            <select
              value={pubType}
              onChange={(e) => setPubType(e.target.value as PublicationType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PUBLICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Abstract</label>
            <Textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Academic abstract (plain text)…"
              rows={4}
              maxLength={2000}
            />
            <p className="text-right text-xs text-muted-foreground">{abstract.length}/2000</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Short Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary for listings…"
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">DOI</label>
              <Input
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1000/xyz123"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Year</label>
              <Input
                type="number"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                placeholder={String(CURRENT_YEAR)}
                min={1900}
                max={CURRENT_YEAR}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Source URL</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://arxiv.org/abs/…"
              type="url"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? 'Creating…' : 'Create Publication'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
