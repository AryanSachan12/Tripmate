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
    const { message, tripContext } = await request.json();

    if (!message || !tripContext) {
      return NextResponse.json(
        { error: 'Message and trip context are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Create trip context string
    const contextString = buildTripContext(tripContext);

    // Create the prompt with context
    const prompt = `
You are a knowledgeable and friendly AI travel assistant for TripMate, a trip planning application. You have access to detailed information about the user's specific trip.

TRIP CONTEXT:
${contextString}

USER QUESTION: "${message}"

INSTRUCTIONS:
- Provide helpful, personalized responses based on the specific trip context above
- Be conversational, enthusiastic, and use relevant emojis
- Include specific recommendations for their destination when possible
- If suggesting places, activities, or services, be as specific as possible for their location
- Consider the group size, travel dates, and budget if provided
- Format your response with clear sections using **bold** for headings
- Keep responses informative but concise (aim for 2-3 paragraphs max unless detailed info is requested)
- If the question isn't travel-related, politely redirect to travel topics while being helpful

RESPONSE STYLE:
- Use bullet points for lists
- Include practical tips and local insights
- Mention any seasonal considerations based on their travel dates
- Consider group dynamics if there are multiple travelers
- Be encouraging and excited about their trip

Please provide your response now:`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Save chat history to database
    try {
      const { error: historyError } = await supabase
        .from('ai_chat_history')
        .insert({
          trip_id: tripContext.id || null,
          user_id: tripContext.user?.id || null,
          user_message: message,
          ai_response: text,
          context: {
            tripTitle: tripContext.title,
            location: tripContext.location,
            startDate: tripContext.startDate,
            endDate: tripContext.endDate,
            groupSize: tripContext.members?.length || 0,
            budget: tripContext.budget
          }
        });

      if (historyError) {
        console.error('Error saving chat history:', historyError);
        // Don't fail the request if history saving fails
      }
    } catch (historyError) {
      console.error('Error saving chat history:', historyError);
      // Don't fail the request if history saving fails
    }

    return NextResponse.json({
      success: true,
      response: text
    });

  } catch (error) {
    console.error('AI Assistant Error:', error);
    
    // Handle specific Google AI errors
    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check your configuration.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'AI assistant temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

function buildTripContext(tripContext) {
  const {
    title,
    location,
    startDate,
    endDate,
    description,
    budget,
    members,
    user
  } = tripContext;

  let context = `
TRIP DETAILS:
- Trip Title: ${title || 'Not specified'}
- Destination: ${location || 'Not specified'}
- Travel Dates: ${startDate ? new Date(startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Not specified'} to ${endDate ? new Date(endDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Not specified'}
- Trip Description: ${description || 'No description provided'}
- Budget: ${budget || 'Not specified'}
`;

  if (members && members.length > 0) {
    context += `- Group Size: ${members.length} ${members.length === 1 ? 'person' : 'people'}\n`;
    context += `- Trip Members: ${members.map(member => member.name || member.email).join(', ')}\n`;
    
    // Add group type context
    if (members.length === 1) {
      context += `- Travel Type: Solo travel\n`;
    } else if (members.length === 2) {
      context += `- Travel Type: Couple/Pair travel\n`;
    } else if (members.length <= 5) {
      context += `- Travel Type: Small group travel\n`;
    } else {
      context += `- Travel Type: Large group travel\n`;
    }
  }

  if (user) {
    context += `- Trip organized by: ${user.name || user.email}\n`;
  }

  // Calculate trip duration and add seasonal context
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    context += `- Trip Duration: ${duration} ${duration === 1 ? 'day' : 'days'}\n`;
    
    // Add season context
    const month = start.getMonth() + 1;
    let season = '';
    if (month >= 3 && month <= 5) season = 'Spring';
    else if (month >= 6 && month <= 8) season = 'Summer';
    else if (month >= 9 && month <= 11) season = 'Fall/Autumn';
    else season = 'Winter';
    
    context += `- Season: ${season} travel\n`;
    
    // Add time until trip
    const now = new Date();
    const daysUntilTrip = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    if (daysUntilTrip > 0) {
      context += `- Time until trip: ${daysUntilTrip} days\n`;
    } else if (daysUntilTrip === 0) {
      context += `- Trip Status: Starting today!\n`;
    } else if (Math.abs(daysUntilTrip) <= duration) {
      context += `- Trip Status: Currently ongoing\n`;
    }
  }

  return context;
}
