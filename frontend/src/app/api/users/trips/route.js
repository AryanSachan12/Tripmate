import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { cookies } from 'next/headers'

async function getAuthenticatedUser(request) {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization')
  let token = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // Fallback to cookies
    const cookieStore = await cookies()
    const supabaseToken = cookieStore.get('supabase-auth-token')
    token = supabaseToken?.value
  }
  
  if (!token) {
    return null
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Get user's trips by querying trip_members table and joining with trips
    const { data, error, count } = await supabase
      .from('trip_members')
      .select(`
        *,
        trip:trips(
          id,
          title,
          description,
          location,
          start_date,
          end_date,
          status,
          visibility,
          budget,
          max_members,
          current_members,
          cover_image_url,
          created_at,
          created_by,
          created_by_user:users!trips_created_by_fkey(id, name, email)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Transform the data to include trip details at the top level
    const trips = data?.map(memberRecord => ({
      ...memberRecord.trip,
      userRole: memberRecord.role,
      memberRole: memberRecord.role,
      joinedAt: memberRecord.joined_at,
      memberStatus: memberRecord.status,
      member_count: memberRecord.trip?.current_members || 0,
      // Add destination field for compatibility
      destination: memberRecord.trip?.location
    })) || []

    return NextResponse.json({
      trips,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Get user trips error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
