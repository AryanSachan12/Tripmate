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
  const [showFileMessageModal, setShowFileMessageModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileMessage, setFileMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to get avatar URL with proper fallback
  const getAvatarUrl = (userData) => {
    // Try different avatar URL sources
    return userData?.avatar_url || 
           userData?.profile?.avatar_url || 
           userData?.user_metadata?.avatar_url ||
           '/profile-icon.png';
  };

  // Helper function to get current user avatar
  const getCurrentUserAvatar = () => {
    return user?.profile?.avatar_url || 
           user?.avatar_url || 
           user?.user_metadata?.avatar_url ||
           '/profile-icon.png';
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
        let messages = result.messages;
        
        // Fetch reply relationships for messages that have reply_to
        const messagesWithReplies = await Promise.all(
          messages.map(async (message) => {
            if (message.reply_to) {
              try {
                const { data: replyMessage } = await supabase
                  .from('trip_messages')
                  .select(`
                    id,
                    message,
                    message_type,
                    user:users(id, name)
                  `)
                  .eq('id', message.reply_to)
                  .single();
                
                if (replyMessage) {
                  message.reply_to_message = replyMessage;
                }
              } catch (error) {
                console.error('Error fetching reply message:', error);
              }
            }
            return message;
          })
        );
        
        if (append) {
          setMessages(prev => [...messagesWithReplies, ...prev]);
        } else {
          setMessages(messagesWithReplies);
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
    console.log('📤 Sending message:', messageData);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Create optimistic message for immediate UI update
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        message: messageData.message || '',
        message_type: messageData.message_type || 'text',
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        user_id: user.id,
        trip_id: trip.id,
        created_at: new Date().toISOString(),
        reply_to: messageData.reply_to,
        user: {
          id: user.id,
          name: user.profile?.name || user.name,
          avatar_url: getCurrentUserAvatar()
        },
        reply_to_message: replyingTo ? {
          id: replyingTo.id,
          message: replyingTo.message,
          message_type: replyingTo.message_type,
          user: replyingTo.user
        } : null,
        isOptimistic: true
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      const response = await fetch(`/api/trips/${trip.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(messageData),
      });

      console.log('📤 Message API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📤 Message sent successfully:', result);
        
        // Replace optimistic message with real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...result.data, id: result.data.id }
              : msg
          )
        );
        return result.data;
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        const errorData = await response.json();
        console.error('📤 Message send error:', errorData);
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
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

  // Handle file selection (show modal for custom message)
  const handleFileSelection = (file) => {
    setPendingFile(file);
    setShowFileMessageModal(true);
  };

  // Handle file upload with custom message
  const handleFileUpload = async (file, customMessage = '') => {
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
        
        // Use custom message or default message
        const finalMessage = customMessage.trim() || `Shared ${messageType}: ${result.file.name}`;
        
        await sendMessage({
          message: finalMessage,
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
        console.error('Upload error response:', errorData);
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle file message modal submission
  const handleFileMessageSubmit = async () => {
    if (pendingFile) {
      setShowFileMessageModal(false);
      await handleFileUpload(pendingFile, fileMessage);
      setPendingFile(null);
      setFileMessage('');
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
    const isOwnMessage = message.user_id === user?.id;
    
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-3">
            {message.message && !message.message.startsWith('Shared image:') && (
              <p className="text-inherit leading-relaxed">
                {message.message}
              </p>
            )}
            <div className="relative">
              <Image
                src={message.file_url}
                alt={message.file_name || 'Shared image'}
                width={300}
                height={200}
                className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.file_url, '_blank')}
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Click to view full size
              </div>
            </div>
            {message.file_name && (
              <p className="text-xs opacity-75 italic">{message.file_name}</p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-3">
            {message.message && !message.message.startsWith('Shared file:') && (
              <p className="text-inherit leading-relaxed mb-3">
                {message.message}
              </p>
            )}
            <div className={`p-4 rounded-lg border-2 border-dashed transition-all hover:shadow-md ${
              isOwnMessage 
                ? 'bg-white bg-opacity-20 border-white border-opacity-40 hover:bg-opacity-30' 
                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
            }`}>
              <div className="flex items-start space-x-3">
                {/* File icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                  isOwnMessage 
                    ? 'bg-gray-200' 
                    : 'bg-blue-200'
                }`}>
                  {message.file_mime_type?.includes('pdf') ? (
                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-red-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      <path d="M8 10a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM8 13a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    </svg>
                  ) : message.file_mime_type?.includes('word') || message.file_mime_type?.includes('document') ? (
                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-blue-600' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  ) : message.file_mime_type?.includes('excel') || message.file_mime_type?.includes('sheet') ? (
                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-green-600' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-gray-600' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                
                {/* File details */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm leading-tight ${
                    isOwnMessage ? 'text-gray-900' : 'text-gray-900'
                  }`}>
                    {message.file_name}
                  </h4>
                  <div className="flex items-center mt-1 space-x-2">
                    {message.file_size && (
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-gray-700' : 'text-gray-600'
                      }`}>
                        {(message.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                    {message.file_mime_type && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isOwnMessage 
                          ? 'bg-gray-200 text-gray-800' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {message.file_mime_type.split('/')[1].toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Download button */}
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-shrink-0 p-2 rounded-lg transition-all hover:scale-105 ${
                    isOwnMessage 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                  title="Download file"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
              
              {/* File preview hint */}
              <div className={`mt-3 pt-3 border-t ${
                isOwnMessage 
                  ? 'border-gray-300' 
                  : 'border-gray-200'
              }`}>
                <p className={`text-xs ${
                  isOwnMessage ? 'text-gray-600' : 'text-gray-500'
                }`}>
                  📎 Click the download button to open this file
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return <p className="text-inherit whitespace-pre-wrap leading-relaxed">{message.message}</p>;
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
          console.log('📨 Real-time message received:', payload);
          
          // Fetch the complete message with user data
          const { data } = await supabase
            .from('trip_messages')
            .select(`
              *,
              user:users(id, name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          console.log('📨 Fetched complete message data:', data);

          if (data) {
            // If this message has a reply_to, fetch the replied message
            if (data.reply_to) {
              const { data: replyMessage } = await supabase
                .from('trip_messages')
                .select(`
                  id,
                  message,
                  message_type,
                  user:users(id, name)
                `)
                .eq('id', data.reply_to)
                .single();
              
              if (replyMessage) {
                data.reply_to_message = replyMessage;
              }
            }
            
            // Check if this message is replacing an optimistic message
            setMessages(prev => {
              const hasOptimistic = prev.some(msg => msg.isOptimistic && msg.user_id === data.user_id);
              if (hasOptimistic) {
                console.log('🔄 Replacing optimistic message');
                // Replace the most recent optimistic message from this user
                const lastOptimisticIndex = prev.findLastIndex(msg => 
                  msg.isOptimistic && msg.user_id === data.user_id
                );
                if (lastOptimisticIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[lastOptimisticIndex] = data;
                  return newMessages;
                }
              }
              
              // Check if message already exists (avoid duplicates)
              const messageExists = prev.some(msg => msg.id === data.id);
              if (messageExists) {
                console.log('⚠️ Message already exists, skipping');
                return prev;
              }
              
              console.log('✅ Adding new message to chat');
              // Add new message
              return [...prev, data];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 Chat subscription status:', status);
      });

    console.log('🔗 Setting up real-time subscription for trip:', trip.id);

    return () => {
      console.log('🔌 Cleaning up chat subscription for trip:', trip.id);
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

  // Debug user data
  console.log('Current user data:', user);
  console.log('User avatar from profile:', user?.profile?.avatar_url);
  console.log('User avatar direct:', user?.avatar_url);

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
          
          // Debug message user data
          console.log('Message user data:', message.user);
          
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
              {/* Avatar for other users (left side) */}
              {!isOwnMessage && (
                <div className="flex-shrink-0 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    <Image
                      src={getAvatarUrl(message.user)}
                      alt={message.user?.name || 'User'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/profile-icon.png';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                {/* User name (only for other users) */}
                {!isOwnMessage && (
                  <p className="text-xs text-gray-500 mb-1 px-3">
                    {message.user?.name}
                  </p>
                )}

                {/* Reply context */}
                {message.reply_to_message && (
                  <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg border-l-4 border-gray-300 max-w-full">
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
                } ${message.isOptimistic ? 'opacity-70' : ''}`}>
                  {renderMessageContent(message)}
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{formatTimestamp(message.created_at)}</span>
                    <div className="flex items-center space-x-2">
                      {message.is_edited && (
                        <span className="italic">edited</span>
                      )}
                      {message.isOptimistic && (
                        <span className="italic">sending...</span>
                      )}
                    </div>
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

              {/* Avatar for own messages (right side) */}
              {isOwnMessage && (
                <div className="flex-shrink-0 mb-1">
                  <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center overflow-hidden">
                    <Image
                      src={getCurrentUserAvatar()}
                      alt={user?.profile?.name || user?.name || 'You'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/profile-icon.png';
                      }}
                    />
                  </div>
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
              handleFileSelection(file);
              e.target.value = ''; // Reset input
            }
          }}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        />
      </div>

      {/* File Message Modal */}
      {showFileMessageModal && pendingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add a message with your file
            </h3>
            
            {/* File preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                  {pendingFile.type.startsWith('image/') ? (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Message input */}
            <div className="mb-4">
              <label htmlFor="fileMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                id="fileMessage"
                value={fileMessage}
                onChange={(e) => setFileMessage(e.target.value)}
                placeholder="Add a message with your file..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            {/* Modal actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFileMessageModal(false);
                  setPendingFile(null);
                  setFileMessage('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isUploadingFile}
              >
                Cancel
              </button>
              <button
                onClick={handleFileMessageSubmit}
                disabled={isUploadingFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploadingFile ? 'Uploading...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
