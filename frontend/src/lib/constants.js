// Application constants for TripMate

// App configuration
// Application constants for GlobeTrotter

// Application Name
export const APP_NAME = 'GlobeTrotter';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Plan, collaborate, and create unforgettable travel experiences with friends and family.';

// API endpoints (for Supabase backend integration)
export const API_ENDPOINTS = {
  AUTH: {
    SIGN_IN: '/api/auth/signin',
    SIGN_UP: '/api/auth/signup',
    SIGN_OUT: '/api/auth/signout',
    VERIFY_OTP: '/api/auth/verify-otp',
    RESET_PASSWORD: '/api/auth/reset-password',
    UPDATE_PASSWORD: '/api/auth/update-password'
  },
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE_PROFILE: '/api/users/profile',
    GET_TRIPS: '/api/users/trips',
    STATS: '/api/users/stats'
  },
  TRIPS: {
    CREATE: '/api/trips',
    GET_ALL: '/api/trips',
    GET_BY_ID: '/api/trips/:id',
    UPDATE: '/api/trips/:id',
    DELETE: '/api/trips/:id',
    JOIN_REQUEST: '/api/trips/:id/join',
    LEAVE: '/api/trips/:id/leave',
    MEMBERS: '/api/trips/:id/members',
    SETTINGS: '/api/trips/:id/settings'
  },
  INVITES: {
    CREATE: '/api/invites',
    GET_BY_CODE: '/api/invites/:code',
    ACCEPT: '/api/invites/:code/accept',
    VALIDATE: '/api/invites/:code/validate'
  },
  ITINERARY: {
    GET: '/api/trips/:tripId/itinerary',
    CREATE_ITEM: '/api/trips/:tripId/itinerary',
    UPDATE_ITEM: '/api/trips/:tripId/itinerary/:itemId',
    DELETE_ITEM: '/api/trips/:tripId/itinerary/:itemId',
    REORDER: '/api/trips/:tripId/itinerary/reorder'
  },
  MESSAGES: {
    GET: '/api/trips/:tripId/messages',
    SEND: '/api/trips/:tripId/messages',
    UPDATE: '/api/trips/:tripId/messages/:messageId',
    DELETE: '/api/trips/:tripId/messages/:messageId'
  },
  AI: {
    CHAT: '/api/ai/chat',
    SUGGESTIONS: '/api/ai/suggestions'
  },
  NOTIFICATIONS: {
    GET: '/api/notifications',
    MARK_READ: '/api/notifications/:id/read',
    MARK_ALL_READ: '/api/notifications/read-all'
  },
  UPLOAD: {
    AVATAR: '/api/upload/avatar',
    TRIP_COVER: '/api/upload/trip-cover',
    MESSAGE_FILE: '/api/upload/message-file'
  }
};

// User roles and permissions
export const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TRAVELLER: 'Traveller'
};

export const PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'edit_trip',
    'delete_trip',
    'manage_members',
    'approve_requests',
    'edit_itinerary',
    'manage_settings',
    'create_invites'
  ],
  [USER_ROLES.MANAGER]: [
    'edit_itinerary',
    'approve_requests',
    'moderate_chat',
    'create_invites'
  ],
  [USER_ROLES.TRAVELLER]: [
    'view_trip',
    'participate_chat',
    'use_ai_assistant',
    'suggest_edits'
  ]
};

// Trip statuses
export const TRIP_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Trip visibility
export const TRIP_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  LINK: 'link'
};

// Join request statuses
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  LOCATION: 'location'
};

// Notification types
export const NOTIFICATION_TYPES = {
  JOIN_REQUEST: 'join_request',
  JOIN_APPROVED: 'join_approved',
  JOIN_REJECTED: 'join_rejected',
  ROLE_CHANGED: 'role_changed',
  TRIP_UPDATED: 'trip_updated',
  ITINERARY_CHANGED: 'itinerary_changed',
  TRIP_REMINDER: 'trip_reminder'
};

// File upload configurations
export const UPLOAD_CONFIG = {
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    bucket: 'avatars'
  },
  TRIP_COVER: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    bucket: 'trip-covers'
  },
  MESSAGE_FILE: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    bucket: 'message-files'
  }
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  TRIPS_PER_PAGE: 12,
  MESSAGES_PER_PAGE: 50
};

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT: 'Rate limit exceeded',
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type'
};

// Success messages
export const SUCCESS_MESSAGES = {
  TRIP_CREATED: 'Trip created successfully',
  TRIP_UPDATED: 'Trip updated successfully',
  TRIP_DELETED: 'Trip deleted successfully',
  JOIN_REQUEST_SENT: 'Join request sent successfully',
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  MESSAGE_SENT: 'Message sent successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  NOTIFICATION_READ: 'Notification marked as read'
};
