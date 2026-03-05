import type { AppPollOption } from '@/lib/supabase/types'

interface Props {
  options: AppPollOption[]
  totalVotes: number
  userVotedOptionIds?: string[]
  showResults: boolean
}

export function PollResults({ options, totalVotes, userVotedOptionIds = [], showResults }: Props) {
  if (!showResults) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Results hidden until poll closes.
      </p>
    )
  }

  const sorted = [...options].sort((a, b) => a.optionOrder - b.optionOrder)

  return (
    <div className="space-y-2">
      {sorted.map((opt) => {
        const pct = opt.percentage
        const isVoted = userVotedOptionIds.includes(opt._id)
        return (
          <div key={opt._id}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className={`font-medium ${isVoted ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
                {isVoted && '✓ '}{opt.optionText}
              </span>
              <span className="text-muted-foreground">{pct}% ({opt.voteCount})</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isVoted ? 'bg-indigo-500' : 'bg-muted-foreground/40'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-right text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  )
}
