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

async function checkTripAccess(tripId, userId, requiredRole = null) {
  const { data, error } = await supabase
    .from('trip_members')
    .select('role, status')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  if (requiredRole && data.role !== requiredRole && data.role !== 'Admin') {
    return null
  }

  return data
}

export async function GET(request, { params }) {
  try {
    const { tripId } = await params

    // Try to get user for private trip access check
    const user = await getAuthenticatedUser(request)

    // First, try to get from trips table with full details
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        created_by_user:users!trips_created_by_fkey(id, name, email),
        trip_members(
          id,
          user_id,
          role,
          status,
          joined_at,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('id', tripId)
      .single()

    if (tripError) {
      console.error('Trip query error:', tripError)
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this trip
    if (tripData.visibility === 'private') {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for private trips' },
          { status: 401 }
        )
      }

      // Check if user is a member or creator
      const hasAccess = tripData.created_by === user.id || 
                       tripData.trip_members?.some(member => 
                         member.user_id === user.id && member.status === 'active'
                       )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this private trip' },
          { status: 403 }
        )
      }
    }

    // Get user's role in this trip if they are authenticated
    let userRole = null;
    if (user) {
      const userMembership = tripData.trip_members?.find(member => 
        member.user_id === user.id && member.status === 'active'
      );
      userRole = userMembership?.role || (tripData.created_by === user.id ? 'Admin' : null);
    }

    // Filter to only include active members
    const activeMembers = tripData.trip_members?.filter(member => member.status === 'active') || [];

    // Add userRole to trip data
    const tripWithUserRole = {
      ...tripData,
      trip_members: activeMembers,
      userRole,
      members: activeMembers // Alias for compatibility
    };

    return NextResponse.json({ 
      data: tripWithUserRole,
      trip: tripWithUserRole // Include both for compatibility
    })

  } catch (error) {
    console.error('Get trip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const updates = await request.json()

    // Check if user is admin
    const memberData = await checkTripAccess(tripId, user.id, 'Admin')
    if (!memberData) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Trip updated successfully',
      trip: data
    })

  } catch (error) {
    console.error('Update trip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params

    // Check if user is admin
    const memberData = await checkTripAccess(tripId, user.id, 'Admin')
    if (!memberData) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Trip deleted successfully'
    })

  } catch (error) {
    console.error('Delete trip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const { tripId } = await params
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or manager of the trip
    const access = await checkTripAccess(tripId, user.id, 'Admin')
    if (!access) {
      return NextResponse.json(
        { error: 'You must be an admin to update trip settings' },
        { status: 403 }
      )
    }

    const updateData = await request.json()

    // Validate update data
    const allowedFields = [
      'cover_image_url', 'visibility', 'auto_approve_requests', 
      'is_locked', 'lock_days_before', 'title', 'description',
      'location', 'start_date', 'end_date', 'budget', 'max_members', 'tags'
    ]

    const filteredData = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        filteredData[key] = value
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the trip
    const { data, error } = await supabase
      .from('trips')
      .update(filteredData)
      .eq('id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // If visibility is changed to private, deactivate all existing invite links
    if (filteredData.visibility === 'private') {
      const { error: inviteError } = await supabase
        .from('trip_invites')
        .update({ is_active: false })
        .eq('trip_id', tripId)
        .eq('is_active', true)

      if (inviteError) {
        console.error('Error deactivating invites:', inviteError)
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({
      message: 'Trip updated successfully',
      trip: data
    })

  } catch (error) {
    console.error('Update trip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
