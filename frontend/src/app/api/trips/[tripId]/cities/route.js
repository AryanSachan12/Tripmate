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

// GET /api/trips/[tripId]/cities - Get all cities for a trip
export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    const { tripId } = await params

    // First check if this is a public trip
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('visibility')
      .eq('id', tripId)
      .single()

    if (tripError) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // If trip is public, allow access without authentication
    // If trip is private or link-only, require membership
    if (tripData.visibility !== 'public') {
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Check if user has access to this trip
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!memberData) {
        return NextResponse.json(
          { error: 'Forbidden - You must be a trip member to view cities' },
          { status: 403 }
        )
      }
    }

    // Get cities for the trip
    const { data: cities, error } = await supabase
      .from('trip_cities')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      cities: cities || []
    })

  } catch (error) {
    console.error('Get cities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/trips/[tripId]/cities - Add a new city to trip
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
    const cityData = await request.json()

    // Check if user can edit this trip (Admin or Manager)
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData || !['Admin', 'Manager'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - You must be an admin or manager to add cities' },
        { status: 403 }
      )
    }

    // Validate city data
    if (!cityData.city_name) {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      )
    }

    // Get the next order index
    const { data: lastCity } = await supabase
      .from('trip_cities')
      .select('order_index')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const nextOrderIndex = lastCity ? lastCity.order_index + 1 : 0

    // Insert the new city
    const { data: newCity, error } = await supabase
      .from('trip_cities')
      .insert({
        trip_id: tripId,
        city_name: cityData.city_name,
        country: cityData.country || null,
        order_index: cityData.order_index !== undefined ? cityData.order_index : nextOrderIndex,
        arrival_date: cityData.arrival_date || null,
        departure_date: cityData.departure_date || null,
        notes: cityData.notes || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'City added successfully',
      city: newCity
    })

  } catch (error) {
    console.error('Add city error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/trips/[tripId]/cities - Update cities order or bulk update
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
    const { cities } = await request.json()

    // Check if user can edit this trip (Admin or Manager)
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!memberData || !['Admin', 'Manager'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - You must be an admin or manager to update cities' },
        { status: 403 }
      )
    }

    // Update cities in batch
    const updates = cities.map((city, index) => ({
      id: city.id,
      trip_id: tripId,
      city_name: city.city_name,
      country: city.country || null,
      order_index: index,
      arrival_date: city.arrival_date || null,
      departure_date: city.departure_date || null,
      notes: city.notes || null
    }))

    const { data: updatedCities, error } = await supabase
      .from('trip_cities')
      .upsert(updates)
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cities updated successfully',
      cities: updatedCities
    })

  } catch (error) {
    console.error('Update cities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
