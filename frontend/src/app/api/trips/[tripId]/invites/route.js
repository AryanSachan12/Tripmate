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

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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
    const {
      has_password = false,
      password,
      has_expiry = false,
      expires_at,
      max_uses,
      is_active = true
    } = await request.json()

    // Check if user can create invites (Admin or Manager)
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData || !['Admin', 'Manager'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      )
    }

    // Check trip visibility - prevent invite creation for private trips
    const { data: tripData } = await supabase
      .from('trips')
      .select('visibility')
      .eq('id', tripId)
      .single()

    if (tripData?.visibility === 'private') {
      return NextResponse.json(
        { error: 'Cannot create invite links for private trips. Change visibility to public or link-only first.' },
        { status: 403 }
      )
    }

    const inviteCode = generateInviteCode()
    
    // Hash password if provided
    let password_hash = null
    if (has_password && password) {
      // In production, use proper password hashing like bcrypt
      password_hash = Buffer.from(password).toString('base64')
    }

    const { data, error } = await supabase
      .from('trip_invites')
      .insert({
        trip_id: tripId,
        created_by: user.id,
        invite_code: inviteCode,
        has_password,
        password_hash,
        has_expiry,
        expires_at: has_expiry ? expires_at : null,
        max_uses,
        is_active,
        current_uses: 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Return invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteCode}`

    return NextResponse.json({
      message: 'Invite created successfully',
      invite: {
        ...data,
        invite_url: inviteUrl
      }
    })

  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params

    // Check if user can view invites (Admin or Manager)
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData || !['Admin', 'Manager'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Add invite URLs
    const invitesWithUrls = data.map(invite => ({
      ...invite,
      invite_url: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.invite_code}`
    }))

    return NextResponse.json({ invites: invitesWithUrls })

  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = await params
    const { inviteId, is_active } = await request.json()

    // Check if user can modify invites (Admin or Manager)
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData || !['Admin', 'Manager'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      )
    }

    // If trying to enable an invite, check trip visibility
    if (is_active) {
      const { data: tripData } = await supabase
        .from('trips')
        .select('visibility')
        .eq('id', tripId)
        .single()

      if (tripData?.visibility === 'private') {
        return NextResponse.json(
          { error: 'Cannot enable invite links for private trips. Change trip visibility to public or link-only first.' },
          { status: 403 }
        )
      }
    }

    // Update invite status
    const { data, error } = await supabase
      .from('trip_invites')
      .update({ is_active })
      .eq('id', inviteId)
      .eq('trip_id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Invite ${is_active ? 'enabled' : 'disabled'} successfully`,
      invite: data
    })

  } catch (error) {
    console.error('Update invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
