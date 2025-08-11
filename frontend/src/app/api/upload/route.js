import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key for uploads
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  // Verify the token using the anon key client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export async function POST(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const bucketName = formData.get('bucket') || 'trip-images'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Create unique filename with user folder structure
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${user.id}/${bucketName === 'avatars' ? 'avatar' : 'trip'}-${timestamp}.${fileExt}`

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)

    // Upload to Supabase Storage using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseServiceRole.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Allow overwriting files
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      console.error('Upload details:', {
        bucketName,
        fileName,
        fileSize: file.size,
        fileType: file.type,
        userId: user.id
      })
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 400 }
      )
    }

    console.log('Upload successful:', {
      bucketName,
      fileName,
      path: uploadData.path,
      userId: user.id
    })

    // Get public URL
    const { data: { publicUrl } } = supabaseServiceRole.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrl,
      path: uploadData.path,
      fileName: fileName
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
