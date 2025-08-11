"use client";
import { useRef, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import TripGeneralSettings from './TripGeneralSettings';
import TripStatusSettings from './TripStatusSettings';
import TripMembersSettings from './TripMembersSettings';
import TripJoinRequestsSettings from './TripJoinRequestsSettings';
import TripInvitesSettings from './TripInvitesSettings';
import TripPermissionsSettings from './TripPermissionsSettings';
import TripDangerZoneSettings from './TripDangerZoneSettings';

export default function TripSettings({ trip, onClose, onTripUpdated, onMembersUpdated, initialTab = 'general' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [joinRequestsCount, setJoinRequestsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const generalRef = useRef();

  useEffect(() => {
    if (trip?.id) {
      fetchJoinRequestsCount();
    }
  }, [trip?.id]);

  const fetchJoinRequestsCount = async () => {
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
        setJoinRequestsCount(result.joinRequests?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching join requests count:', error);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    let generalChanges = {};
    let valid = true;
    // Only validate and collect if general tab is present
    if (generalRef.current) {
      valid = generalRef.current.validate();
      if (!valid) {
        setActiveTab('general');
        setSaving(false);
        return;
      }
      generalChanges = generalRef.current.getPendingChanges();
    }
    // Add more tab refs/changes here if needed in the future
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(generalChanges),
      });
      if (response.ok) {
        const updatedTrip = { ...trip, ...generalChanges };
        onTripUpdated?.(updatedTrip);
        onClose();
      } else {
        const errorData = await response.json();
        if (generalRef.current) generalRef.current.setError(errorData.error || 'Failed to update trip');
      }
    } catch (error) {
      if (generalRef.current) generalRef.current.setError(error.message || 'Failed to update trip');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General' },
    { id: 'status', name: 'Trip Status' },
    { id: 'members', name: 'Members & Roles' },
    { id: 'requests', name: `Join Requests (${joinRequestsCount})` },
    { id: 'invites', name: 'Invites' },
    { id: 'permissions', name: 'Permissions' },
    { id: 'danger', name: 'Danger Zone' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <TripGeneralSettings ref={generalRef} trip={trip} />;
      
      case 'status':
        return <TripStatusSettings trip={trip} onTripUpdated={onTripUpdated} />;
      
      case 'members':
        return <TripMembersSettings trip={trip} onMembersUpdated={onMembersUpdated} />;
      
      case 'requests':
        return (
          <TripJoinRequestsSettings 
            trip={trip} 
            onMembersUpdated={() => {
              onMembersUpdated?.();
              fetchJoinRequestsCount();
            }} 
          />
        );
      
      case 'invites':
        return <TripInvitesSettings trip={trip} />;
      
      case 'permissions':
        return <TripPermissionsSettings trip={trip} onTripUpdated={onTripUpdated} />;
      
      case 'danger':
        return <TripDangerZoneSettings trip={trip} onClose={onClose} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Trip Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={saving}
          >
            Close
          </button>
          
        </div>
      </div>
    </div>
  );
}
