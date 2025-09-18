import { Storage } from 'megajs'
import { detectFileType } from '@/utils/attachment/file-type-detector'

export interface ClientUploadResult {
  url: string
  size: number
  type: string
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
 * Fetch MEGA credentials from secure API endpoint
 */
async function getMegaCredentials(): Promise<{ email: string; password: string }> {
  try {
    const response = await fetch('/api/mega/credentials', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to get MEGA credentials')
    }

    const credentials = await response.json()
    return credentials
  } catch (error) {
    console.error('Failed to fetch MEGA credentials:', error)
    throw new Error('Unable to get storage credentials. Please try again.')
  }
}

/**
 * Client-side upload to MEGA using server-provided credentials
 * Credentials are fetched securely from server environment variables
 */
export async function uploadToMegaClient(
  file: File, 
  options?: {
    onProgress?: (progress: number) => void
  }
): Promise<ClientUploadResult> {
  // Get credentials from secure API endpoint
  let email: string
  let password: string
  
  try {
    const credentials = await getMegaCredentials()
    email = credentials.email
    password = credentials.password
  } catch (error) {
    throw new Error(`Failed to get storage credentials: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  // No file size limit for client-side upload since we bypass Next.js
  console.log(`Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

  let storage: Storage | null = null

  try {    
    // Report progress
    options?.onProgress?.(10)
    
    // Create MEGA storage instance with retry logic
    storage = await createMegaStorage(email, password)
    options?.onProgress?.(30)
    
    // Upload file with retry logic
    const uploadedFile = await uploadFileToMega(storage, file)
    options?.onProgress?.(80)
    
    // Get public share link with retry logic
    const shareUrl = await getShareLink(uploadedFile)
    options?.onProgress?.(95)
    
    // Detect file type
    const fileType = detectFileType(file.name, file.type)
    options?.onProgress?.(100)
    
    return {
      url: shareUrl,
      size: file.size,
      type: fileType
    }
  } catch (error) {
    console.error('MEGA client upload process failed:', error)
    
    // Provide user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('authentication failed') || errorMessage.includes('Invalid email or password')) {
      throw new Error('MEGA upload failed: Please check your MEGA account credentials. Make sure your email and password are correct and your account is active.')
    } else if (errorMessage.includes('timeout')) {
      throw new Error('MEGA upload failed: Connection timeout. Please check your internet connection and try again later.')
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
 * Test MEGA connection from client-side using server credentials
 */
export async function testMegaConnectionClient(): Promise<{ success: boolean; message: string }> {
  try {
    // Get credentials from secure API endpoint
    const credentials = await getMegaCredentials()
    
    validateCredentials(credentials.email, credentials.password)
    const storage = await createMegaStorage(credentials.email, credentials.password)
    
    // Test basic functionality
    const info = await storage.getAccountInfo?.() || { type: 'unknown' }
    
    // Clean up storage connection
    if (storage && typeof storage.close === 'function') {
      try {
        storage.close()
      } catch (cleanupError) {
        console.warn('Failed to clean up MEGA storage connection:', cleanupError)
      }
    }
    
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
