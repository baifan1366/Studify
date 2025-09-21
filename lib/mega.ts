import { Storage, File as MegaFile } from 'megajs'

// Global connection pool to avoid repeated authentication
interface MegaConnection {
  storage: Storage
  lastUsed: number
  isValid: boolean
}

// Connection pool with 5-minute reuse window
const connectionPool = new Map<string, MegaConnection>()
const CONNECTION_REUSE_TIME = 5 * 60 * 1000 // 5 minutes
const MAX_POOL_SIZE = 3

export interface UploadResult {
  url: string
  size: number
}

export interface MegaFileInfo {
  name: string
  size: number
  url: string
  isValid: boolean
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
 * Get or create a MEGA storage connection with pooling to avoid repeated authentication
 */
async function getMegaStorage(email: string, password: string, retryCount = 0): Promise<Storage> {
  const connectionKey = `${email}:${password.substring(0, 10)}` // Don't log full password
  const now = Date.now()
  
  // Check if we have a valid cached connection
  const cached = connectionPool.get(connectionKey)
  if (cached && cached.isValid && (now - cached.lastUsed) < CONNECTION_REUSE_TIME) {
    cached.lastUsed = now
    return cached.storage
  }
  
  // Clean up expired connections
  cleanupConnectionPool()
  
  // Create new connection
  const storage = await createMegaStorageWithRetry(email, password, retryCount)
  
  // Cache the connection
  connectionPool.set(connectionKey, {
    storage,
    lastUsed: now,
    isValid: true
  })
  
  return storage
}

/**
 * Clean up expired connections from the pool
 */
function cleanupConnectionPool() {
  const now = Date.now()
  for (const [key, connection] of connectionPool.entries()) {
    if (now - connection.lastUsed > CONNECTION_REUSE_TIME || !connection.isValid) {
      connectionPool.delete(key)
    }
  }
  
  // Limit pool size
  if (connectionPool.size > MAX_POOL_SIZE) {
    const oldest = Array.from(connectionPool.entries())
      .sort(([,a], [,b]) => a.lastUsed - b.lastUsed)[0]
    if (oldest) {
      connectionPool.delete(oldest[0])
    }
  }
}

/**
 * Creates a MEGA storage instance with enhanced error handling and abort controller
 */
async function createMegaStorageWithRetry(email: string, password: string, retryCount = 0): Promise<Storage> {
  const maxRetries = 3
  const baseDelay = 2000 // 2 seconds
  
  try {
    const storage = new Storage({
      email,
      password,
      keepalive: false,
      autologin: true
    })
    
    // Enhanced timeout handling with AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 20000) // Reduced from 30s to 20s
    
    try {
      await new Promise<void>((resolve, reject) => {
        // Handle abort signal
        if (controller.signal.aborted) {
          reject(new Error('Authentication cancelled due to timeout'))
          return
        }
        
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Authentication cancelled due to timeout'))
        })
        
        // Wait for storage ready
        storage.ready
          .then(() => {
            clearTimeout(timeoutId)
            resolve()
          })
          .catch(reject)
      })
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
    
    return storage
    
  } catch (error) {
    const megaError = error as MegaError
    console.error(`MEGA authentication failed (attempt ${retryCount + 1}):`, megaError.message)
    
    // Mark any cached connections as invalid
    for (const connection of connectionPool.values()) {
      connection.isValid = false
    }
    
    // Check if it's a retryable error
    const isRetryable = 
      megaError.code === -9 || // ENOENT - might be temporary
      megaError.message?.includes('timeout') ||
      megaError.message?.includes('network') ||
      megaError.message?.includes('connection') ||
      megaError.message?.includes('cancelled')
    
    if (isRetryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount) // Exponential backoff
      await sleep(delay)
      return createMegaStorageWithRetry(email, password, retryCount + 1)
    }
    
    // Provide more specific error messages
    if (megaError.code === -9) {
      throw new Error('MEGA authentication failed: Invalid email or password')
    } else if (megaError.message?.includes('timeout') || megaError.message?.includes('cancelled')) {
      throw new Error('MEGA authentication timeout: Server response took too long')
    } else if (megaError.message?.includes('ENOTFOUND')) {
      throw new Error('MEGA connection failed: Cannot reach MEGA servers')
    }
    
