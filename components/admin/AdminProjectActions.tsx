'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, XCircle, Send, Wallet } from 'lucide-react'

interface AdminProjectActionsProps {
  projectId: string
  projectStatus: string
}

export default function AdminProjectActions({
  projectId,
  projectStatus,
}: AdminProjectActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showSendToVotingDialog, setShowSendToVotingDialog] = useState(false)
  const [showAssignBudgetDialog, setShowAssignBudgetDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetTitle, setBudgetTitle] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [approvalType, setApprovalType] = useState<'DIRECT' | 'VOTING'>('DIRECT')

  const handleApprove = async (type: 'DIRECT' | 'VOTING') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVED', approvalType: type }),
      })

      if (!response.ok) throw new Error('Failed to approve project')

      toast.success(
        type === 'DIRECT'
          ? 'Project approved directly'
          : 'Project will proceed to voting'
      )
      setShowApproveDialog(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'REJECTED' }),
      })

      if (!response.ok) throw new Error('Failed to reject project')

      toast.success('Project rejected')
      setShowRejectDialog(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject')
    } finally {
      setLoading(false)
    }
  }

  const handleSendToVoting = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'SEND_TO_VOTING' }),
      })

      if (!response.ok) throw new Error('Failed to send to voting')

      toast.success('Project sent to voting')
      setShowSendToVotingDialog(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send to voting')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignBudget = async () => {
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      toast.error('Please enter a valid budget amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/assign-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetAmount: parseFloat(budgetAmount),
          budgetTitle: budgetTitle || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign budget')
      }

      toast.success('Budget assigned successfully')
      setBudgetAmount('')
      setBudgetTitle('')
      setShowAssignBudgetDialog(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign budget')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a new status')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      toast.success('Project status updated successfully')
      setNewStatus('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // Get valid transitions based on current status
  const getValidTransitions = () => {
    const transitions: { [key: string]: string[] } = {
      'PROPOSED': ['VOTING', 'APPROVED', 'REJECTED'],
      'VOTING': ['APPROVED', 'REJECTED'],
      'APPROVED': ['STARTED'],
      'STARTED': ['PROGRESSING', 'NEARING_COMPLETION', 'COMPLETED', 'TERMINATED'],
      'PROGRESSING': ['COMPLETED', 'TERMINATED'],
      'NEARING_COMPLETION': ['COMPLETED', 'TERMINATED'],
      'COMPLETED': [],
      'REJECTED': [],
      'TERMINATED': [],
    }
    return transitions[projectStatus] || []
  }

  // Only allow actions if project is in PROPOSED or VOTING status
  if (projectStatus === 'REJECTED' || projectStatus === 'COMPLETED' || projectStatus === 'TERMINATED') {
    return (
      <div className="p-4 bg-gray-50 rounded border text-sm text-gray-600">
        This project cannot be modified in its current status ({projectStatus})
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Show approval options for PROPOSED projects */}
        {projectStatus === 'PROPOSED' && (
          <>
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Approve Directly
            </Button>

            <Button
              onClick={() => setShowSendToVotingDialog(true)}
              variant="outline"
              className="gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Send to Voting
            </Button>

            <Button
              onClick={() => setShowRejectDialog(true)}
              variant="destructive"
              className="gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </>
        )}

        {/* Show decision options for VOTING projects */}
        {projectStatus === 'VOTING' && (
          <>
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Approve Project
            </Button>

            <Button
              onClick={() => setShowRejectDialog(true)}
              variant="destructive"
              className="gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <XCircle className="h-4 w-4" />
              Reject Project
            </Button>
          </>
        )}

        {/* Show budget assignment for APPROVED and active projects */}
        {(projectStatus === 'APPROVED' || projectStatus === 'STARTED' || projectStatus === 'PROGRESSING' || projectStatus === 'NEARING_COMPLETION') && (
          <Button
            onClick={() => setShowAssignBudgetDialog(true)}
            className="gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Wallet className="h-4 w-4" />
            Assign Budget
          </Button>
        )}

        {/* Show status update for other statuses */}
        {getValidTransitions().length > 0 && projectStatus !== 'PROPOSED' && projectStatus !== 'VOTING' && (
          <Button
            onClick={() => setShowStatusDialog(true)}
            variant="outline"
            className="gap-2"
            disabled={loading || getValidTransitions().length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {projectStatus === 'PROPOSED' ? 'Approve Project' : 'Make Final Decision'}
            </DialogTitle>
            <DialogDescription>
              {projectStatus === 'PROPOSED' 
                ? 'Choose how you want to handle this project'
                : 'Approve this project and proceed to budget assignment'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {projectStatus === 'PROPOSED' ? (
              <>
                <Button
                  onClick={() => handleApprove('DIRECT')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Approve Directly (Skip Voting)
                </Button>
                <Button
                  onClick={() => handleApprove('VOTING')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Send to Voting (User Decision)
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleApprove('VOTING')}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Approve Project
              </Button>
            )}
            <Button
              onClick={() => setShowApproveDialog(false)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={handleReject}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Rejection
            </Button>
            <Button
              onClick={() => setShowRejectDialog(false)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Voting Dialog */}
      <Dialog open={showSendToVotingDialog} onOpenChange={setShowSendToVotingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Voting</DialogTitle>
            <DialogDescription>
              This will make the project available for all users to vote on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={handleSendToVoting}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send to Voting
            </Button>
            <Button
              onClick={() => setShowSendToVotingDialog(false)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Budget Dialog */}
      <Dialog open={showAssignBudgetDialog} onOpenChange={setShowAssignBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Budget</DialogTitle>
            <DialogDescription>
              Assign budget from the fund pool to this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Budget Title (optional)</label>
              <Input
                placeholder="e.g., Project Equipment"
                value={budgetTitle}
                onChange={(e) => setBudgetTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Amount (KES)</label>
              <Input
                type="number"
                placeholder="0"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleAssignBudget}
              disabled={loading || !budgetAmount}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign Budget
            </Button>
            <Button
              onClick={() => setShowAssignBudgetDialog(false)}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Status</DialogTitle>
            <DialogDescription>
              Select the new status for this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {getValidTransitions().map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleStatusUpdate}
              disabled={loading || !newStatus}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Status
            </Button>
            <Button
              onClick={() => {
                setShowStatusDialog(false)
                setNewStatus('')
              }}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
