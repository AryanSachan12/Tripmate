// Utility functions for GlobeTrotter application

export const generateInviteLink = (inviteId) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return `${baseUrl}/invite/${inviteId}`;
};
// Date utilities
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTimeAgo = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

// URL utilities
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
};

// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

// Role and permission utilities
export const getRoleColor = (role) => {
  switch (role) {
    case 'Admin': return 'bg-purple-100 text-purple-800';
    case 'Manager': return 'bg-blue-100 text-blue-800';
    case 'Traveller': return 'bg-green-100 text-green-800';
    case 'Requested': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'planning': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'upcoming': return 'bg-green-100 text-green-800';
    case 'ongoing': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const canEditTrip = (userRole) => {
  return userRole === 'Admin' || userRole === 'Manager';
};

export const canManageMembers = (userRole) => {
  return userRole === 'Admin';
};

// Format utilities
export const formatCurrency = (amount, currency = '₹') => {
  return `${currency}${amount.toLocaleString()}`;
};

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

// Mock data generators (for development)
export const generateMockTrips = (count = 5) => {
  const locations = ['Himachal Pradesh', 'Goa', 'Kerala', 'Rajasthan', 'Kashmir'];
  const tags = ['Adventure', 'Beach', 'Mountains', 'Culture', 'Food', 'Nature'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Amazing ${locations[i % locations.length]} Trip`,
    description: `Explore the beautiful ${locations[i % locations.length]} with fellow travelers`,
    location: `${locations[i % locations.length]}, India`,
    startDate: new Date(Date.now() + (i * 7 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + (i * 7 + 37) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budget: `₹${(10000 + i * 2000).toLocaleString()}`,
    maxMembers: 6 + i,
    currentMembers: 2 + i,
    tags: tags.slice(0, 2 + (i % 3)),
    coverImage: '/logo.png',
    host: `Host ${i + 1}`,
    visibility: i % 3 === 0 ? 'public' : i % 3 === 1 ? 'private' : 'link'
  }));
};

export const generateMockUser = () => ({
  id: 'user123',
  name: 'Ravi Garg',
  email: 'ravi@example.com',
  avatar: '/profile-icon.png',
  bio: 'Passionate traveler and adventure seeker',
  joinedDate: '2025-01-01',
  verified: true
});

// Email verification utilities
export const parseEmailVerificationUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    return {
      token: params.get('token'),
      email: params.get('email'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
      allParams: Array.from(params.entries()),
      isValid: !!(params.get('token') && params.get('email'))
    };
  } catch (error) {
    return {
      error: 'Invalid URL format',
      isValid: false
    };
  }
};

export const generateEmailVerificationUrl = (baseUrl, token, email) => {
  const url = new URL('/auth/callback', baseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('email', email);
  return url.toString();
};

// Debug helper for email verification
export const debugEmailVerification = (url) => {
  const parsed = parseEmailVerificationUrl(url);
  console.log('Email Verification Debug:', {
    url,
    parsed,
    expectedFormat: 'URL should contain both "token" and "email" parameters',
    example: generateEmailVerificationUrl('https://yourapp.com', 'sample-token', 'user@example.com')
  });
  return parsed;
};

// API helpers (for future Supabase integration)
export const handleApiError = (error) => {
  console.error('API Error:', error);
  return {
    success: false,
    message: error.message || 'Something went wrong. Please try again.'
  };
};

export const handleApiSuccess = (data, message = 'Operation successful') => {
  return {
    success: true,
    data,
    message
  };
};