    throw new Error(`MEGA authentication failed: ${megaError.message || 'Unknown error'}`)
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
    // Get MEGA storage instance with connection pooling
    storage = await getMegaStorage(email, password)
    
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
 * Get MEGA file information without downloading the full file - Enhanced with better timeout handling
 */
export async function getMegaFileInfo(megaUrl: string, retryCount = 0): Promise<MegaFileInfo> {
  const maxRetries = 2
  const baseDelay = 1000
  
  try {
    
    // Parse MEGA URL and get file info
    const megaFile = MegaFile.fromURL(megaUrl)
    
    // Enhanced timeout handling with AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 12000) // Reduced from 15s to 12s
    
    try {
      await new Promise<void>((resolve, reject) => {
        // Handle abort signal
        if (controller.signal.aborted) {
          reject(new Error('File info request cancelled due to timeout'))
          return
        }
        
        controller.signal.addEventListener('abort', () => {
          reject(new Error('File info request cancelled due to timeout'))
        })
        
        megaFile.loadAttributes((error) => {
          clearTimeout(timeoutId)
          if (error) {
            reject(new Error(`Failed to load MEGA file attributes: ${error.message}`))
          } else {
            resolve()
          }
        })
      })
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }

    const fileInfo: MegaFileInfo = {
      name: megaFile.name || 'Unknown',
      size: megaFile.size || 0,
      url: megaUrl,
      isValid: true
    }

    return fileInfo
    
  } catch (error) {
    console.error(`❌ Failed to get MEGA file info (attempt ${retryCount + 1}):`, error)
    
    // Check if it's a retryable error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isRetryable = 
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cancelled')
    
    if (isRetryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount)
      await sleep(delay)
      return getMegaFileInfo(megaUrl, retryCount + 1)
    }
    
    return {
      name: 'Unknown',
      size: 0,
      url: megaUrl,
      isValid: false
    }
  }
}

/**
 * Download MEGA file as Buffer (for small files only) - Enhanced with better error handling
 */
export async function downloadMegaFile(megaUrl: string, maxSizeBytes: number = 50 * 1024 * 1024, retryCount = 0): Promise<Buffer> {
  const maxRetries = 2
  const baseDelay = 2000
  
  try {
    
    // Get file info first to check size
    const fileInfo = await getMegaFileInfo(megaUrl)
    
    if (!fileInfo.isValid) {
      throw new Error('Invalid MEGA file')
    }
    
    if (fileInfo.size > maxSizeBytes) {
      throw new Error(`File too large (${(fileInfo.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB.`)
    }

    const megaFile = MegaFile.fromURL(megaUrl)
    
    // Download file with enhanced timeout and abort handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 90000) // Reduced from 2 minutes to 90 seconds
    
    try {
      const chunks: Buffer[] = []
      const downloadStream = megaFile.download({})
      
      const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
        // Handle abort signal
        if (controller.signal.aborted) {
          reject(new Error('Download cancelled due to timeout'))
          return
        }
        
        controller.signal.addEventListener('abort', () => {
          downloadStream.destroy()
          reject(new Error('Download cancelled due to timeout'))
        })
        
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        
        downloadStream.on('end', () => {
          clearTimeout(timeoutId)
          resolve(Buffer.concat(chunks))
        })
        
        downloadStream.on('error', (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
      })
      
      console.log('✅ MEGA file downloaded successfully:', {
        size: fileBuffer.length,
        sizeFormatted: `${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB`
      })

      return fileBuffer
      
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
    
  } catch (error) {
    console.error(`❌ Failed to download MEGA file (attempt ${retryCount + 1}):`, error)
    
    // Check if it's a retryable error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isRetryable = 
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cancelled')
    
    if (isRetryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount)
      console.log(`⏳ Retrying download in ${delay}ms...`)
      await sleep(delay)
      return downloadMegaFile(megaUrl, maxSizeBytes, retryCount + 1)
    }
    
    throw new Error(`MEGA download failed: ${errorMessage}`)
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
    const storage = await getMegaStorage(email, password)
    
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
