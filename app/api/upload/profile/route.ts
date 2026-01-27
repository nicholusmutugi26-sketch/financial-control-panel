import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

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
      console.log('User verification:', { userId, exists: userExists })
    } catch (dbError: any) {
      console.warn('Failed to verify user:', dbError.message)
      // Don't block upload if DB verification fails
    }

    if (!userExists) {
      console.warn('User not found in database:', userId)
      return NextResponse.json({ error: `User not found: ${userId}` }, { status: 404 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
    
    // Create directory if it doesn't exist
    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true })
      console.log('Upload directory ready:', uploadsDir)
    } catch (dirError: any) {
      console.error('Failed to create upload directory:', dirError.message)
      return NextResponse.json({ error: 'Failed to create upload directory' }, { status: 500 })
    }

    // Generate safe filename
    const timestamp = Date.now()
    const ext = path.extname(file.name) || '.jpg'
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9\-_]/g, '') || 'profile'
    const safeName = `${baseName}-${timestamp}${ext}`
    const filePath = path.join(uploadsDir, safeName)

    console.log('Saving file:', { filePath, safeName })

    // Write file to disk
    try {
      await fs.promises.writeFile(filePath, buffer)
      console.log('File written successfully:', filePath)
    } catch (writeError: any) {
      console.error('Failed to write file:', writeError.message)
      return NextResponse.json({ error: 'Failed to save file to disk' }, { status: 500 })
    }

    const url = `/uploads/profiles/${safeName}`

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
      // Still return the URL since file was saved successfully
      // User can retry updating the DB later
    }

    console.log('Upload successful:', { url, userId })
    return NextResponse.json({ 
      success: true,
      url,
      message: 'Profile picture uploaded successfully'
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    }, { status: 500 })
  }
}
