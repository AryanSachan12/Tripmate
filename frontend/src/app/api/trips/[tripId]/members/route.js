import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
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

export async function GET(request, { params }) {
  try {
    const { tripId } = await params

    const { data, error } = await supabase
      .from('trip_members')
      .select(`
        *,
        users (
          id, name, avatar_url, location, bio
        )
      `)
      .eq('trip_id', tripId)
      .eq('status', 'active')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ members: data })

  } catch (error) {
    console.error('Get trip members error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = params
    const { userId, role = 'Traveller' } = await request.json()

    // Validate that the requesting user is the trip creator or admin
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single()

    if (tripError) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check if user is trip creator or admin member
    const isCreator = trip.created_by === user.id
    let isAdmin = false
    
    if (!isCreator) {
      const { data: membership } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      isAdmin = membership?.role === 'Admin'
    }

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only trip creators and admins can add members' },
        { status: 403 }
      )
    }

    // Add the member (using service role to bypass RLS)
    const { data: memberData, error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: tripId,
        user_id: userId,
        role: role,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select(`
        *,
        users (
          id, name, avatar_url, location, bio
        )
      `)
      .single()

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      )
    }

    // Update trip member count
    const { data: updatedCount } = await supabase
      .rpc('update_trip_member_count', { trip_id: tripId })

    return NextResponse.json({
      message: 'Member added successfully!',
      member: memberData,
      updated_count: updatedCount
    }, { status: 201 })

  } catch (error) {
    console.error('Add trip member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
