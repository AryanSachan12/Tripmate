import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';

export default function TripJoinRequestsSettings({ trip, onMembersUpdated }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trip?.id) {
      fetchJoinRequests();
    }
  }, [trip?.id]);

  const fetchJoinRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/join-requests`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setJoinRequests(result.joinRequests || []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/join-requests`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId,
          action: 'approve'
        }),
      });

      if (response.ok) {
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (onMembersUpdated) {
          onMembersUpdated();
        }
        
        alert('Join request approved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/join-requests`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId,
          action: 'reject'
        }),
      });

      if (response.ok) {
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        alert('Join request rejected successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading join requests...</p>
        </div>
      ) : joinRequests.length > 0 ? (
        joinRequests.map(request => (
          <div key={request.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Image
                  src={request.users?.avatar_url || '/profile-icon.png'}
                  alt={request.users?.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {request.users?.name || `${request.users?.first_name || ''} ${request.users?.last_name || ''}`.trim() || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {request.users?.email || 'No email'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Requested {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApproveRequest(request.id)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectRequest(request.id)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
            
            {request.message && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{request.message}</p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500">No pending join requests</p>
        </div>
      )}
    </div>
  );
}
