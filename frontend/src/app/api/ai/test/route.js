import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'GEMINI_API_KEY not found in environment variables',
        hasApiKey: false
      });
    }

    // Check if API key format looks correct
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey.startsWith('AIza')) {
      return NextResponse.json({
        status: 'warning',
        message: 'API key format may be incorrect. Gemini API keys typically start with "AIza"',
        hasApiKey: true,
        keyFormat: 'invalid'
      });
    }

    // Test the API with a simple request
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch (modelError) {
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      } catch (fallbackError) {
        throw new Error('No supported Gemini model available');
      }
    }
    
    const result = await model.generateContent('Hello, respond with just "API working"');
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      status: 'success',
      message: 'Gemini API is working correctly',
      hasApiKey: true,
      keyFormat: 'valid',
      testResponse: text
    });

  } catch (error) {
    console.error('API Test Error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'API test failed',
      error: error.message,
      hasApiKey: !!process.env.GEMINI_API_KEY,
      errorDetails: {
        status: error.status,
        statusText: error.statusText
      }
    });
  }
}
