# TripMate - Social Group Travel Planner

A collaborative trip planning and discovery platform where verified users can create, join, and manage travel groups, interact with AI for location suggestions, and plan experiences in real time.

![TripMate](./public/logo.png)

## 🌟 Features

### Core Features
- **User Authentication & Verification**: Secure email-based registration and Google OAuth
- **Trip Discovery**: Browse and filter public trips by location, dates, budget, and interests
- **Trip Creation**: Multi-step wizard for creating customized trips with role-based permissions
- **Interactive Itinerary**: Drag-and-drop itinerary builder with day-by-day planning
- **Real-time Group Chat**: Stay connected with your travel group
- **AI Travel Assistant**: Get smart location-aware suggestions powered by Gemini API
- **Invite System**: Share trips via secure invite links with optional passwords
- **Role Management**: Admin, Manager, and Traveller roles with different permissions

### User Interface
- **Modern Design**: Clean, responsive interface built with Tailwind CSS
- **Mobile-First**: Optimized for both desktop and mobile devices
- **Intuitive Navigation**: Easy-to-use navigation with clear user flows
- **Accessibility**: Designed with accessibility best practices in mind

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router with API routes)
- **Styling**: Tailwind CSS 4
- **Authentication**: Supabase Auth (Email OTP, Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **AI**: Gemini API for travel assistance
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or later
- npm or yarn package manager
- Supabase account (for backend services)
- Google Cloud account (for OAuth and Gemini API)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TripMate/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   
   # App URLs
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Pages & Features

### Public Pages
- **Landing Page** (`/`) - Hero section with feature highlights
- **Explore Trips** (`/explore`) - Browse and filter available trips
- **Authentication** (`/auth`) - Login, register, OTP verification, password reset

### Protected Pages
- **Dashboard** (`/dashboard`) - User overview with trip management
- **Trip Workspace** (`/trip`) - Main trip interface with tabs for:
  - Overview: Trip details and member list
  - Itinerary: Day-by-day activity planning
  - Chat: Real-time group messaging
  - AI Assistant: Smart travel recommendations
- **Profile** (`/profile`) - User profile management
- **Invite Join** (`/invite/[inviteId]`) - Join trips via invite links

### Additional Pages
- **Terms of Service** (`/terms`)
- **Privacy Policy** (`/privacy`)
- **404 Not Found** (`/not-found`)

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3B82F6)
- **Secondary**: Indigo (#6366F1)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Gray Scale**: Various shades for text and backgrounds

### Typography
- **Font Family**: Geist Sans (primary), Geist Mono (code)
- **Headings**: Bold weights with appropriate sizing
- **Body Text**: Regular weight with good readability

### Components
- **Buttons**: Rounded corners with hover effects
- **Cards**: Subtle shadows with rounded corners
- **Forms**: Clean inputs with focus states
- **Navigation**: Fixed header with responsive design

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   ├── _components/   # Auth-specific components
│   │   └── page.jsx       # Main auth page
│   ├── dashboard/         # User dashboard
│   ├── explore/          # Trip discovery
│   ├── invite/           # Invite system
│   ├── profile/          # User profile
│   ├── trip/             # Trip workspace
│   │   ├── _components/  # Trip-specific components
│   │   └── page.jsx      # Main trip page
│   ├── _components/      # Shared components
│   ├── globals.css       # Global styles
│   ├── layout.jsx        # Root layout
│   └── page.jsx          # Landing page
├── lib/                  # Utility functions
│   ├── constants.js      # App constants
│   └── utils.js          # Helper functions
└── public/               # Static assets
```

## 🔧 Key Components

### Authentication Flow
- **LoginForm**: Email/password login with Google OAuth
- **RegisterForm**: Account creation with email verification
- **VerifyOTP**: Email verification with resend functionality
- **ForgotPassword**: Password reset flow
- **ResetPassword**: New password creation

### Trip Management
- **TripCreateWizard**: Multi-step trip creation process
- **TripView**: Main trip dashboard with tabbed interface
- **Itinerary**: Interactive day-by-day planning
- **TripChat**: Real-time messaging system
- **TripAIHelper**: AI-powered travel assistant
- **TripSettings**: Admin controls and member management

### User Interface
- **Navbar**: Responsive navigation with search
- **SearchBar**: Trip discovery search functionality
- **Footer**: Links and company information

## 🔒 Security Features

- **Email Verification**: Required for new accounts
- **OTP Authentication**: Secure login process
- **Role-based Access**: Different permissions for trip roles
- **Secure Invites**: Protected invite links with optional passwords
- **Input Validation**: Client and server-side validation
- **Error Handling**: Graceful error management

## 🌐 User Roles & Permissions

### Admin (Trip Creator)
- Full control over trip settings
- Add/remove members and manage roles
- Edit trip details and itinerary
- Delete trip

### Manager (Co-organizer)
- Edit itinerary and approve join requests
- Moderate chat and invite members
- Cannot delete trip or change admin

### Traveller (Participant)
- View trip details and itinerary
- Participate in group chat
- Use AI assistant for suggestions
- Request itinerary changes

## 🤖 AI Integration

The AI Assistant powered by Google's Gemini API provides:
- **Location Recommendations**: Personalized suggestions based on trip location
- **Activity Planning**: Ideas for activities and attractions
- **Weather Insights**: Weather-based recommendations
- **Local Information**: Cultural tips and local customs
- **Emergency Information**: Safety and emergency contacts

## 📦 Build & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Deployment
The app is optimized for deployment on Vercel:
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Environment Variables for Production
Ensure all environment variables are configured in your deployment platform.

## 🧪 Testing (Future Implementation)
- Unit tests with Jest
- Integration tests with React Testing Library
- E2E tests with Playwright
- API testing with Postman/Newman

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@tripmate.com or create an issue in the repository.

## 🗺️ Roadmap

### Phase 1 (MVP) ✅
- Basic trip creation and discovery
- User authentication
- Group chat
- AI assistant

### Phase 2 (Planned)
- Expense splitting
- Live location sharing
- Video calls
- Mobile app (React Native)

### Phase 3 (Future)
- Payment integration
- Booking partnerships
- Advanced analytics
- Enterprise features

---

**Built with ❤️ for travelers by travelers**
