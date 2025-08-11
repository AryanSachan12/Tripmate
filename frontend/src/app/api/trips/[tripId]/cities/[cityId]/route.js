import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase'
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

// GET /api/trips/[tripId]/cities/[cityId] - Get specific city
export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, cityId } = await params

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
        { error: 'Forbidden - You must be a trip member to view city details' },
        { status: 403 }
      )
    }

    // Get the specific city
    const { data: city, error } = await supabase
      .from('trip_cities')
      .select('*')
      .eq('id', cityId)
      .eq('trip_id', tripId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      city
    })

  } catch (error) {
    console.error('Get city error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/trips/[tripId]/cities/[cityId] - Update specific city
export async function PUT(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, cityId } = await params
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
        { error: 'Forbidden - You must be an admin or manager to update cities' },
        { status: 403 }
      )
    }

    // Update the city
    const { data: updatedCity, error } = await supabase
      .from('trip_cities')
      .update({
        city_name: cityData.city_name,
        country: cityData.country || null,
        order_index: cityData.order_index,
        arrival_date: cityData.arrival_date || null,
        departure_date: cityData.departure_date || null,
        notes: cityData.notes || null
      })
      .eq('id', cityId)
      .eq('trip_id', tripId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!updatedCity) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'City updated successfully',
      city: updatedCity
    })

  } catch (error) {
    console.error('Update city error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/trips/[tripId]/cities/[cityId] - Delete specific city
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId, cityId } = await params

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
        { error: 'Forbidden - You must be an admin or manager to delete cities' },
        { status: 403 }
      )
    }

    // Check if this is the last city (prevent deletion)
    const { count } = await supabase
      .from('trip_cities')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)

    if (count <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last city. A trip must have at least one city.' },
        { status: 400 }
      )
    }

    // Delete the city
    const { error } = await supabase
      .from('trip_cities')
      .delete()
      .eq('id', cityId)
      .eq('trip_id', tripId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'City deleted successfully'
    })

  } catch (error) {
    console.error('Delete city error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
