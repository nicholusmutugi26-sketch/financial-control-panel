import { UTApi } from 'uploadthing/server'

// Initialize UploadThing API only if secret is available
let uploadThingApi: UTApi | null = null

try {
  const secret = process.env.UPLOADTHING_SECRET
  if (secret && secret.startsWith('sk_')) {
    // UploadThing automatically reads from UPLOADTHING_SECRET env var
    uploadThingApi = new UTApi()
    console.log('[UploadThing] Initialized successfully')
  } else {
    console.warn('[UploadThing] Not initialized - missing or invalid UPLOADTHING_SECRET')
    console.warn('[UploadThing] Profile uploads will fallback to local storage')
  }
} catch (error) {
  console.error('[UploadThing] Failed to initialize:', error)
  console.warn('[UploadThing] Profile uploads will fallback to local storage')
}

export { uploadThingApi as utapi }

// Helper function to check if UploadThing is available
export function isUploadThingAvailable(): boolean {
  return uploadThingApi !== null
}

// Safe upload function with fallback
export async function safeUploadFile(file: File, metadata?: any) {
  if (!uploadThingApi) {
    throw new Error('UploadThing not configured. Please set UPLOADTHING_SECRET environment variable.')
  }

  try {
    const result = await uploadThingApi.uploadFiles([file], { metadata })
    if (!result || !result[0] || !result[0].data) {
      throw new Error('Upload failed - no result returned')
    }
    return result[0].data
  } catch (error) {
    console.error('[UploadThing] Upload failed:', error)
    throw error
  }
}

export default uploadThingApi
