import { Storage } from 'megajs'

export interface UploadResult {
  url: string
  size: number
}

interface MegaError extends Error {
  code?: number
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Validates MEGA credentials format
 */
function validateCredentials(email: string, password: string): void {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Invalid MEGA email format')
  }
  
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Invalid MEGA password (must be at least 6 characters)')
  }
}

/**
 * Creates a MEGA storage instance with proper error handling
 */
async function createMegaStorage(email: string, password: string, retryCount = 0): Promise<Storage> {
  const maxRetries = 3
  const baseDelay = 2000 // 2 seconds
  
  try {
    
    const storage = new Storage({
      email,
      password,
      // Add timeout and other options for better reliability
      keepalive: false,
      autologin: true
    })
    
    // Wait for storage to be ready with timeout
    const readyPromise = storage.ready
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MEGA authentication timeout after 30 seconds')), 30000)
    })
    
    await Promise.race([readyPromise, timeoutPromise])
    
    return storage
  } catch (error) {
    const megaError = error as MegaError
    console.error(`MEGA authentication failed (attempt ${retryCount + 1}):`, megaError.message)
    
    // Check if it's a retryable error
    const isRetryable = 
      megaError.code === -9 || // ENOENT - might be temporary
      megaError.message?.includes('timeout') ||
      megaError.message?.includes('network') ||
      megaError.message?.includes('connection')
    
    if (isRetryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount) // Exponential backoff
      await sleep(delay)
      return createMegaStorage(email, password, retryCount + 1)
    }
    
    // Provide more specific error messages
    if (megaError.code === -9) {
      throw new Error('MEGA authentication failed: Invalid email or password. Please check your MEGA credentials.')
    } else if (megaError.message?.includes('timeout')) {
      throw new Error('MEGA authentication failed: Connection timeout. Please check your internet connection and try again.')
    } else if (megaError.message?.includes('ENOTFOUND')) {
      throw new Error('MEGA authentication failed: Cannot connect to MEGA servers. Please check your internet connection.')
    }
    
    throw new Error(`MEGA authentication failed: ${megaError.message || 'Unknown authentication error'}`)
  }
}

/**
 * Uploads a file to MEGA with retry logic and better error handling
 */
async function uploadFileToMega(storage: Storage, file: File, retryCount = 0): Promise<any> {
  const maxRetries = 2
  const baseDelay = 1000
  
  try {
    
    // Convert File to Buffer for MEGA upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload file with progress tracking
    const uploadPromise = storage.upload(file.name, buffer).complete
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('File upload timeout after 5 minutes')), 300000) // 5 minutes
    })
    
    const uploadedFile = await Promise.race([uploadPromise, timeoutPromise])
    
    return uploadedFile
  } catch (error) {
    console.error(`File upload failed (attempt ${retryCount + 1}):`, error)
    
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount)
      await sleep(delay)
      return uploadFileToMega(storage, file, retryCount + 1)
    }
    
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown upload error'}`)
  }
}

/**
 * Gets a public share link for the uploaded file
 */
async function getShareLink(uploadedFile: any, retryCount = 0): Promise<string> {
  const maxRetries = 2
  const baseDelay = 1000
  
  try {
    
    const shareUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Share link generation timeout after 30 seconds'))
      }, 30000)
      
      try {
        // Try the callback approach first as it's more reliable
        uploadedFile.link({}, (error: any, url?: string) => {
          clearTimeout(timeout)
          
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
      } catch (callbackError) {
        clearTimeout(timeout)
        
        // Fallback to promise-based approach
        try {
          const linkResult = uploadedFile.link({})
          if (linkResult && typeof linkResult.then === 'function') {
            linkResult.then(resolve).catch(reject)
          } else if (typeof linkResult === 'string') {
            resolve(linkResult)
          } else {
            reject(new Error('Failed to get MEGA share link: Invalid response'))
          }
        } catch (promiseError) {
          reject(new Error(`Failed to get MEGA share link: ${promiseError instanceof Error ? promiseError.message : 'Unknown error'}`))
        }
      }
    })
    
    return shareUrl
  } catch (error) {
    console.error(`Share link generation failed (attempt ${retryCount + 1}):`, error)
    
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount)
      await sleep(delay)
      return getShareLink(uploadedFile, retryCount + 1)
    }
    
    throw new Error(`Share link generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Uploads a file to MEGA and returns the public share link and file size
 */
export async function uploadToMega(file: File): Promise<UploadResult> {
  const email = process.env.MEGA_EMAIL
  const password = process.env.MEGA_PASSWORD

  // Validate environment variables
  if (!email || !password) {
    throw new Error('MEGA credentials not found in environment variables. Please set MEGA_EMAIL and MEGA_PASSWORD.')
  }

  // Validate credentials format
  try {
    validateCredentials(email, password)
  } catch (error) {
    throw new Error(`MEGA credential validation failed: ${error instanceof Error ? error.message : 'Invalid credentials'}`)
  }

  // Validate file
  if (!file || file.size === 0) {
    throw new Error('Invalid file: File is empty or undefined')
  }

  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    throw new Error('File size exceeds 100MB limit')
  }

  let storage: Storage | null = null

  try {    
    // Create MEGA storage instance with retry logic
    storage = await createMegaStorage(email, password)
    
    // Upload file with retry logic
    const uploadedFile = await uploadFileToMega(storage, file)
    
    // Get public share link with retry logic
    const shareUrl = await getShareLink(uploadedFile)
        
    return {
      url: shareUrl,
      size: file.size
    }
  } catch (error) {
    console.error('MEGA upload process failed:', error)
    
    // Provide user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('authentication failed') || errorMessage.includes('Invalid email or password')) {
      throw new Error('MEGA upload failed: Please check your MEGA account credentials. Make sure your email and password are correct and your account is active.')
    } else if (errorMessage.includes('timeout')) {
      throw new Error('MEGA upload failed: Connection timeout. Please check your internet connection and try again later.')
    } else if (errorMessage.includes('File size exceeds')) {
      throw new Error('MEGA upload failed: File is too large. Maximum file size is 100MB.')
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      throw new Error('MEGA upload failed: Network connection error. Please check your internet connection and try again.')
    }
    
    throw new Error(`MEGA upload failed: ${errorMessage}`)
  } finally {
    // Clean up storage connection if it exists
    if (storage) {
      try {
        // Close the storage connection if possible
        if (typeof storage.close === 'function') {
          storage.close()
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up MEGA storage connection:', cleanupError)
      }
    }
  }
}

/**
 * Test MEGA connection and credentials
 */
export async function testMegaConnection(): Promise<{ success: boolean; message: string }> {
  const email = process.env.MEGA_EMAIL
  const password = process.env.MEGA_PASSWORD

  if (!email || !password) {
    return {
      success: false,
      message: 'MEGA credentials not found in environment variables'
    }
  }

  try {
    validateCredentials(email, password)
    const storage = await createMegaStorage(email, password)
    
    // Test basic functionality
    const info = await storage.getAccountInfo?.() || { type: 'unknown' }
    
    return {
      success: true,
      message: `MEGA connection successful. Account type: ${info.type || 'unknown'}`
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed'
    }
  }
}
