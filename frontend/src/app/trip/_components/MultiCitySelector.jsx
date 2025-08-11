"use client";
import { useState } from 'react';
import { Plus, X, GripVertical, MapPin, Calendar } from 'lucide-react';

export default function MultiCitySelector({ cities, setCities, errors = {} }) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const addCity = () => {
    const newCity = {
      id: Date.now(), // Temporary ID for new cities
      city_name: '',
      country: '',
      arrival_date: '',
      departure_date: '',
      notes: ''
    };
    setCities([...cities, newCity]);
  };

  const removeCity = (index) => {
    if (cities.length <= 1) {
      alert('A trip must have at least one city');
      return;
    }
    const newCities = cities.filter((_, i) => i !== index);
    setCities(newCities);
  };

  const updateCity = (index, field, value) => {
    const newCities = [...cities];
    newCities[index] = { ...newCities[index], [field]: value };
    setCities(newCities);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCities = [...cities];
    const draggedCity = newCities[draggedIndex];
    
    // Remove the dragged city and insert it at the new position
    newCities.splice(draggedIndex, 1);
    newCities.splice(index, 0, draggedCity);
    
    setCities(newCities);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cities & Destinations
          </label>
          <p className="text-xs text-gray-500">Add multiple cities to create a multi-destination trip</p>
        </div>
        <button
          type="button"
          onClick={addCity}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={16} />
          <span>Add City</span>
        </button>
      </div>

      {errors.cities && (
        <p className="text-sm text-red-600">{errors.cities}</p>
      )}

      <div className="space-y-3">
        {cities.map((city, index) => (
          <div
            key={city.id || index}
            className={`relative border border-gray-200 rounded-xl p-4 bg-white transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : 'hover:shadow-sm'
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* City Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical size={16} />
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="font-medium text-gray-900">
                    City {index + 1}
                    {index === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Primary</span>}
                  </span>
                </div>
              </div>
              
              {cities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCity(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* City Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City Name */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City Name *
                </label>
                <input
                  type="text"
                  value={city.city_name}
                  onChange={(e) => updateCity(index, 'city_name', e.target.value)}
                  placeholder="e.g., Paris, New York, Tokyo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Country */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={city.country}
                  onChange={(e) => updateCity(index, 'country', e.target.value)}
                  placeholder="e.g., France, USA, Japan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Arrival Date */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={city.arrival_date}
                    onChange={(e) => updateCity(index, 'arrival_date', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Departure Date */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departure Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={city.departure_date}
                    onChange={(e) => updateCity(index, 'departure_date', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={city.notes}
                  onChange={(e) => updateCity(index, 'notes', e.target.value)}
                  placeholder="Any specific notes about this city..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {cities.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin size={16} className="text-blue-600" />
            <span className="font-medium text-blue-900">Trip Route</span>
          </div>
          <p className="text-sm text-blue-700">
            {cities.map(city => city.city_name).filter(Boolean).join(' → ')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {cities.length} {cities.length === 1 ? 'destination' : 'destinations'}
          </p>
        </div>
      )}
    </div>
  );
}
