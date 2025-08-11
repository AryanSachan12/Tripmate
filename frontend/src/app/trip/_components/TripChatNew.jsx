"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import Image from 'next/image';

export default function TripChat({ trip }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  const fetchMessages = async (pageNum = 1, append = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/messages?page=${pageNum}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (append) {
          setMessages(prev => [...result.messages, ...prev]);
        } else {
          setMessages(result.messages);
        }
        setHasMore(result.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = () => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  };

  // Send message
  const sendMessage = async (messageData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const result = await response.json();
        // Message will be added via realtime subscription
        return result.data;
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Handle text message submission
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        message: newMessage,
        message_type: 'text',
        reply_to: replyingTo?.id || null
      });
      setNewMessage('');
      setReplyingTo(null);
    } finally {
      setIsSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tripId', trip.id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/upload/chat-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const messageType = result.file.type.startsWith('image/') ? 'image' : 'file';
        
        await sendMessage({
          message: `Shared ${messageType}: ${result.file.name}`,
          message_type: messageType,
          file_url: result.file.url,
          file_name: result.file.name,
          file_size: result.file.size,
          file_mime_type: result.file.type,
          reply_to: replyingTo?.id || null
        });
        
        setReplyingTo(null);
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Render message content based on type
  const renderMessageContent = (message) => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.message && <p className="text-gray-900">{message.message}</p>}
            <div className="relative max-w-sm">
              <Image
                src={message.file_url}
                alt={message.file_name || 'Shared image'}
                width={300}
                height={200}
                className="rounded-lg object-cover cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.file_url, '_blank')}
              />
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            {message.message && <p className="text-gray-900">{message.message}</p>}
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{message.file_name}</p>
                {message.file_size && (
                  <p className="text-xs text-gray-500">
                    {(message.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-blue-600 hover:text-blue-700"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        );
      
      default:
        return <p className="text-gray-900 whitespace-pre-wrap">{message.message}</p>;
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!trip?.id) return;

    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`trip_messages:${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${trip.id}`
        },
        async (payload) => {
          // Fetch the complete message with user data
          const { data } = await supabase
            .from('trip_messages')
            .select(`
              *,
              user:users(id, name, avatar_url),
              reply_to_message:trip_messages!trip_messages_reply_to_fkey(
                id,
                message,
                message_type,
                user:users(id, name)
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view chat</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Trip Chat</h3>
        <p className="text-sm text-gray-500">{messages.length} messages</p>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load More Button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadMoreMessages}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => {
          const isOwnMessage = message.user_id === user?.id;
          
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                {/* Reply context */}
                {message.reply_to_message && (
                  <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg border-l-4 border-gray-300">
                    <p className="text-xs text-gray-600 font-medium">
                      Replying to {message.reply_to_message.user?.name}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {message.reply_to_message.message}
                    </p>
                  </div>
                )}

                {/* Message bubble */}
                <div className={`p-3 rounded-lg ${
                  isOwnMessage 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {renderMessageContent(message)}
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{formatTimestamp(message.created_at)}</span>
                    {message.is_edited && (
                      <span className="ml-2 italic">edited</span>
                    )}
                  </div>
                </div>

                {/* Message actions */}
                <div className="flex items-center mt-1 space-x-2">
                  <button
                    onClick={() => setReplyingTo(message)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Reply
                  </button>
                </div>
              </div>

              {/* Avatar */}
              {!isOwnMessage && (
                <div className="order-0 mr-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {message.user?.avatar_url ? (
                      <Image
                        src={message.user.avatar_url}
                        alt={message.user.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {message.user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center truncate w-8">
                    {message.user?.name?.split(' ')[0]}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply context bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Replying to <span className="font-medium">{replyingTo.user?.name}</span>
            </p>
            <p className="text-sm text-gray-500 truncate">{replyingTo.message}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={isSending}
            />
          </div>

          {/* File upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Attach file"
          >
            {isUploadingFile ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = ''; // Reset input
            }
          }}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        />
      </div>
    </div>
  );
}
