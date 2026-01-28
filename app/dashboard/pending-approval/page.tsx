"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Clock, LogOut } from "lucide-react"

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-amber-100 p-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Pending Admin Approval
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Your account has been created successfully! An administrator needs to review and approve your account before you can access the dashboard.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>What happens next?</strong>
            <br />
            An admin will review your registration and approve your access. You&apos;ll receive a notification once approved.
          </p>
        </div>

        <Button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
        >
          <LogOut className="h-4 w-4" />
          Back to Login
        </Button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Have questions? Contact support
        </p>
      </Card>
    </div>
  )
}
