"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';

const COMMENT_TYPES = {
  general: { label: 'General', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  suggestion: { label: 'Suggestion', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  concern: { label: 'Concern', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  approval: { label: 'Approval', color: 'text-green-600', bgColor: 'bg-green-100' }
};

export default function ItineraryComments({ tripId, itemId, isOpen, onClose, onCommentUpdate }) {
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newCommentType, setNewCommentType] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('general');

  // Helper function to get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Fetch comments
  const fetchComments = async () => {
    if (!isOpen || !tripId || !itemId) return;
    
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/trips/${tripId}/itinerary/${itemId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        console.error('Failed to fetch comments');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/trips/${tripId}/itinerary/${itemId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: newComment,
          comment_type: newCommentType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        setNewCommentType('general');
        // Call callback to update parent component
        if (onCommentUpdate) {
          onCommentUpdate();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to add comment: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing comment
  const startEdit = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment);
    setEditType(comment.comment_type);
  };

  // Update comment
  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/trips/${tripId}/itinerary/${itemId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: editText,
          comment_type: editType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => prev.map(c => c.id === commentId ? data.comment : c));
        setEditingComment(null);
        setEditText('');
        setEditType('general');
      } else {
        const errorData = await response.json();
        alert(`Failed to update comment: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/trips/${tripId}/itinerary/${itemId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        // Call callback to update parent component
        if (onCommentUpdate) {
          onCommentUpdate();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to delete comment: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingComment(null);
    setEditText('');
    setEditType('general');
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchComments();
  }, [isOpen, tripId, itemId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Comments & Feedback</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500">No comments yet</p>
              <p className="text-sm text-gray-400">Be the first to add feedback!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Image
                      src={comment.user?.avatar_url || '/profile-icon.png'}
                      alt={comment.user?.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {comment.user?.name || `${comment.user?.first_name || ''} ${comment.user?.last_name || ''}`.trim() || 'Anonymous'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${COMMENT_TYPES[comment.comment_type]?.color} ${COMMENT_TYPES[comment.comment_type]?.bgColor}`}>
                            {COMMENT_TYPES[comment.comment_type]?.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.created_at)}
                            {comment.updated_at !== comment.created_at && ' (edited)'}
                          </span>
                          {comment.user_id === user?.id && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => startEdit(comment)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingComment === comment.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows="3"
                            placeholder="Edit your comment..."
                          />
                          <div className="flex items-center justify-between">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              {Object.entries(COMMENT_TYPES).map(([key, type]) => (
                                <option key={key} value={key}>{type.label}</option>
                              ))}
                            </select>
                            <div className="flex space-x-2">
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={!editText.trim()}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <div className="border-t border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none"
                rows="3"
                placeholder="Add your comment or feedback..."
              />
            </div>
            <div className="flex items-center justify-between">
              <select
                value={newCommentType}
                onChange={(e) => setNewCommentType(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(COMMENT_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
