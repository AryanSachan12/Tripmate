-- TripMate Database Schema for Supabase
-- Complete schema supporting all frontend functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  location TEXT,
  bio TEXT,
  
  -- Profile stats
  trips_completed INTEGER DEFAULT 0,
  trips_hosted INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  
  -- Travel preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "budgetRange": "₹10,000 - ₹50,000",
    "travelStyle": "Adventure & Culture",
    "accommodation": "hotels",
    "transportation": "flights",
    "languages": ["English"]
  }'::jsonb,
  
  -- Social links
  social_links JSONB DEFAULT '{}'::jsonb,
  
  -- Account status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 2. TRIPS TABLE
-- =============================================
CREATE TABLE public.trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget TEXT, -- e.g., "₹15,000", "₹10,000-₹20,000"
  max_members INTEGER NOT NULL DEFAULT 8,
  current_members INTEGER DEFAULT 1,
  
  -- Visibility settings
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'link')),
  
  -- Trip metadata
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  
  -- Trip settings
  is_locked BOOLEAN DEFAULT false,
  lock_days_before INTEGER DEFAULT 3,
  auto_approve_requests BOOLEAN DEFAULT false, -- New field for auto-approving join requests
  
  -- Creator info
  created_by UUID REFERENCES public.users(id) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. TRIP MEMBERS TABLE (Junction table with roles)
-- =============================================
CREATE TABLE public.trip_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Traveller' CHECK (role IN ('Admin', 'Manager', 'Traveller')),
  
  -- Member status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user per trip
  UNIQUE(trip_id, user_id)
);

-- =============================================
-- 4. TRIP INVITES TABLE
-- =============================================
CREATE TABLE public.trip_invites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  
  -- Invite settings
  invite_code TEXT UNIQUE NOT NULL, -- Generated URL-safe code
  has_password BOOLEAN DEFAULT false,
  password_hash TEXT, -- Hashed password if protected
  has_expiry BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. JOIN REQUESTS TABLE
-- =============================================
CREATE TABLE public.join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES public.trip_invites(id) ON DELETE SET NULL, -- If joined via invite
  
  -- Request details
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Response details
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_message TEXT,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique request per user per trip
  UNIQUE(trip_id, user_id)
);

-- =============================================
-- 6. ITINERARY ITEMS TABLE
-- =============================================
CREATE TABLE public.itinerary_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  
  -- Activity details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  day INTEGER NOT NULL, -- Day number of the trip (1, 2, 3...)
  date DATE NOT NULL, -- Calculated date based on trip start + day
  time TIME, -- Specific time for the activity
  
  -- Order within the day
  order_index INTEGER DEFAULT 0,
  
  -- Additional info
  duration_minutes INTEGER, -- Estimated duration
  cost_estimate TEXT, -- e.g., "₹500 per person"
  booking_url TEXT, -- Link to book the activity
  notes TEXT,
  
  -- Meta
  created_by UUID REFERENCES public.users(id) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. TRIP CHAT MESSAGES TABLE
