import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function TripInvitesSettings({ trip }) {
  const [invites, setInvites] = useState([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    has_password: false,
    password: '',
    has_expiry: false,
    expires_at: '',
    max_uses: '',
    is_active: true
  });

  useEffect(() => {
    if (trip?.id) {
      fetchInvites();
    }
  }, [trip?.id]);

  const fetchInvites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/invites`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setInvites(result.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const createInvite = async (inviteOptions = {}) => {
    setCreatingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(inviteOptions),
      });

      if (response.ok) {
        const result = await response.json();
        setInvites(prev => [...prev, result.invite]);
        setShowInviteModal(false);
        resetInviteForm();
        alert('Invite link created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  };

  const resetInviteForm = () => {
    setInviteForm({
      has_password: false,
      password: '',
      has_expiry: false,
      expires_at: '',
      max_uses: '',
      is_active: true
    });
  };

  const handleCreateInvite = () => {
    setShowInviteModal(true);
  };

  const handleSubmitInvite = () => {
    let inviteOptions = { ...inviteForm };
    
    if (!inviteOptions.has_password) {
      inviteOptions.password = '';
    }
    if (!inviteOptions.has_expiry) {
      inviteOptions.expires_at = '';
    }
    if (!inviteOptions.max_uses || inviteOptions.max_uses === '') {
      inviteOptions.max_uses = null;
    } else {
      inviteOptions.max_uses = parseInt(inviteOptions.max_uses);
    }

    createInvite(inviteOptions);
  };

  const toggleInviteStatus = async (inviteId, currentStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/invites`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          inviteId,
          is_active: !currentStatus
        }),
      });

      if (response.ok) {
        setInvites(prev => prev.map(invite => 
          invite.id === inviteId ? { ...invite, is_active: !currentStatus } : invite
        ));
        alert(`Invite ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error toggling invite status:', error);
      alert('Failed to update invite status');
    }
  };

  const isPrivateTrip = trip.visibility === 'private';

  return (
    <>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📨 Trip Invites</h4>
          <p className="text-blue-700 text-sm">Create invite links to share your trip with others. Invited users can join directly without approval.</p>
        </div>

        {isPrivateTrip && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Private Trip</h4>
            <p className="text-red-700 text-sm mb-2">
              Invite links are disabled for private trips. Change trip visibility to "Public" or "Link Only" in the General tab to enable invite creation.
            </p>
            {invites.some(invite => !invite.is_active) && (
              <p className="text-red-600 text-sm font-medium">
                💡 All existing invite links have been automatically disabled and cannot be re-enabled until the trip visibility is changed.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900">Active Invites</h4>
          <div className="space-x-2">
            <button
              onClick={() => createInvite({})}
              disabled={creatingInvite || isPrivateTrip}
              className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isPrivateTrip ? "Cannot create invites for private trips" : ""}
            >
              {creatingInvite ? 'Creating...' : 'Quick Invite'}
            </button>
            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite || isPrivateTrip}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isPrivateTrip ? "Cannot create invites for private trips" : ""}
            >
              Advanced Invite
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {invites.length > 0 ? (
            invites.map(invite => (
              <div key={invite.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invite.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invite.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {invite.has_password && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          🔒 Password Protected
                        </span>
                      )}
                      {invite.has_expiry && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ⏰ Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Created {new Date(invite.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {invite.invite_url || `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/invite/${invite.invite_code}`}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(invite.invite_url || `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/invite/${invite.invite_code}`)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>Uses: {invite.current_uses || 0} / {invite.max_uses || '∞'}</span>
                      <div className="flex items-center space-x-2">
                        {invite.has_expiry && invite.expires_at && (
                          <span>
                            {new Date(invite.expires_at) > new Date() ? 'Valid' : 'Expired'}
                          </span>
                        )}
                        <button
                          onClick={() => toggleInviteStatus(invite.id, invite.is_active)}
                          disabled={isPrivateTrip && !invite.is_active}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            invite.is_active 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : isPrivateTrip 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={isPrivateTrip && !invite.is_active ? "Cannot enable invites for private trips" : ""}
                        >
                          {invite.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No invite links created yet</p>
              <p className="text-gray-400 text-sm">Create an invite link to share this trip</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Creation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create Advanced Invite</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  resetInviteForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Password Protection */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="has_password"
                    checked={inviteForm.has_password}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, has_password: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_password" className="ml-2 text-sm font-medium text-gray-900">
                    Password Protection
                  </label>
                </div>
                {inviteForm.has_password && (
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="has_expiry"
                    checked={inviteForm.has_expiry}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, has_expiry: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_expiry" className="ml-2 text-sm font-medium text-gray-900">
                    Set Expiry Date
                  </label>
                </div>
                {inviteForm.has_expiry && (
                  <input
                    type="datetime-local"
                    value={inviteForm.expires_at}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              {/* Max Uses */}
              <div>
                <label htmlFor="max_uses" className="block text-sm font-medium text-gray-900 mb-2">
                  Maximum Uses (optional)
                </label>
                <input
                  type="number"
                  id="max_uses"
                  min="1"
                  placeholder="Unlimited"
                  value={inviteForm.max_uses}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, max_uses: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={inviteForm.is_active}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-900">
                  Active (can be used immediately)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  resetInviteForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInvite}
                disabled={creatingInvite}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingInvite ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
