"use client";
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export default function TripAIHelper({ trip }) {
  const { user } = useUser();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: `Hello! I'm your AI travel assistant for **${trip.title}** in ${trip.location}. I can help you with local recommendations, weather information, travel tips, and more based on your specific trip details. What would you like to know?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load previous chat history when component mounts
  useEffect(() => {
    if (trip?.id && user?.id) {
      loadChatHistory();
    }
  }, [trip?.id, user?.id]);

  const loadChatHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/ai/chat-history?tripId=${trip.id}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const { history } = await response.json();
        if (history && history.length > 0) {
          const chatMessages = history.flatMap(item => [
            {
              id: `user-${item.id}`,
              type: 'user',
              content: item.user_message,
              timestamp: item.created_at
            },
            {
              id: `ai-${item.id}`,
              type: 'ai',
              content: item.ai_response,
              timestamp: item.created_at
            }
          ]);

          setMessages(prev => [
            prev[0], // Keep the welcome message
            ...chatMessages.reverse() // Reverse to show oldest first
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Enhanced suggestions based on trip context
  const generateSuggestions = () => {
    const suggestions = [
      `What's the weather like in ${trip.location} during ${trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long' }) : 'my trip dates'}?`,
      `Recommend the best restaurants in ${trip.location}`,
      `What are the must-visit attractions in ${trip.location}?`,
      `Create a detailed day-by-day itinerary for ${trip.location}`,
      `Transportation options in ${trip.location}`,
      `Safety tips and emergency contacts for ${trip.location}`,
      `Cultural customs and etiquette in ${trip.location}`
    ];

    // Add context-specific suggestions
    if (trip.members?.length > 1) {
      suggestions.push(`Group activities for ${trip.members.length} people in ${trip.location}`);
    } else {
      suggestions.push(`Solo travel tips for ${trip.location}`);
    }

    if (trip.budget) {
      suggestions.push(`Budget-friendly activities in ${trip.location}`);
    } else {
      suggestions.push(`Activities and experiences in ${trip.location}`);
    }

    // Add seasonal suggestions if dates are available
    if (trip.start_date) {
      const month = new Date(trip.start_date).getMonth() + 1;
      if (month >= 6 && month <= 8) {
        suggestions.push(`Summer activities in ${trip.location}`);
      } else if (month >= 12 || month <= 2) {
        suggestions.push(`Winter activities in ${trip.location}`);
      }
    }

    return suggestions.filter(s => s && s.trim());
  };

  const handleSendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare trip context for AI
      const tripContext = {
        id: trip.id,
        title: trip.title,
        location: trip.location,
        startDate: trip.start_date,
        endDate: trip.end_date,
        description: trip.description,
        budget: trip.budget,
        members: trip.members || [],
        user: user
      };

      const response = await fetch('/api/ai/trip-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          tripContext: tripContext
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Sorry, I encountered an error: ${error.message}. Please try again later.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    handleSendMessage(suggestion);
  };

  const clearChatHistory = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `Hello! I'm your AI travel assistant for **${trip.title}** in ${trip.location}. I can help you with local recommendations, weather information, travel tips, and more based on your specific trip details. What would you like to know?`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting for AI responses
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br/>'); // Line breaks
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Travel Assistant</h3>
              <p className="text-sm text-gray-500">Get personalized recommendations for {trip.location}</p>
            </div>
          </div>
          <button
            onClick={clearChatHistory}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear chat history"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {message.type === 'ai' && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-600">AI Assistant</span>
                </div>
              )}
              <div className="whitespace-pre-line text-sm" dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}></div>
              <p className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-600">AI Assistant</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions - Always Available */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Quick suggestions:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {generateSuggestions().map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-gray-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your trip..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
