import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';

export default function TripMembersSettings({ trip, onMembersUpdated }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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
            email,
            avatar_url,
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
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMembers(prev => prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        ));
        
        if (onMembersUpdated) {
          onMembersUpdated();
        }
        alert('Role updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Failed to change role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/trips/${trip.id}/members/${memberId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          setMembers(prev => prev.filter(member => member.id !== memberId));
          
          if (onMembersUpdated) {
            onMembersUpdated();
          }
          alert('Member removed successfully!');
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member');
      }
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading members...</p>
        </div>
      ) : members.length > 0 ? (
        members.map(member => (
          <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Image
                src={member.users?.avatar_url || '/profile-icon.png'}
                alt={member.users?.name || 'Member'}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-medium text-gray-900">
                  {member.users?.name || `${member.users?.first_name || ''} ${member.users?.last_name || ''}`.trim() || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-500">
                  {member.users?.email || 'No email'}
                </p>
                <p className="text-xs text-gray-400">
                  Member since {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                disabled={member.role === 'Admin' && members.filter(m => m.role === 'Admin').length === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Traveller">Traveller</option>
              </select>
              
              {member.role !== 'Admin' && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No members found</p>
        </div>
      )}
    </div>
  );
}
