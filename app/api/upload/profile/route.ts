import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safeUploadFile } from '@/lib/uploadthing'

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
        select: { id: true }
      })
      userExists = !!user
    } catch (dbError) {
      console.error('Database error checking user:', dbError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 400 })
    }

    if (!userExists) {
      console.error('User not found:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Upload file to UploadThing
    let fileUrl: string
    try {
      console.log('Uploading file to UploadThing...')
      const uploadData = await safeUploadFile(file, { userId })
      
      if (!uploadData?.url) {
        throw new Error('UploadThing returned no file URL')
      }

      fileUrl = uploadData.url
      console.log('File uploaded successfully:', fileUrl)
    } catch (uploadError) {
      console.error('File upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 })
    }

    // Update user profile image in database
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          profileImage: fileUrl,
          updatedAt: new Date(),
        }
      })
      console.log('User profile updated with new image:', userId, fileUrl)
    } catch (dbError) {
      console.error('Database update error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to update profile', 
        details: dbError instanceof Error ? dbError.message : 'Database error'
      }, { status: 500 })
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'PROFILE_IMAGE_UPLOADED',
          entity: 'USER',
          entityId: userId,
          userId: userId,
          changes: {
            profileImage: fileUrl,
            fileName: file.name,
            fileSize: file.size
          }
        }
      })
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError)
      // Don't fail the upload if audit log fails
    }

    console.log('Profile upload completed successfully')
    return NextResponse.json({
      success: true,
      message: 'Profile picture updated successfully',
      url: fileUrl,
      fileName: file.name,
    })
  } catch (error: any) {
    console.error('Unexpected upload error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error occurred'
      }, 
      { status: 500 }
    )
  }
}
