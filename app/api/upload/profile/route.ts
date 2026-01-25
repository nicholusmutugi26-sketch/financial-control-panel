import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const userId = String(form.get('userId') || '')

    if (!file || !file.name) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
    const filePath = path.join(uploadsDir, safeName)

    await fs.promises.writeFile(filePath, buffer)

    const url = `/uploads/profiles/${safeName}`

    // Persist to DB if user exists (use `profileImage` field)
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { profileImage: url },
      })
    } catch (e) {
      // ignore DB errors, still return URL
      console.warn('Failed to update user profileImage in DB:', e)
    }

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('Upload error', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
