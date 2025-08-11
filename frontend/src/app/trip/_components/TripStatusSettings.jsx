import { getStatusColor } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';

export default function TripStatusSettings({ trip, onTripUpdated }) {
  const tripStatuses = [
    { value: 'planning', label: 'Planning', description: 'Trip is being planned and organized' },
    { value: 'active', label: 'Active', description: 'Trip is currently ongoing' },
    { value: 'completed', label: 'Completed', description: 'Trip has finished' },
    { value: 'cancelled', label: 'Cancelled', description: 'Trip has been cancelled' }
  ];

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/trips/${trip.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const result = await response.json();
        if (onTripUpdated) {
          onTripUpdated(result.data);
        }
        alert(`Trip status updated to ${newStatus}`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating trip status:', error);
      alert('Failed to update trip status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📊 Trip Status Management</h4>
        <p className="text-blue-700 text-sm">Change the current status of your trip. This affects how the trip appears to members and in search results.</p>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Current Status</h4>
        <div className="flex items-center space-x-3 mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
            {trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Unknown'}
          </span>
          <span className="text-gray-500 text-sm">
            Last updated: {trip.updated_at ? new Date(trip.updated_at).toLocaleDateString() : 'Unknown'}
          </span>
        </div>

        {/* Status Options */}
        <h5 className="font-medium text-gray-900 mb-3">Change Status</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tripStatuses.map((status) => (
            <div key={status.value} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.value)}`}>
                    {status.label}
                  </span>
                  {trip.status === status.value && (
                    <span className="text-green-600 text-sm">Current</span>
                  )}
                </div>
                {trip.status !== status.value && (
                  <button
                    onClick={() => handleStatusUpdate(status.value)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Set Status
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600">{status.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status Impact */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">⚠️ Status Impact</h4>
        <div className="text-yellow-700 text-sm space-y-1">
          <p><strong>Planning:</strong> Trip appears in search results, members can join and modify itinerary</p>
          <p><strong>Active:</strong> Trip is highlighted as ongoing, modifications may be restricted</p>
          <p><strong>Completed:</strong> Trip appears in past trips, read-only mode for most actions</p>
          <p><strong>Cancelled:</strong> Trip is hidden from search results, members are notified</p>
        </div>
      </div>
    </div>
  );
}
