import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here' || !supabaseUrl.startsWith('http')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured properly in .env.local')
  console.error('Please set a valid Supabase URL in your .env.local file')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured properly in .env.local')
  console.error('Please set a valid Supabase anon key in your .env.local file')
}

// Use fallback values for development to prevent crashes
const validUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://placeholder.supabase.co'
const validKey = (supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key_here') ? supabaseAnonKey : 'placeholder-key'

export const supabase = createClient(validUrl, validKey)

// Export createClient for API routes that need to create their own instances
export { createClient }

// For server-side operations that need elevated permissions
export const createServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceKey || serviceKey === 'your_service_role_key_here') {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured properly in .env.local')
    return null
  }
  
  return createClient(
    validUrl,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Auth helpers
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Real-time subscriptions
export const subscribeToTripMessages = (tripId, callback) => {
  return supabase
    .channel(`trip-${tripId}-messages`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trip_messages',
      filter: `trip_id=eq.${tripId}`
    }, callback)
    .subscribe()
}

export const subscribeToTripMembers = (tripId, callback) => {
  return supabase
    .channel(`trip-${tripId}-members`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trip_members',
      filter: `trip_id=eq.${tripId}`
    }, callback)
    .subscribe()
}

export const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`user-${userId}-notifications`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}

// File upload helpers
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file)
  
  if (error) return { error }
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)
    
  return { data: { ...data, publicUrl }, error: null }
}

export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
    
  return { error }
}
