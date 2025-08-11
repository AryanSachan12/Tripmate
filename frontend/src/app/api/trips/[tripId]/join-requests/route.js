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
    return { user: null, token: null }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  return { user: error ? null : user, token }
}

export async function GET(request, { params }) {
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { tripId } = await params

    // Check if user is admin or manager of this trip
    const { data: membership, error: memberError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !membership || !['Admin', 'Manager'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins and managers can view join requests' },
        { status: 403 }
      )
    }

    // Get pending join requests for this trip
    const { data: joinRequests, error: requestsError } = await supabase
      .from('join_requests')
      .select(`
        id,
        message,
        status,
        requested_at,
        user_id,
        users:user_id (
          name,
          email,
          avatar_url,
          first_name,
          last_name
        )
      `)
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching join requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      joinRequests: joinRequests || []
    })

  } catch (error) {
    console.error('Join requests API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const { requestId, action, reviewMessage = '' } = await request.json()

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Check if user is admin or manager of this trip
    const { data: membership, error: memberError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !membership || !['Admin', 'Manager'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins and managers can manage join requests' },
        { status: 403 }
      )
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .single()

    if (requestError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      )
    }

    // Update the join request status
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_message: reviewMessage
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating join request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update join request' },
        { status: 500 }
      )
    }

    // If approved, add user to trip members
    if (action === 'approve') {
      const { error: memberInsertError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: joinRequest.user_id,
          role: 'Traveller',
          status: 'active'
        })

      if (memberInsertError) {
        console.error('Error adding trip member:', memberInsertError)
        return NextResponse.json(
          { error: 'Failed to add user to trip' },
          { status: 500 }
        )
      }
    }

    // Create notification for the requester
    const notificationType = action === 'approve' ? 'join_approved' : 'join_rejected'
    const notificationTitle = action === 'approve' ? 'Join Request Approved' : 'Join Request Rejected'
    const notificationMessage = action === 'approve' 
      ? 'Your request to join the trip has been approved!'
      : `Your request to join the trip has been rejected. ${reviewMessage || ''}`

    // Create notification directly in the notifications table
    console.log('Creating notification for requester:', joinRequest.user_id);
    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: joinRequest.user_id,
        trip_id: tripId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: { 
          trip_id: tripId,
          request_id: requestId, 
          action: action,
          reviewer_id: user.id 
        },
        is_sent: true
      })
      .select()

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      // Don't return error here as the main action succeeded
    } else {
      console.log('Successfully created notification:', notificationData);
    }

    return NextResponse.json({
      message: `Join request ${action}d successfully`,
      action: action
    })

  } catch (error) {
    console.error('Join request management API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add a new endpoint to check if user has pending join request
export async function POST(request, { params }) {
  try {
    const { action } = await request.json();
    
    if (action === 'check-status') {
      const { user } = await getAuthenticatedUser(request);
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { tripId } = await params;

      // Check if user has any pending join request
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      return NextResponse.json({
        hasPendingRequest: !!existingRequest,
        requestStatus: existingRequest?.status || null
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Join request status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
