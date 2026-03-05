import { createClient } from './server'
import { mapPoll } from './mappers'
import type { AppPoll } from './types'

export async function getPollsForEvent(eventId: string, userId: string | null): Promise<AppPoll[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_poll')
    .select(`
      id, question, description, allow_multiple_choice,
      closes_at, is_locked, show_results_before_close,
      event_poll_option(id, option_text, option_order)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (!data?.length) return []

  return Promise.all(
    data.map(async (poll) => {
      const p = poll as {
        id: string
        question: string
        description?: string | null
        allow_multiple_choice: boolean
        closes_at: string
        is_locked: boolean
        show_results_before_close: boolean
        event_poll_option: { id: string; option_text: string; option_order: number }[]
      }

      // Count votes per option
      const optionIds = p.event_poll_option.map((o) => o.id)
      const { data: votes } = await supabase
        .from('event_poll_vote')
        .select('option_id, user_id')
        .eq('poll_id', p.id)

      const voteCounts: Record<string, number> = {}
      optionIds.forEach((id) => { voteCounts[id] = 0 })
      votes?.forEach((v) => { voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1 })

      const totalVotes = votes?.length ?? 0
      const userVotedOptionIds = userId
        ? votes?.filter((v) => v.user_id === userId).map((v) => v.option_id) ?? []
        : []

      const isClosed = p.is_locked || new Date() >= new Date(p.closes_at)
      const showResults = p.show_results_before_close || isClosed || userId === null

      const enrichedOptions = p.event_poll_option.map((o) => ({
        ...o,
        voteCount: showResults ? (voteCounts[o.id] ?? 0) : 0,
      }))

      return mapPoll(
        { ...p, event_poll_option: enrichedOptions },
        showResults ? totalVotes : 0,
        showResults ? userVotedOptionIds : []
      )
    })
  ).then((polls) => polls.filter(Boolean) as AppPoll[])
}

export async function getPollWithResults(pollId: string, userId: string | null): Promise<AppPoll | null> {
  const supabase = await createClient()
  const { data: poll } = await supabase
    .from('event_poll')
    .select(`
      id, question, description, allow_multiple_choice,
      closes_at, is_locked, show_results_before_close,
      event_poll_option(id, option_text, option_order)
    `)
    .eq('id', pollId)
    .maybeSingle()

  if (!poll) return null

  const p = poll as {
    id: string
    question: string
    description?: string | null
    allow_multiple_choice: boolean
    closes_at: string
    is_locked: boolean
    show_results_before_close: boolean
    event_poll_option: { id: string; option_text: string; option_order: number }[]
  }

  const { data: votes } = await supabase
    .from('event_poll_vote')
    .select('option_id, user_id')
    .eq('poll_id', pollId)

  const voteCounts: Record<string, number> = {}
  p.event_poll_option.forEach((o) => { voteCounts[o.id] = 0 })
  votes?.forEach((v) => { voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1 })

  const totalVotes = votes?.length ?? 0
  const userVotedOptionIds = userId
    ? votes?.filter((v) => v.user_id === userId).map((v) => v.option_id) ?? []
    : []

  const isClosed = p.is_locked || new Date() >= new Date(p.closes_at)
  const showResults = p.show_results_before_close || isClosed

  const enrichedOptions = p.event_poll_option.map((o) => ({
    ...o,
    voteCount: showResults ? (voteCounts[o.id] ?? 0) : 0,
  }))

  return mapPoll(
    { ...p, event_poll_option: enrichedOptions },
    showResults ? totalVotes : 0,
    showResults ? userVotedOptionIds : []
  )
}
