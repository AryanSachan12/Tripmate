import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthenticatedUser, getCachedUserData } from '../../../../lib/auth-middleware'

// Cache for user profiles
const profileCache = new Map();
const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getProfileFromCache(userId) {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
    return cached.data;
  }
  profileCache.delete(userId);
  return null;
}

function setProfileCache(userId, data) {
  profileCache.set(userId, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Check cache first
    const cachedProfile = getProfileFromCache(userId);
    if (cachedProfile) {
      console.log(`Profile cache hit for user ${userId} (${Date.now() - startTime}ms)`);
      return NextResponse.json({
        success: true,
        data: { user: cachedProfile }
      });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ user: data })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  const startTime = Date.now();
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const updates = await request.json()
    console.log('Profile update request for user:', user.id, 'Updates:', updates)

    // Remove sensitive fields that shouldn't be updated directly
    const allowedFields = [
      'name', 'first_name', 'last_name', 'avatar_url', 'phone', 
      'date_of_birth', 'location', 'bio', 'preferences', 'social_links'
    ]
    
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    console.log('Filtered updates:', filteredUpdates);

    // Add updated_at timestamp
    filteredUpdates.updated_at = new Date().toISOString();

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Clear cache for this user
    profileCache.delete(user.id);

    const duration = Date.now() - startTime;
    console.log(`Profile update completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: data }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
