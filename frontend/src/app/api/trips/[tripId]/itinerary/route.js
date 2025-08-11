import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase-server'
import { createSupabaseServerClient } from '../../../../../lib/supabase-server'
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
    const { tripId } = await params

    // Use admin client to bypass RLS issues for now
    // We'll check permissions manually if needed
    const { data, error } = await supabase
      .from('itinerary_items')
      .select(`
        *,
        comment_count
      `)
      .eq('trip_id', tripId)
      .order('day', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Get itinerary error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ itinerary: data })

  } catch (error) {
    console.error('Get itinerary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const { user, token } = await getAuthenticatedUser(request)
    if (!user || !token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create user-context Supabase client
    const userSupabase = createSupabaseServerClient(token)

    const { tripId } = await params
    const itemData = await request.json()

    // Check permissions using admin client
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
    let userRole = null;

    // Trip creator automatically has Admin permissions
    if (tripData.created_by === user.id) {
      hasPermission = true;
      userRole = 'Admin (Creator)';
    } else {
      // Check if user is a member with Admin or Manager role
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      console.log('Member permission check:', { memberData, memberError, tripId, userId: user.id });

      if (memberError) {
        console.error('Error checking member permissions:', memberError);
        return NextResponse.json(
          { error: 'Error checking permissions' },
          { status: 500 }
        )
      }

      if (memberData && ['Admin', 'Manager'].includes(memberData.role)) {
        hasPermission = true;
        userRole = memberData.role;
      }
    }

    if (!hasPermission) {
      console.log('Permission denied. User role:', userRole);
      return NextResponse.json(
        { error: `Forbidden - Admin or Manager access required. Your role: ${userRole || 'Not a member'}` },
        { status: 403 }
      )
    }

    if (!tripData.start_date) {
      return NextResponse.json(
        { error: 'Trip start date not set. Please set trip dates first.' },
        { status: 400 }
      )
    }

    const startDate = new Date(tripData.start_date)
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + itemData.day - 1)

    const itemToInsert = {
      ...itemData,
      trip_id: tripId,
      created_by: user.id,
      date: targetDate.toISOString().split('T')[0]
    };

    console.log('Creating itinerary item:', itemToInsert);

    // Use the admin client for the insert operation to bypass RLS temporarily
    // We've already checked permissions above, so this is safe
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(itemToInsert)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Itinerary item added successfully',
      item: data
    })

  } catch (error) {
    console.error('Add itinerary item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
