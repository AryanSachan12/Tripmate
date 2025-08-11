import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { tripContext, userInstructions } = await request.json();

    if (!tripContext || !tripContext.id) {
      return NextResponse.json(
        { error: 'Trip context is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Validate user has permission to edit this trip
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    // Check user permissions for this trip
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripContext.id)
      .single();

    if (tripError || !tripData) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    let hasPermission = false;

    // Trip creator automatically has Admin permissions
    if (tripData.created_by === user.id) {
      hasPermission = true;
    } else {
      // Check if user is a member with Admin or Manager role
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripContext.id)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (memberData && (memberData.role === 'Admin' || memberData.role === 'Manager')) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to generate itinerary' },
        { status: 403 }
      );
    }

    // Calculate trip duration
    const startDate = new Date(tripContext.startDate);
    const endDate = new Date(tripContext.endDate);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Build trip context for AI
    const contextString = buildTripContext(tripContext);

    // Create the prompt for itinerary generation
    const prompt = `
You are an expert travel planner AI. Generate a detailed day-by-day itinerary for the following trip.

TRIP CONTEXT:
${contextString}

DURATION: ${durationDays} days
USER INSTRUCTIONS: ${userInstructions || 'Create a balanced itinerary with a mix of must-see attractions, local experiences, and free time.'}

REQUIREMENTS:
1. Create exactly ${durationDays} days of activities
2. Each day should have 2-4 activities/experiences
3. Consider travel time between locations
4. Include a mix of activities: sightseeing, dining, cultural experiences, and relaxation
5. Suggest specific times when appropriate
6. Consider the group size and any budget constraints mentioned

RESPONSE FORMAT:
You must respond with a valid JSON array only. No other text before or after. The format should be:

[
  {
    "day": 1,
    "title": "Activity Title",
    "description": "Detailed description of the activity, including why it's special and what to expect. Include practical tips.",
    "time": "09:00",
    "location": "Specific location name and address if known",
    "duration_minutes": 120,
    "cost_estimate": "$25 per person",
    "booking_url": "https://example.com/booking",
    "notes": "Additional notes, tips, or reminders for this activity"
  },
  {
    "day": 1,
    "title": "Another Activity",
    "description": "Another detailed description...",
    "time": "14:00", 
    "location": "Another location",
    "duration_minutes": 90,
    "cost_estimate": "Free",
    "booking_url": null,
    "notes": "Bring comfortable walking shoes"
  }
]

CRITICAL TIME FORMAT RULES:
- ALWAYS use 24-hour time format: "HH:MM" (e.g., "09:00", "14:30", "20:00")
- NEVER use words like "Flexible", "Morning", "Afternoon", "Evening"
- NEVER use 12-hour format (no AM/PM)
- Use specific times like "09:00", "13:00", "18:00"
- If timing is flexible, still provide a specific time

Important:
- Use exact 24-hour time format (e.g., "09:00", "14:30") - this is mandatory
- Make descriptions informative and engaging (2-3 sentences minimum)
- Include specific location names and addresses when possible
- Distribute activities across all ${durationDays} days
- Consider logical flow and geography to minimize travel time
- Each day should start with day 1, then day 2, etc.
- Provide realistic duration_minutes (e.g., museum visit: 120, restaurant meal: 90, hiking: 180)
- Include cost_estimate with currency and specifics (e.g., "$15 per person", "Free", "$50-80 per night")
- Add booking_url only when you know a real URL, otherwise use null
- Include helpful notes with practical tips, requirements, or warnings

Generate the itinerary now as a JSON array:`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up the response - remove markdown code blocks if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse the JSON response
    let itineraryItems;
    try {
      itineraryItems = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI Response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(itineraryItems)) {
      return NextResponse.json(
        { error: 'Invalid AI response format. Please try again.' },
        { status: 500 }
      );
    }

    // Validate and sanitize the itinerary items
    const sanitizedItems = itineraryItems.map((item, index) => {
      // Sanitize time field - ensure it's in HH:MM format
      let sanitizedTime = '09:00'; // Default time
      
      if (item.time) {
        const timeStr = item.time.toString().toLowerCase();
        
        // Check if it's already in proper format (HH:MM)
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
          sanitizedTime = timeStr.padStart(5, '0'); // Ensure HH:MM format
        } 
        // Handle common flexible time descriptions
        else if (timeStr.includes('morning') || timeStr.includes('breakfast')) {
          sanitizedTime = '09:00';
        }
        else if (timeStr.includes('lunch') || timeStr.includes('afternoon')) {
          sanitizedTime = '13:00';
        }
        else if (timeStr.includes('evening') || timeStr.includes('dinner')) {
          sanitizedTime = '18:00';
        }
        else if (timeStr.includes('night')) {
          sanitizedTime = '20:00';
        }
        else if (timeStr.includes('flexible') || timeStr.includes('anytime')) {
          // Distribute flexible times throughout the day
          const baseHour = 9 + (index % 8); // 9 AM to 4 PM
          sanitizedTime = `${baseHour.toString().padStart(2, '0')}:00`;
        }
        else {
          // Try to extract any numbers and assume they're hours
          const timeMatch = timeStr.match(/(\d{1,2})/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            if (hour >= 0 && hour <= 23) {
              sanitizedTime = `${hour.toString().padStart(2, '0')}:00`;
            }
          }
        }
        
        // Debug log for problematic times
        if (timeStr !== sanitizedTime) {
          console.log(`Converted time "${item.time}" to "${sanitizedTime}"`);
        }
      }

      return {
        trip_id: tripContext.id,
        day: item.day || Math.floor(index / 3) + 1, // Fallback day calculation
        title: item.title || `Activity ${index + 1}`,
        description: item.description || 'Generated activity',
        time: sanitizedTime,
        location: item.location || tripContext.location,
        date: getDateForDay(startDate, item.day || Math.floor(index / 3) + 1),
        order_index: index,
        created_by: user.id,
        duration_minutes: item.duration_minutes || null,
        cost_estimate: item.cost_estimate || null,
        booking_url: item.booking_url || null,
        notes: item.notes || null
      };
    });

    // Debug log the sanitized items before insertion
    console.log('Sanitized items before DB insertion:', sanitizedItems.map(item => ({
      title: item.title,
      time: item.time,
      day: item.day
    })));

    // Insert all items into the database
    const { data: insertedItems, error: insertError } = await supabase
      .from('itinerary_items')
      .insert(sanitizedItems)
      .select();

    if (insertError) {
      console.error('Error inserting itinerary items:', insertError);
      return NextResponse.json(
        { error: 'Failed to save itinerary items to database' },
        { status: 500 }
      );
    }

    // Save the AI generation request to chat history for reference
    try {
      await supabase
        .from('ai_chat_history')
        .insert({
          trip_id: tripContext.id,
          user_id: user.id,
          user_message: `Generate itinerary: ${userInstructions || 'Default itinerary generation'}`,
          ai_response: `Generated ${insertedItems.length} itinerary items for ${durationDays} days`,
          context: {
            tripTitle: tripContext.title,
            location: tripContext.location,
            startDate: tripContext.startDate,
            endDate: tripContext.endDate,
            groupSize: tripContext.members?.length || 0,
            budget: tripContext.budget,
            action: 'generate_itinerary'
          }
        });
    } catch (historyError) {
      console.error('Error saving generation history:', historyError);
      // Don't fail the request if history saving fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${insertedItems.length} itinerary items for your ${durationDays}-day trip!`,
      items: insertedItems,
      itemCount: insertedItems.length
    });

  } catch (error) {
    console.error('AI Itinerary Generation Error:', error);
    return NextResponse.json(
      { error: `Failed to generate itinerary: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to build trip context string
function buildTripContext(tripContext) {
  let context = `
**Trip Title:** ${tripContext.title}
**Destination:** ${tripContext.location}
**Start Date:** ${tripContext.startDate ? new Date(tripContext.startDate).toLocaleDateString() : 'Not set'}
**End Date:** ${tripContext.endDate ? new Date(tripContext.endDate).toLocaleDateString() : 'Not set'}
**Group Size:** ${tripContext.members?.length || 1} ${tripContext.members?.length === 1 ? 'person' : 'people'}
`;

  if (tripContext.description) {
    context += `**Description:** ${tripContext.description}\n`;
  }

  if (tripContext.budget) {
    context += `**Budget:** ${tripContext.budget}\n`;
  }

  if (tripContext.members && tripContext.members.length > 0) {
    context += `**Group Members:** ${tripContext.members.map(m => m.name || 'Member').join(', ')}\n`;
  }

  return context;
}

// Helper function to calculate date for a specific day
function getDateForDay(startDate, day) {
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + day - 1);
  return targetDate.toISOString().split('T')[0];
}
