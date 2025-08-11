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
    const cookieStore = cookies()
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
    const { inviteCode } = await params

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .select(`
        *,
        trips (
          id, title, description, location, start_date, end_date, 
          budget, max_members, current_members, tags, cover_image_url,
          users (
            name, avatar_url
          )
        )
      `)
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      )
    }

    // Check if invite is active
    if (!invite.is_active) {
      return NextResponse.json(
        { error: 'This invite link has been disabled' },
        { status: 410 }
      )
    }

    // Check if invite has expired
    if (invite.has_expiry && invite.expires_at) {
      const now = new Date()
      const expiryDate = new Date(invite.expires_at)
      if (now > expiryDate) {
        return NextResponse.json(
          { error: 'This invite link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if invite has reached max uses
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit' },
        { status: 410 }
      )
    }

    // Get trip members for display
    const { data: members } = await supabase
      .from('trip_members')
      .select(`
        users (
          id, name, avatar_url
        )
      `)
      .eq('trip_id', invite.trip_id)
      .eq('status', 'active')
      .limit(5)

    return NextResponse.json({
      trip: {
        ...invite.trips,
        host: invite.trips.users,
        members: members?.map(m => m.users) || []
      },
      requiresPassword: invite.has_password,
      isAtCapacity: invite.trips.current_members >= invite.trips.max_members
    })

  } catch (error) {
    console.error('Get invite error:', error)
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

    const { inviteCode } = await params
    const { password } = await request.json()

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      )
    }

    // Check if invite has expired
    if (invite.has_expiry && invite.expires_at) {
      const now = new Date()
      const expiryDate = new Date(invite.expires_at)
      if (now > expiryDate) {
        return NextResponse.json(
          { error: 'This invite link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if invite has reached max uses
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit' },
        { status: 410 }
      )
    }

    // Check password if required
    if (invite.has_password && invite.password_hash) {
      const providedPasswordHash = Buffer.from(password || '').toString('base64')
      if (providedPasswordHash !== invite.password_hash) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        )
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this trip' },
        { status: 400 }
      )
    }

    // Check trip capacity
    const { data: trip } = await supabase
      .from('trips')
      .select('current_members, max_members')
      .eq('id', invite.trip_id)
      .single()

    if (trip.current_members >= trip.max_members) {
      return NextResponse.json(
        { error: 'This trip is at full capacity' },
        { status: 400 }
      )
    }

    // Add user to trip
    const { data: newMember, error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: invite.trip_id,
        user_id: user.id,
        role: 'Traveller',
        status: 'active'
      })
      .select()
      .single()

    if (memberError) {
      // Handle specific duplicate key error
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already a member of this trip' },
          { status: 409 }
        )
      }
      console.error('Member creation error:', memberError)
      return NextResponse.json(
        { error: `Failed to join trip: ${memberError.message}` },
        { status: 400 }
      )
    }

    // Update invite usage count
    await supabase
      .from('trip_invites')
      .update({ current_uses: invite.current_uses + 1 })
      .eq('id', invite.id)

    return NextResponse.json({
      message: 'Successfully joined the trip!',
      tripId: invite.trip_id
    })

  } catch (error) {
    console.error('Join via invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
