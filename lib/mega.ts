import { Storage } from 'megajs'

export interface UploadResult {
  url: string
  size: number
}

/**
 * Uploads a file to MEGA and returns the public share link and file size
 */
export async function uploadToMega(file: File): Promise<UploadResult> {
  return new Promise(async (resolve, reject) => {
    const email = process.env.MEGA_EMAIL
    const password = process.env.MEGA_PASSWORD

    if (!email || !password) {
      reject(new Error('MEGA credentials not found in environment variables'))
      return
    }

    try {
      // Create MEGA storage instance and wait for it to be ready
      const storage = await new Storage({
        email,
        password
      })

      storage.ready(() => {
      try {
        // Convert File to Buffer for MEGA upload
        const reader = new FileReader()
        
        reader.onload = async () => {
          try {
            const buffer = Buffer.from(reader.result as ArrayBuffer)
            
            // Upload file to MEGA
            const uploadedFile = storage.upload({
              name: file.name,
              size: file.size
            }, buffer)

            // Wait for upload completion and get share link
            uploadedFile.complete((error: Error | null, file: any) => {
              if (error) {
                reject(new Error(`MEGA upload failed: ${error.message}`))
                return
              }

              // Get public share link
              file.link((error: Error | null, url: string) => {
                if (error) {
                  reject(new Error(`Failed to get MEGA share link: ${error.message}`))
                  return
                }

                resolve({
                  url,
                  size: file.size
                })
              })
            })
          } catch (error) {
            reject(new Error(`File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        }

        reader.onerror = () => {
          reject(new Error('Failed to read file'))
        }

        // Read file as ArrayBuffer
        reader.readAsArrayBuffer(file)
      } catch (error) {
        reject(new Error(`MEGA upload error: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })

    storage.on('error', (error: Error) => {
      reject(new Error(`MEGA connection error: ${error.message}`))
    })
    } catch (error) {
      reject(new Error(`MEGA connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}
