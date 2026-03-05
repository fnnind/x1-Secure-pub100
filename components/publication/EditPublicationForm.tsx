'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updatePublication } from '@/action/updatePublication'
import type { AppPublication, PublicationType } from '@/lib/supabase/types'

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

interface Props {
  publication: AppPublication
}

export function EditPublicationForm({ publication: p }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState(p.title)
  const [abstract, setAbstract] = useState(p.abstract ?? '')
  const [description, setDescription] = useState(p.description ?? '')
  const [doi, setDoi] = useState(p.doi ?? '')
  const [sourceUrl, setSourceUrl] = useState(p.source_url ?? '')
  const [publishedYear, setPublishedYear] = useState(p.publishedYear ? String(p.publishedYear) : '')
  const [fieldOfStudy, setFieldOfStudy] = useState(p.fieldOfStudy ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!title.trim()) { setError('Title is required'); return }
    setIsLoading(true)
    try {
      const result = await updatePublication(p._id, {
        title: title.trim(),
        abstract: abstract.trim() || undefined,
        description: description.trim() || undefined,
        doi: doi.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        publishedYear: publishedYear ? Number(publishedYear) : undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
      })
      if ('error' in result) { setError(result.error); return }
      setSuccess(true)
      router.push(`/p/${p.slug}`)
      router.refresh()
    } catch {
      setError('Failed to save changes')
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
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          Saved successfully.
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Publication title"
          maxLength={200}
          required
          className="text-base"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">URL Slug</label>
        <div className="flex items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          xeuron.com/p/{p.slug}
          <span className="ml-2 text-xs">(cannot be changed)</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Abstract</label>
        <Textarea
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          placeholder="Academic abstract (plain text)…"
          rows={6}
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

      <div className="space-y-1">
        <label className="text-sm font-medium">Field of Study</label>
        <Input
          value={fieldOfStudy}
          onChange={(e) => setFieldOfStudy(e.target.value)}
          placeholder="e.g. Computer Science > Machine Learning"
        />
        <p className="text-xs text-muted-foreground">
          Use <code>&gt;</code> to separate levels, e.g. "Computer Science &gt; NLP"
        </p>
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
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading || !title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isLoading ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/p/${p.slug}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
