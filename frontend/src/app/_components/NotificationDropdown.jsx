"use client";
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    
    console.log('Fetching notifications for user:', user.id);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('No session token available');
        return;
      }

      // Get recent notifications (last 10) to show 3 in dropdown and count unread
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        const notificationData = data || [];
        console.log('Fetched notifications:', notificationData);
        setNotifications(notificationData.slice(0, 3)); // Show only 3 in dropdown
        setUnreadCount(notificationData.filter(n => !n.is_read).length);
        console.log('Unread count:', notificationData.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
      } else {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <Image 
          src="/notification-icon.png" 
          alt="Notifications" 
          width={18} 
          height={18} 
          className="sm:w-5 sm:h-5" 
        />
        
        {/* Notification Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM7 7v10l5-5H7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex-shrink-0">
                      {notification.type === 'join_request' ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                          </svg>
                        </div>
                      ) : (notification.type === 'join_approved' || notification.type === 'join_rejected') ? (
                        <div className={`w-8 h-8 ${notification.type === 'join_approved' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                          <svg className={`w-4 h-4 ${notification.type === 'join_approved' ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                            {notification.type === 'join_approved' ? (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            )}
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notifications.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
