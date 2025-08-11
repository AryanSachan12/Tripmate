import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase-server'
import { createSupabaseServerClient } from '../../../../../../lib/supabase-server'
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
    return { user: null, token: null }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return { user: error ? null : user, token }
}

export async function PUT(request, { params }) {
  try {
    const { user, token } = await getAuthenticatedUser(request)
    if (!user || !token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId } = await params
    const updates = await request.json()

    // Check permissions and get trip data using admin client
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('created_by, start_date')
      .eq('id', tripId)
      .single()

    if (tripError || !tripData) {
      console.error('Error fetching trip data:', tripError);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    let hasPermission = false;

    // Trip creator automatically has Admin permissions
    if (tripData.created_by === user.id) {
      hasPermission = true;
    } else {
      // Check if user is a member with Admin or Manager role
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (memberData && ['Admin', 'Manager'].includes(memberData.role)) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      )
    }

    // If day is being updated, recalculate date
    if (updates.day) {
      const startDate = new Date(tripData.start_date)
      const targetDate = new Date(startDate)
      targetDate.setDate(startDate.getDate() + updates.day - 1)
      updates.date = targetDate.toISOString().split('T')[0]
    }

    // Use admin client for the update to bypass RLS temporarily
    // We've already checked permissions above, so this is safe
    const { data, error } = await supabase
      .from('itinerary_items')
      .update(updates)
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Itinerary item updated successfully',
      item: data
    })

  } catch (error) {
    console.error('Update itinerary item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user, token } = await getAuthenticatedUser(request)
    if (!user || !token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, itemId } = await params

    // Check permissions using admin client
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single()

    if (tripError || !tripData) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    let hasPermission = false;

    // Trip creator automatically has Admin permissions
    if (tripData.created_by === user.id) {
      hasPermission = true;
    } else {
      // Check if user is a member with Admin or Manager role
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (memberData && ['Admin', 'Manager'].includes(memberData.role)) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      )
    }

    // Use admin client for the delete to bypass RLS temporarily
    // We've already checked permissions above, so this is safe
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)
      .eq('trip_id', tripId)

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Itinerary item deleted successfully'
    })

  } catch (error) {
    console.error('Delete itinerary item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
