"use client";
import { useState } from 'react';

export default function InviteLinkModal({ trip, onClose }) {
  const [inviteSettings, setInviteSettings] = useState({
    hasPassword: false,
    password: '',
    hasExpiry: false,
    expiryDate: '',
    maxUses: ''
  });
  const [inviteLink, setInviteLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInviteLink = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual invite link generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const linkId = Math.random().toString(36).substring(2, 15);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      setInviteLink(`${baseUrl}/invite/${linkId}`);
    } catch (error) {
      console.error('Error generating invite link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join me on ${trip.title}`);
    const body = encodeURIComponent(
      `Hi!\n\nI'd like to invite you to join my trip "${trip.title}" to ${trip.location}.\n\nTrip Details:\n- Dates: ${trip.startDate} to ${trip.endDate}\n- Budget: ${trip.budget}\n- Current Members: ${trip.currentMembers}/${trip.maxMembers}\n\nClick here to join: ${inviteLink}\n\nLooking forward to traveling with you!\n\nBest regards`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on ${trip.title}!\n\n📍 ${trip.location}\n📅 ${trip.startDate} to ${trip.endDate}\n💰 ${trip.budget}\n👥 ${trip.currentMembers}/${trip.maxMembers} members\n\nJoin here: ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInviteSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Invite Members</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invite Link Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Invite Link Settings</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="hasPassword"
                  checked={inviteSettings.hasPassword}
                  onChange={handleSettingChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Require password to join</span>
              </label>
              
              {inviteSettings.hasPassword && (
                <input
                  type="text"
                  name="password"
                  placeholder="Enter password"
                  value={inviteSettings.password}
                  onChange={handleSettingChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="hasExpiry"
                  checked={inviteSettings.hasExpiry}
                  onChange={handleSettingChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Set expiry date</span>
              </label>
              
              {inviteSettings.hasExpiry && (
                <input
                  type="datetime-local"
                  name="expiryDate"
                  value={inviteSettings.expiryDate}
                  onChange={handleSettingChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">Maximum uses (optional)</label>
                <input
                  type="number"
                  name="maxUses"
                  placeholder="Unlimited"
                  value={inviteSettings.maxUses}
                  onChange={handleSettingChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Generate Link */}
          <div>
            <button
              onClick={generateInviteLink}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Link...
                </>
              ) : (
                'Generate Invite Link'
              )}
            </button>
          </div>

          {/* Generated Link */}
          {inviteLink && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Invite Link</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      copied 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Share via</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={shareViaEmail}
                    className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex items-center justify-center px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.886 3.488"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Link Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Link Details:</p>
                    <ul className="mt-1 space-y-1">
                      {inviteSettings.hasPassword && <li>• Password protected</li>}
                      {inviteSettings.hasExpiry && <li>• Expires on {new Date(inviteSettings.expiryDate).toLocaleDateString()}</li>}
                      {inviteSettings.maxUses && <li>• Limited to {inviteSettings.maxUses} uses</li>}
                      {!inviteSettings.hasPassword && !inviteSettings.hasExpiry && !inviteSettings.maxUses && <li>• No restrictions</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
