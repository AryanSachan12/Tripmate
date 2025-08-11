import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase-server';
import { cookies } from 'next/headers';

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
    const { tripId } = await params;
    const { user } = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this trip
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single();

    if (!membership && (!trip || trip.created_by !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch expenses with related data
    const { data: expenses, error: expensesError } = await supabase
      .from('trip_expenses')
      .select(`
        *,
        paid_by_user:users!trip_expenses_paid_by_fkey(id, name, avatar_url),
        expense_splits(*)
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      expenses: expenses || [] 
    });

  } catch (error) {
    console.error('Error in expenses API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { tripId } = await params;
    const { user } = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this trip
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single();

    if (!membership && (!trip || trip.created_by !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { description, amount, category, paid_by, split_members, split_type, custom_splits } = body;

    // Validate required fields
    if (!description || !amount || !category || !split_members || split_members.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('trip_expenses')
      .insert({
        trip_id: tripId,
        description,
        amount: parseFloat(amount),
        category,
        paid_by: paid_by || user.id,
        created_by: user.id
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    // Create splits based on split type
    let splits = [];
    const totalAmount = parseFloat(amount);

    if (split_type === 'equal') {
      // Equal split
      const splitAmount = totalAmount / split_members.length;
      splits = split_members.map(memberId => ({
        expense_id: expense.id,
        user_id: memberId,
        amount: splitAmount,
        percentage: (100 / split_members.length)
      }));
    } else if (split_type === 'custom' || split_type === 'percentage') {
      // Custom amounts or percentage splits
      splits = split_members.map(memberId => ({
        expense_id: expense.id,
        user_id: memberId,
        amount: custom_splits[memberId] || 0,
        percentage: custom_splits[memberId] ? (custom_splits[memberId] / totalAmount) * 100 : 0
      }));
    }

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splits);

    if (splitsError) {
      console.error('Error creating splits:', splitsError);
      // Clean up the expense if splits failed
      await supabase.from('trip_expenses').delete().eq('id', expense.id);
      return NextResponse.json({ error: 'Failed to create expense splits' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      expense 
    });

  } catch (error) {
    console.error('Error in expenses API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
