import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function TripPermissionsSettings({ trip, onTripUpdated }) {
  const [lockDaysBeforeTrip, setLockDaysBeforeTrip] = useState(trip.lock_days_before || 3);
  const [isLockEnabled, setIsLockEnabled] = useState(trip.is_locked || false);

  const updateTripSettings = async (settings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const updatedTrip = { ...trip, ...settings };
        if (onTripUpdated) {
          onTripUpdated(updatedTrip);
        }
        return true;
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update trip settings');
        return false;
      }
    } catch (error) {
      console.error('Error updating trip settings:', error);
      alert('Failed to update trip settings');
      return false;
    }
  };

  const handleAutoApproveChange = async (autoApprove) => {
    const success = await updateTripSettings({ auto_approve_requests: autoApprove });
    if (success) {
      alert(`Auto-approve ${autoApprove ? 'enabled' : 'disabled'} successfully!`);
    }
  };

  const handleLockSettingsChange = async (isLocked, daysBefore = null) => {
    const settings = { is_locked: isLocked };
    if (daysBefore !== null) {
      settings.lock_days_before = daysBefore;
    }
    
    const success = await updateTripSettings(settings);
    if (success) {
      setIsLockEnabled(isLocked);
      if (daysBefore !== null) {
        setLockDaysBeforeTrip(daysBefore);
      }
      alert('Lock settings updated successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Role Permissions</h4>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-blue-800">Admin:</span>
            <span className="text-blue-700 ml-2">Full control, manage members, edit trip, delete trip</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Manager:</span>
            <span className="text-blue-700 ml-2">Edit itinerary, approve join requests, moderate chat</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Traveller:</span>
            <span className="text-blue-700 ml-2">View trip, participate in chat, use AI assistant</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Auto-approve join requests</h4>
            <p className="text-sm text-gray-500">Automatically accept new members without approval</p>
          </div>
          <input
            type="checkbox"
            checked={trip.auto_approve_requests || false}
            onChange={(e) => handleAutoApproveChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Lock trip before start date</h4>
              <p className="text-sm text-gray-500">Prevent itinerary changes before trip starts</p>
            </div>
            <input
              type="checkbox"
              checked={trip.is_locked || isLockEnabled}
              onChange={(e) => handleLockSettingsChange(e.target.checked, lockDaysBeforeTrip)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          {(trip.is_locked || isLockEnabled) && (
            <div className="ml-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">
                  Lock trip
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={trip.lock_days_before || lockDaysBeforeTrip}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 1;
                    setLockDaysBeforeTrip(days);
                    handleLockSettingsChange(true, days);
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-700">
                  {(trip.lock_days_before || lockDaysBeforeTrip) === 1 ? 'day' : 'days'} before trip starts
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Members won't be able to modify the itinerary {lockDaysBeforeTrip} {lockDaysBeforeTrip === 1 ? 'day' : 'days'} before the trip begins
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Allow member invites</h4>
            <p className="text-sm text-gray-500">Let members invite others to the trip</p>
          </div>
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>
    </div>
  );
}
