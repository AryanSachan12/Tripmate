import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase-server';

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

export async function POST(request) {
  try {
    const { userId, userData } = await request.json();

    // Validate required fields
    if (!userId || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and userData' },
        { status: 400 }
      );
    }

    const { age, graduateOrNot, annualIncome, familyMembers, frequentFlyer, everTravelledAbroad } = userData;

    // Validate userData fields
    if (
      age === undefined || 
      graduateOrNot === undefined || 
      annualIncome === undefined || 
      familyMembers === undefined || 
      frequentFlyer === undefined || 
      everTravelledAbroad === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required userData fields' },
        { status: 400 }
      );
    }

    // Call FastAPI prediction endpoint
    const predictionResponse = await fetch(`${FASTAPI_BASE_URL}/ml/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Age: parseFloat(age),
        GraduateOrNot: parseInt(graduateOrNot),
        AnnualIncome: parseFloat(annualIncome),
        FamilyMembers: parseFloat(familyMembers),
        FrequentFlyer: parseInt(frequentFlyer),
        EverTravelledAbroad: parseInt(everTravelledAbroad),
      }),
    }).catch(error => {
      throw new Error(`Failed to connect to FastAPI server at ${FASTAPI_BASE_URL}. Make sure the server is running.`);
    });

    if (!predictionResponse.ok) {
      const errorText = await predictionResponse.text();
      throw new Error(`FastAPI prediction failed: ${errorText}`);
    }

    const predictionData = await predictionResponse.json();

    // Save prediction to database
    const { data: existingPrediction } = await supabase
      .from('user_insurance_predictions')
      .select('id')
      .eq('user_id', userId)
      .single();

    const predictionRecord = {
      user_id: userId,
      age: parseFloat(age),
      graduate_or_not: parseInt(graduateOrNot),
      annual_income: parseFloat(annualIncome),
      family_members: parseFloat(familyMembers),
      frequent_flyer: parseInt(frequentFlyer),
      ever_travelled_abroad: parseInt(everTravelledAbroad),
      prediction: predictionData.prediction,
      probability: predictionData.probability,
    };

    let dbResult;
    if (existingPrediction) {
      // Update existing prediction
      dbResult = await supabase
        .from('user_insurance_predictions')
        .update(predictionRecord)
        .eq('user_id', userId)
        .select();
    } else {
      // Insert new prediction
      dbResult = await supabase
        .from('user_insurance_predictions')
        .insert(predictionRecord)
        .select();
    }

    if (dbResult.error) {
      throw new Error(`Database error: ${dbResult.error.message}`);
    }

    return NextResponse.json({
      success: true,
      prediction: predictionData.prediction,
      probability: predictionData.probability,
      saved: true,
      data: dbResult.data[0],
    });

  } catch (error) {
    console.error('Insurance prediction error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get specific user prediction
      const { data, error } = await supabase
        .from('user_insurance_predictions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return NextResponse.json({ prediction: data });
    } else {
      // Get all predictions (for admin dashboard)
      const { data, error } = await supabase
        .from('user_insurance_predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ predictions: data });
    }

  } catch (error) {
    console.error('Get predictions error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
