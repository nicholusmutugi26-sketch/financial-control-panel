'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Settings,
  Shield,
  Bell,
  Database,
  Mail,
  Lock,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'Financial Control Panel',
    siteUrl: 'https://financialpanel.example.com',
    adminEmail: 'admin@financialpanel.com',
    enableRegistration: true,
    requireEmailVerification: false,
    enableMpesa: true,
    mpesaTestMode: true,
    maxBudgetAmount: 1000000,
    maxBatchCount: 12,
    notificationEmails: true,
    notificationSMS: false,
    autoApproveProjects: false,
    maintenanceMode: false,
  })

  const handleSave = async () => {
    try {
      setIsLoading(true)
      // In a real app, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-gray-600">
          Configure system-wide settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic system configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({...settings, siteUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({...settings, adminEmail: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBudgetAmount">Max Budget Amount (KES)</Label>
                <Input
                  id="maxBudgetAmount"
                  type="number"
                  value={settings.maxBudgetAmount}
                  onChange={(e) => setSettings({...settings, maxBudgetAmount: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              System security and access control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable User Registration</Label>
                <p className="text-sm text-gray-500">
                  Allow new users to register accounts
                </p>
              </div>
              <Switch
                checked={settings.enableRegistration}
                onCheckedChange={(checked) => setSettings({...settings, enableRegistration: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Email Verification</Label>
                <p className="text-sm text-gray-500">
                  Users must verify their email address
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => setSettings({...settings, requireEmailVerification: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-500">
                  Take the system offline for maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* M-Pesa Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              M-Pesa Integration
            </CardTitle>
            <CardDescription>
              Configure M-Pesa payment settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable M-Pesa Payments</Label>
                <p className="text-sm text-gray-500">
                  Allow disbursements via M-Pesa
                </p>
              </div>
              <Switch
                checked={settings.enableMpesa}
                onCheckedChange={(checked) => setSettings({...settings, enableMpesa: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Test Mode</Label>
                <p className="text-sm text-gray-500">
                  Use M-Pesa sandbox for testing
                </p>
              </div>
              <Switch
                checked={settings.mpesaTestMode}
                onCheckedChange={(checked) => setSettings({...settings, mpesaTestMode: checked})}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="maxBatchCount">Maximum Batch Count</Label>
              <Input
                id="maxBatchCount"
                type="number"
                min="1"
                max="24"
                value={settings.maxBatchCount}
                onChange={(e) => setSettings({...settings, maxBatchCount: parseInt(e.target.value) || 1})}
              />
              <p className="text-sm text-gray-500">
                Maximum number of batches allowed per budget
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure system notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Send notifications via email
                </p>
              </div>
              <Switch
                checked={settings.notificationEmails}
                onCheckedChange={(checked) => setSettings({...settings, notificationEmails: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-gray-500">
                  Send notifications via SMS
                </p>
              </div>
              <Switch
                checked={settings.notificationSMS}
                onCheckedChange={(checked) => setSettings({...settings, notificationSMS: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-approve Projects</Label>
                <p className="text-sm text-gray-500">
                  Automatically approve projects after unanimous voting
                </p>
              </div>
              <Switch
                checked={settings.autoApproveProjects}
                onCheckedChange={(checked) => setSettings({...settings, autoApproveProjects: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reset Changes
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Settings className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}