-- =============================================
CREATE TABLE public.trip_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'location')),
  
  -- File/media info (for non-text messages)
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_mime_type TEXT,
  
  -- Message metadata
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Reply/thread support
  reply_to UUID REFERENCES public.trip_messages(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. ITINERARY COMMENTS TABLE (for collaborative planning)
-- =============================================
CREATE TABLE public.itinerary_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  itinerary_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Comment content
  comment TEXT NOT NULL,
  
  -- Comment type/suggestion
  comment_type TEXT DEFAULT 'general' CHECK (comment_type IN ('general', 'suggestion', 'concern', 'approval')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. AI CHAT HISTORY TABLE (for Gemini conversations)
-- =============================================
CREATE TABLE public.ai_chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Conversation
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  -- Context for better AI responses
  context JSONB DEFAULT '{}'::jsonb, -- location, weather, group size, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  
  -- Notification details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('join_request', 'join_approved', 'join_rejected', 'role_changed', 'trip_updated', 'itinerary_changed', 'trip_reminder')),
  
  -- Additional data
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false, -- For email/push notifications
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 11. USER SESSIONS TABLE (for tracking active users)
-- =============================================
CREATE TABLE public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Session info
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- INDEXES for Performance
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Trips indexes
CREATE INDEX idx_trips_visibility ON public.trips(visibility);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_start_date ON public.trips(start_date);
CREATE INDEX idx_trips_location ON public.trips USING gin(to_tsvector('english', location));
CREATE INDEX idx_trips_tags ON public.trips USING gin(tags);
CREATE INDEX idx_trips_created_by ON public.trips(created_by);

-- Trip members indexes
CREATE INDEX idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX idx_trip_members_role ON public.trip_members(role);

-- Invites indexes
CREATE INDEX idx_trip_invites_invite_code ON public.trip_invites(invite_code);
CREATE INDEX idx_trip_invites_trip_id ON public.trip_invites(trip_id);
CREATE INDEX idx_trip_invites_expires_at ON public.trip_invites(expires_at);

-- Join requests indexes
CREATE INDEX idx_join_requests_trip_id ON public.join_requests(trip_id);
CREATE INDEX idx_join_requests_user_id ON public.join_requests(user_id);
CREATE INDEX idx_join_requests_status ON public.join_requests(status);

-- Itinerary indexes
CREATE INDEX idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX idx_itinerary_items_day ON public.itinerary_items(day);
CREATE INDEX idx_itinerary_items_date ON public.itinerary_items(date);

-- Messages indexes
CREATE INDEX idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_user_id ON public.trip_messages(user_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other users' public profiles" ON public.users
  FOR SELECT USING (true); -- Public profiles for trip members, etc.

-- Trips policies
CREATE POLICY "Anyone can view public trips" ON public.trips
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Trip members can view their trips" ON public.trips
  FOR SELECT USING (
    id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip admins can update trips" ON public.trips
  FOR UPDATE USING (
    id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND role = 'Admin' AND status = 'active'
    )
  );

-- Trip members policies
CREATE POLICY "Trip members can view trip membership" ON public.trip_members
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Trip admins can manage members" ON public.trip_members
  FOR ALL USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Manager') AND status = 'active'
    )
  );

-- Messages policies
CREATE POLICY "Trip members can view messages" ON public.trip_messages
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Trip members can send messages" ON public.trip_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Itinerary policies
CREATE POLICY "Trip members can view itinerary" ON public.itinerary_items
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Managers and admins can edit itinerary" ON public.itinerary_items
  FOR ALL USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members 
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Manager') AND status = 'active'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trip_members_updated_at BEFORE UPDATE ON public.trip_members FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trip_invites_updated_at BEFORE UPDATE ON public.trip_invites FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON public.join_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_itinerary_items_updated_at BEFORE UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to auto-add trip creator as admin member
CREATE OR REPLACE FUNCTION add_trip_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'Admin', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_trip_creator_as_admin_trigger
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE add_trip_creator_as_admin();

-- Function to update trip member count
CREATE OR REPLACE FUNCTION update_trip_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trips 
  SET current_members = (
    SELECT COUNT(*) FROM public.trip_members 
    WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id) AND status = 'active'
  )
  WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_members
  FOR EACH ROW EXECUTE PROCEDURE update_trip_member_count();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_trip_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, trip_id, title, message, type, data)
  VALUES (p_user_id, p_trip_id, p_title, p_message, p_type, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for development)
-- =============================================

-- Insert sample user (this would normally be handled by Supabase Auth)
-- INSERT INTO public.users (id, email, name, first_name, last_name, bio, location, avatar_url)
-- VALUES (
--   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
--   'ravi.gupta@example.com',
--   'Ravi Gupta',
--   'Ravi',
--   'Gupta',
--   'Passionate traveler and explorer.',
--   'Mumbai, India',
--   '/profile-icon.png'
-- );

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for trip details with member info
CREATE VIEW trip_details AS
SELECT 
  t.*,
  u.name as creator_name,
  u.avatar_url as creator_avatar,
  COUNT(tm.user_id) as member_count
FROM public.trips t
LEFT JOIN public.users u ON t.created_by = u.id
LEFT JOIN public.trip_members tm ON t.id = tm.trip_id AND tm.status = 'active'
GROUP BY t.id, u.name, u.avatar_url;

-- View for user's trips
CREATE VIEW user_trips AS
SELECT 
  tm.user_id,
  tm.role,
  tm.joined_at,
  t.*
FROM public.trip_members tm
JOIN public.trips t ON tm.trip_id = t.id
WHERE tm.status = 'active';

-- Grant permissions for views
GRANT SELECT ON trip_details TO authenticated;
GRANT SELECT ON user_trips TO authenticated;
