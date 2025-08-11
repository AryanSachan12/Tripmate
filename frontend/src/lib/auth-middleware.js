import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Cookie names
const COOKIE_NAMES = {
  ACCESS_TOKEN: 'sb-access-token',
  REFRESH_TOKEN: 'sb-refresh-token',
  USER_DATA: 'user-data'
};

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days
};

// Create Supabase client from cookies
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  return supabase;
}

// Get authenticated user from cookies
export async function getAuthenticatedUser(request) {
  try {
    // First try to get user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return user;
      }
    }
    
    // Fallback to cookie-based auth
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Don't log session missing errors as they're expected for unauthenticated requests
      if (!error.message?.includes('session missing')) {
        console.error('Auth error:', error);
      }
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Set auth cookies
export async function setAuthCookies(session) {
  const cookieStore = await cookies();
  
  if (session?.access_token && session?.refresh_token) {
    cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, session.access_token, COOKIE_OPTIONS);
    cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, session.refresh_token, COOKIE_OPTIONS);
    
    // Store basic user data for faster access
    if (session.user) {
      const userData = {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at
      };
      cookieStore.set(COOKIE_NAMES.USER_DATA, JSON.stringify(userData), COOKIE_OPTIONS);
    }
  }
}

// Clear auth cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
  cookieStore.delete(COOKIE_NAMES.REFRESH_TOKEN);
  cookieStore.delete(COOKIE_NAMES.USER_DATA);
}

// Middleware for API routes
export function withAuth(handler) {
  return async (request) => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Add user to request context
    request.user = user;
    return handler(request);
  };
}

// Get cached user data from cookies (faster than full auth check)
export async function getCachedUserData() {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get(COOKIE_NAMES.USER_DATA)?.value;
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting cached user data:', error);
    return null;
  }
}
