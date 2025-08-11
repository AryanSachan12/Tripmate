import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function TripDangerZoneSettings({ trip, onClose }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (trip?.id) {
      fetchMembers();
    }
  }, [trip?.id]);

  const fetchMembers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          *,
          users:user_id (
            name,
            first_name,
            last_name
          )
        `)
        .eq('trip_id', trip.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleArchiveTrip = async () => {
    if (!confirm('Are you sure you want to archive this trip? You can restore it later.')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ archived: true }),
      });

      if (response.ok) {
        alert('Trip archived successfully!');
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error archiving trip:', error);
      alert('Failed to archive trip');
    }
  };

  const handleDeleteTrip = async () => {
    const confirmText = `DELETE ${trip.title}`;
    const userInput = prompt(
      `Are you sure you want to delete this trip? This action cannot be undone.\n\nType "${confirmText}" to confirm:`
    );
    
    if (userInput !== confirmText) {
      alert('Deletion cancelled. The text did not match.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        alert('Trip deleted successfully!');
        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  const handleTransferOwnership = async (newAdminId) => {
    if (!newAdminId) {
      alert('Please select a new admin');
      return;
    }

    if (!confirm('Are you sure you want to transfer ownership? You will become a regular member.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ newAdminId }),
      });

      if (response.ok) {
        alert('Ownership transferred successfully!');
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-900 mb-2">⚠️ Danger Zone</h4>
        <p className="text-red-700 text-sm">These actions cannot be undone. Please proceed with caution.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Archive Trip</h4>
          <p className="text-sm text-gray-500 mb-4">Archive this trip to hide it from active trips. You can restore it later.</p>
          <button 
            onClick={handleArchiveTrip}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors"
          >
            Archive Trip
          </button>
        </div>

        <div className="border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Delete Trip</h4>
          <p className="text-sm text-gray-500 mb-4">Permanently delete this trip and all associated data. This action cannot be undone.</p>
          <button 
            onClick={handleDeleteTrip}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Delete Trip
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Transfer Ownership</h4>
          <p className="text-sm text-gray-500 mb-4">Transfer admin rights to another member. You will become a regular member.</p>
          <div className="flex space-x-3">
            <select 
              id="newAdmin"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select new admin...</option>
              {members.filter(m => m.role !== 'Admin').map(member => (
                <option key={member.id} value={member.user_id}>
                  {member.users?.name || `${member.users?.first_name || ''} ${member.users?.last_name || ''}`.trim() || 'Unknown User'}
                </option>
              ))}
            </select>
            <button 
              onClick={() => {
                const select = document.getElementById('newAdmin');
                handleTransferOwnership(select.value);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
            >
              Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
