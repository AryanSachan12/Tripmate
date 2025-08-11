import { NextResponse } from 'next/server'
import { createServiceClient } from '../../../../../lib/supabase'
import { getAuthenticatedUser } from '../../../../../lib/auth-middleware'

export async function PATCH(request, { params }) {
  try {
    const { tripId } = params
    const { status } = await request.json()

    // Validate status
    const validStatuses = ['planning', 'active', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: planning, active, completed, cancelled' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const serviceClient = createServiceClient()

    // Check if user is admin of the trip
    const { data: membership, error: membershipError } = await serviceClient
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only trip admins can change trip status' },
        { status: 403 }
      )
    }

    // Update trip status
    const { data: trip, error: updateError } = await serviceClient
      .from('trips')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating trip status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update trip status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: trip,
      message: `Trip status updated to ${status}`
    })

  } catch (error) {
    console.error('Error updating trip status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
