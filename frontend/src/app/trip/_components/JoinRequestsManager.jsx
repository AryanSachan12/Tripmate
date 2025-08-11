"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export default function JoinRequestsManager({ trip, onMemberAdded }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    if (trip?.id) {
      fetchJoinRequests();
    }
  }, [trip?.id]);

  const fetchJoinRequests = async () => {
    try {
      // Get current session for access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No session found for join requests');
        return;
      }

      console.log('Fetching join requests for trip:', trip.id);

      const response = await fetch(`/api/trips/${trip.id}/join-requests`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Join requests fetched:', data);
        setJoinRequests(data.joinRequests || []);
      } else {
        console.error('Failed to fetch join requests:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (requestId, action, reviewMessage = '') => {
    setProcessingRequest(requestId);
    
    try {
      // Get current session for access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No session found');
        return;
      }

      const response = await fetch(`/api/trips/${trip.id}/join-requests`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId,
          action,
          reviewMessage
        }),
      });

      if (response.ok) {
        // Remove the processed request from the list
        const processedRequest = joinRequests.find(req => req.id === requestId);
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        
        // If approved, notify parent to update member list
        if (action === 'approve' && processedRequest && onMemberAdded) {
          onMemberAdded({
            id: processedRequest.user_id,
            name: processedRequest.users?.name || 'New Member',
            role: 'Traveller',
            avatar: processedRequest.users?.avatar_url || '/profile-icon.png',
            email: processedRequest.users?.email
          });
        }
        
        // Show success message
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        alert(`Join request ${actionText} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error processing join request:', error);
      alert('Failed to process join request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (joinRequests.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Join Requests</h3>
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No pending join requests</p>
          <p className="text-gray-400 text-xs mt-1">New requests will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Join Requests ({joinRequests.length})
      </h3>
      
      <div className="space-y-4">
        {joinRequests.map((request) => (
          <div key={request.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col space-y-3">
              {/* User Info Section */}
              <div className="flex items-start space-x-3">
                <Image
                  src={request.users?.avatar_url || '/profile-icon.png'}
                  alt={request.users?.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {request.users?.name || 'Anonymous User'}
                  </h4>
                  <p className="text-sm text-gray-500 truncate">
                    {request.users?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested {formatDate(request.requested_at)}
                  </p>
                </div>
              </div>

              {/* Message Section */}
              {request.message && (
                <div className="w-full">
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 break-words">
                    <strong className="block mb-1">Message:</strong>
                    <span className="whitespace-pre-wrap">{request.message}</span>
                  </div>
                </div>
              )}
              
              {/* Action Buttons Section */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => handleJoinRequest(request.id, 'approve')}
                  disabled={processingRequest === request.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingRequest === request.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Approve'
                  )}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Reason for rejection (optional):');
                    if (reason !== null) {
                      handleJoinRequest(request.id, 'reject', reason);
                    }
                  }}
                  disabled={processingRequest === request.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
