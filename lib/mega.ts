import { Storage } from 'megajs'

export interface UploadResult {
  url: string
  size: number
}

/**
 * Uploads a file to MEGA and returns the public share link and file size
 */
export async function uploadToMega(file: File): Promise<UploadResult> {
  const email = process.env.MEGA_EMAIL
  const password = process.env.MEGA_PASSWORD

  if (!email || !password) {
    throw new Error('MEGA credentials not found in environment variables')
  }

  try {
    // Create MEGA storage instance and wait for it to be ready (following official docs pattern)
    const storage = await new Storage({
      email,
      password
    }).ready

    // Convert File to Buffer for MEGA upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload file to MEGA and wait for completion
    const uploadedFile = await storage.upload(file.name, buffer).complete
    
    // Get public share link - link() method expects options or callback
    const shareUrl = await new Promise<string>((resolve, reject) => {
      try {
        // Try the modern promise-based approach first
        const linkResult = uploadedFile.link({})
        if (linkResult && typeof linkResult.then === 'function') {
          linkResult.then(resolve).catch(reject)
        } else if (typeof linkResult === 'string') {
          resolve(linkResult)
        } else {
          // Fallback: try with callback if promise approach fails
          uploadedFile.link({}, (error: any, url?: string) => {
            if (error) {
              reject(new Error(`Failed to get MEGA share link: ${error.message || error}`))
              return
            }
            if (!url) {
              reject(new Error('Failed to get MEGA share link: No URL returned'))
              return
            }
            resolve(url)
          })
        }
      } catch (error) {
        // Final fallback: try callback approach
        try {
          uploadedFile.link({}, (error: any, url?: string) => {
            if (error) {
              reject(new Error(`Failed to get MEGA share link: ${error.message || error}`))
              return
            }
            if (!url) {
              reject(new Error('Failed to get MEGA share link: No URL returned'))
              return
            }
            resolve(url)
          })
        } catch (fallbackError) {
          reject(new Error(`Failed to get MEGA share link: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`))
        }
      }
    })

    return {
      url: shareUrl,
      size: file.size
    }
  } catch (error) {
    throw new Error(`MEGA upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
