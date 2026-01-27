'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Save, User, Mail, Phone } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, update, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Protect page: Only users with USER role can access this page
  useEffect(() => {
    if (status === 'loading') return // Wait for session to load
    
    if (!session || session.user?.role !== 'USER') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      phoneNumber: '',
    },
  })

  // Fetch user profile data including phone number on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) {
        setIsLoadingProfile(false)
        return
      }

      try {
        const response = await fetch('/api/users/profile', {
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          setPhoneNumber(data.phoneNumber || '')
          form.setValue('phoneNumber', data.phoneNumber || '')
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [session?.user?.id, form])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Ensure userId exists
    if (!session?.user?.id) {
      toast.error('User ID not found. Please refresh and try again.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', session.user.id)

    try {
      setIsLoading(true)
      
      console.log('Uploading profile image...', { userId: session.user.id, fileName: file.name, fileSize: file.size })

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status, response.statusText)

      const result = await response.json()

      console.log('Upload response data:', result)

      if (!response.ok) {
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`)
      }

      if (!result.url) {
        throw new Error('No URL returned from upload')
      }

      setProfileImage(result.url)
      toast.success('Profile picture updated successfully')
      
      // Update session with new image
      await update({
        ...session,
        user: {
          ...session?.user,
          image: result.url,
        }
      })
      
      // Refresh the page to show updated image everywhere
      router.refresh()
    } catch (error: any) {
      console.error('Image upload error:', error)
      toast.error(error.message || 'Failed to upload profile picture')
    } finally {
      setIsLoading(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Update failed')
      }

      toast.success('Profile updated successfully')
      
      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
          email: data.email,
        }
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="fade-in-cascade">
        <h1 className="welcome-header text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Profile Settings</h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Picture - Only for non-admin users */}
        {session?.user?.role !== 'ADMIN' && (
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Upload a new profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage 
                    src={profileImage || session?.user?.image || ''} 
                    alt={session?.user?.name || 'User'}
                  />
                  <AvatarFallback className="text-2xl">
                    {session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 cursor-pointer">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload profile picture"
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Click the camera icon to upload a new picture
              </p>
              <p className="text-xs text-gray-400 text-center">
                Supported: JPG, PNG, GIF • Max 5MB
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Profile Information - Adjust colspan based on admin status */}
        <Card className={session?.user?.role === 'ADMIN' ? 'md:col-span-3' : 'md:col-span-2'}>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="254712345678"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>
            Overview of your account activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500">Account Created</div>
              <div className="text-lg font-semibold mt-1">
                {session?.user ? new Date().toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500">User Role</div>
              <div className="text-lg font-semibold mt-1 capitalize">
                {session?.user?.role || 'N/A'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500">Last Login</div>
              <div className="text-lg font-semibold mt-1">
                {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500">Account Status</div>
              <div className="text-lg font-semibold mt-1 text-green-600">
                Active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}