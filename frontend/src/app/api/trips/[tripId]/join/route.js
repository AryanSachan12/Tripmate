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

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const { message = '', auto_join = false } = await request.json()

    // Get trip details to check visibility and auto_approve setting
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('auto_approve_requests, max_members, current_members, title, visibility')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check visibility restrictions
    if (trip.visibility === 'private') {
      return NextResponse.json(
        { error: 'This trip is private. Only invited members can join.' },
        { status: 403 }
      )
    }

    // For link-only trips, users should typically join via invite links
    // but we can still allow direct join requests if they somehow find the trip
    if (trip.visibility === 'link') {
      // Allow join requests for link-only trips, but mention it's typically via invite
      console.log(`User ${user.id} requesting to join link-only trip ${tripId}`)
    }

    // Check if trip is full
    if (trip.current_members >= trip.max_members) {
      return NextResponse.json(
        { error: 'This trip is full' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this trip' },
        { status: 400 }
      )
    }

    // If auto_join is requested and trip allows auto_approve
    if (auto_join && trip.auto_approve_requests) {
      // Add user directly as a member
      const { data: newMember, error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          role: 'Traveller',
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select(`
          id, user_id, role, status, joined_at,
          users:user_id (
            name, email, avatar_url, first_name, last_name
          )
        `)
        .single()

      if (memberError) {
        return NextResponse.json(
          { error: 'Failed to join trip: ' + memberError.message },
          { status: 400 }
        )
      }

      // Update trip member count
      await supabase
        .from('trips')
        .update({ current_members: trip.current_members + 1 })
        .eq('id', tripId)

      return NextResponse.json({
        message: 'Successfully joined the trip!',
        member: newMember
      })
    }

    // Check if user has already requested to join
    const { data: existingRequest } = await supabase
      .from('join_requests')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You have already requested to join this trip' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('join_requests')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Create notification for trip admins/managers
    const { data: admins } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .in('role', ['Admin', 'Manager'])
      .eq('status', 'active')

    // Get user info for notification
    const { data: userData } = await supabase
      .from('users')
      .select('name, first_name, last_name')
      .eq('id', user.id)
      .single()

    const userName = userData?.name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Someone'
    console.log('User data for notification:', userData, 'userName:', userName);

    // Create notifications for all admins/managers
    console.log('Creating notifications for admins:', admins);
    for (const admin of admins || []) {
      try {
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: admin.user_id,
            trip_id: tripId,
            type: 'join_request',
            title: 'New Join Request',
            message: `${userName} requested to join your trip`,
            data: { 
              trip_id: tripId,
              request_id: data.id, 
              requester_id: user.id 
            },
            is_sent: true
          })
          .select()

        if (notificationError) {
          console.error('Error creating notification for admin:', admin.user_id, notificationError);
        } else {
          console.log('Successfully created notification:', notificationData);
        }
      } catch (notificationErr) {
        console.error('Exception creating notification:', notificationErr);
      }
    }

    return NextResponse.json({
      message: 'Join request sent successfully',
      request: data
    })

  } catch (error) {
    console.error('Join request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await params;

    // Check if user has any join request (pending, approved, or rejected)
    const { data: existingRequest } = await supabase
      .from('join_requests')
      .select('id, status, review_message, reviewed_at')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      hasPendingRequest: existingRequest?.status === 'pending',
      hasRejectedRequest: existingRequest?.status === 'rejected',
      hasApprovedRequest: existingRequest?.status === 'approved',
      requestStatus: existingRequest?.status || null,
      reviewMessage: existingRequest?.review_message || null,
      reviewedAt: existingRequest?.reviewed_at || null
    });
  } catch (error) {
    console.error('Join request status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
