import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Initialize Supabase client for server-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create client with user context for RLS
export const createSupabaseServerClient = (accessToken) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper to get authenticated user from request
export async function getAuthenticatedUser(request) {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')
    
    if (!authCookie?.value) {
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser(authCookie.value)
    
    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Check if user has specific role in trip
export async function checkTripAccess(tripId, userId, requiredRole = null) {
  try {
    const { data, error } = await supabase
      .from('trip_members')
      .select('role, status')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return { hasAccess: false, role: null }
    }

    // Admin always has access
    if (data.role === 'Admin') {
      return { hasAccess: true, role: data.role }
    }

    // Check specific role requirement
    if (requiredRole && data.role !== requiredRole) {
      return { hasAccess: false, role: data.role }
    }

    return { hasAccess: true, role: data.role }
  } catch (error) {
    console.error('Trip access check error:', error)
    return { hasAccess: false, role: null }
  }
}

// Generate secure invite code
export function generateInviteCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Hash password for invites (simple base64 for demo - use bcrypt in production)
export function hashPassword(password) {
  return Buffer.from(password).toString('base64')
}

// Verify password for invites
export function verifyPassword(password, hash) {
  return Buffer.from(password).toString('base64') === hash
}

// Calculate date based on trip start date and day number
export function calculateDateFromDay(startDate, dayNumber) {
  const date = new Date(startDate)
  date.setDate(date.getDate() + dayNumber - 1)
  return date.toISOString().split('T')[0]
}

// API response helper
export function createApiResponse(data = null, error = null, message = null, status = 200) {
  if (error) {
    return Response.json(
      { error: error.message || error },
      { status: status >= 400 ? status : 400 }
    )
  }

  return Response.json(
    {
      ...(data !== null && { data }),
      ...(message && { message })
    },
    { status }
  )
}

// Validate required fields
export function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field])
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
  return true
}

export default {
  supabase,
  createSupabaseServerClient,
  getAuthenticatedUser,
  checkTripAccess,
  generateInviteCode,
  hashPassword,
  verifyPassword,
  calculateDateFromDay,
  createApiResponse,
  validateRequiredFields
}
