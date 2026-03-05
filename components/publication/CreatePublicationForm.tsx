'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createPublication } from '@/action/createPublication'
import type { PublicationType } from '@/lib/supabase/types'

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

export function CreatePublicationForm() {
  const router = useRouter()
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
        router.push(`/p/${result.publication.slug}`)
      }
    } catch {
      setError('Failed to create publication')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Title *</label>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Your publication title"
          maxLength={200}
          required
          className="text-base"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">URL Slug</label>
        <div className="flex items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
          <span className="mr-1 shrink-0 text-muted-foreground">xeuron.com/p/</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setSlugEdited(true)
            }}
            placeholder="auto-generated"
            className="flex-1 bg-transparent py-2 outline-none"
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
          rows={5}
          maxLength={2000}
        />
        <p className="text-right text-xs text-muted-foreground">{abstract.length}/2000</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Short Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief summary for listings (optional)…"
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">DOI</label>
          <Input
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            placeholder="10.1000/xyz123"
          />
          <p className="text-xs text-muted-foreground">Without https://doi.org/ prefix</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Published Year</label>
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
        <p className="text-xs text-muted-foreground">
          Allowed: arxiv.org, doi.org, nature.com, pubmed, biorxiv, ieee.org, acm.org, springer, wiley, sciencedirect
        </p>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !title.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5"
      >
        {isLoading ? 'Creating…' : 'Create Publication'}
      </Button>
    </form>
  )
}
