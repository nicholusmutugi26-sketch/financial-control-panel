import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utapi } from '@/lib/uploadthing'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    console.log('Profile upload initiated...')
    
    const form = await req.formData()
    const file = form.get('file') as File | null
    const userId = String(form.get('userId') || '').trim()

    console.log('Form data received:', { userId, fileName: file?.name, fileSize: file?.size })

    if (!file || !file.name) {
      console.error('No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!userId || userId === '') {
      console.error('Missing userId')
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json({ error: `Invalid file type: ${file.type}. Only images are allowed.` }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size)
      return NextResponse.json({ error: `File too large: ${file.size} bytes. Maximum size is 5MB.` }, { status: 400 })
    }

    // Verify user exists in database
    let userExists = false
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, profileImage: true }
      })
      userExists = !!user
      console.log('User verification:', { userId, exists: userExists })

      // If user already has a profile image, delete it from UploadThing
      if (user?.profileImage) {
        try {
          const oldUrl = user.profileImage
          // Extract file key from URL if it's an UploadThing URL
          if (oldUrl.includes('uploadthing')) {
            const fileKey = oldUrl.split('/').pop()
            if (fileKey) {
              await utapi.deleteFiles(fileKey)
              console.log('Old profile image deleted:', fileKey)
            }
          }
        } catch (deleteError: any) {
          console.warn('Failed to delete old profile image:', deleteError.message)
          // Don't block upload if deletion fails
        }
      }
    } catch (dbError: any) {
      console.warn('Failed to verify user:', dbError.message)
      // Don't block upload if DB verification fails
    }

    if (!userExists) {
      console.warn('User not found in database:', userId)
      return NextResponse.json({ error: `User not found: ${userId}` }, { status: 404 })
    }

    try {
      console.log('Uploading file to UploadThing...')
      
      // Upload to UploadThing
      const result = await utapi.uploadFiles([file], {
        metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      })

      if (!result || !result[0] || !result[0].data) {
        console.error('UploadThing upload failed:', result?.[0]?.error)
        return NextResponse.json({ error: 'Failed to upload file to cloud storage' }, { status: 500 })
      }

      const uploadedFile = result[0].data
      const url = uploadedFile.url

      console.log('File uploaded to UploadThing:', { url, fileKey: uploadedFile.key })

      // Update database with new profile image URL
      try {
        console.log('Updating user profile image in DB:', { userId, url })
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { profileImage: url },
          select: { id: true, profileImage: true }
        })
        console.log('User profile updated successfully:', updatedUser)
      } catch (dbUpdateError: any) {
        console.error('Failed to update user profileImage in DB:', dbUpdateError.message)
        // Still return the URL since file was uploaded successfully to UploadThing
        // User can retry updating the DB later
      }

      console.log('Upload successful:', { url, userId })
      return NextResponse.json({ 
        success: true,
        url,
        message: 'Profile picture uploaded successfully'
      })
    } catch (uploadError: any) {
      console.error('UploadThing upload failed:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file to cloud storage',
        details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
      }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    }, { status: 500 })
  }
}
