import { UTApi } from 'uploadthing/server'

// Initialize UploadThing API
// The token is automatically picked up from UPLOADTHING_SECRET env var
export const utapi = new UTApi()

export default utapi
