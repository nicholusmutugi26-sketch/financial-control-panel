'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

interface VoteFormProps {
  projectId: string
  userVote?: number | null
  onVoteSuccess?: () => void
}

export default function VoteForm({ projectId, userVote, onVoteSuccess }: VoteFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const submitVote = async (voteValue: number) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/projects/${projectId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote: voteValue }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit vote')
      }

      toast.success(
        voteValue === 1
          ? 'Voted in favor!'
          : voteValue === -1
            ? 'Voted against!'
            : 'Abstained from voting!'
      )
      
      router.refresh()
      onVoteSuccess?.()
    } catch (error: any) {
      console.error('Vote error:', error)
      toast.error(error.message || 'Failed to submit vote')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => submitVote(1)}
        disabled={isLoading}
        variant={userVote === 1 ? 'default' : 'outline'}
        className="flex-1 gap-2"
        title="Vote in favor of this project"
      >
        {isLoading && userVote === 1 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
        In Favor
      </Button>

      <Button
        onClick={() => submitVote(0)}
        disabled={isLoading}
        variant={userVote === 0 ? 'default' : 'outline'}
        className="flex-1 gap-2"
        title="Abstain from voting"
      >
        {isLoading && userVote === 0 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Minus className="h-4 w-4" />
        )}
        Abstain
      </Button>

      <Button
        onClick={() => submitVote(-1)}
        disabled={isLoading}
        variant={userVote === -1 ? 'default' : 'outline'}
        className="flex-1 gap-2"
        title="Vote against this project"
      >
        {isLoading && userVote === -1 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsDown className="h-4 w-4" />
        )}
        Against
      </Button>
    </div>
  )
}
