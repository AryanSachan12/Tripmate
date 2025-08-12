"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import SearchBar from "./searchbar";
import NotificationDropdown from "./NotificationDropdown";
import { useState } from "react";
import { useUser } from "../../contexts/UserContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useUser();
  const pathname = usePathname();

  // Don't render navbar on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="GlobeTrotter Logo" width={40} height={40} className="sm:w-8 sm:h-8 rounded-lg" />
            <Link href="/" className="text-lg sm:text-xl font-bold text-gray-900">
              GlobeTrotter
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <Link href="/explore" className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm xl:text-base">
              Explore
            </Link>
            <Link href="/community" className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm xl:text-base">
              Community
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm xl:text-base">
              Dashboard
            </Link>
            <Link href="/trip?mode=create" className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm xl:text-base">
              Create Trip
            </Link>
          </div>

          {/* Search Bar - Hide on small screens */}
          <div className="hidden lg:block flex-1 max-w-md mx-4 xl:mx-8">
            <SearchBar />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications - Show only when authenticated */}
            {isAuthenticated && <NotificationDropdown />}

            {/* Profile */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  <Image 
                    src={user?.profile?.avatar_url || user?.user_metadata?.avatar_url || "/profile-icon.png"} 
                    alt={user?.profile?.name || user?.user_metadata?.name || "Profile"} 
                    width={28} 
                    height={28} 
                    className="sm:w-8 sm:h-8 rounded-full hover:ring-2 hover:ring-blue-200 transition-all"
                    onError={(e) => {
                      console.log('Avatar failed to load:', e.target.src);
                      e.target.src = "/profile-icon.png";
                    }}
                  />
                </button>
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Profile Settings
                    </Link>
                    <Link 
                      href="/dashboard" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      My Dashboard  
                    </Link>
                    <hr className="my-1" />
                    <button 
                      onClick={() => {
                        logout();
                        window.location.href = '/';
                      }}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link 
                href="/auth" 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4">
            <div className="space-y-1">
              <Link 
                href="/explore" 
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Explore Trips
              </Link>
              <Link 
                href="/community" 
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Community
              </Link>
              <Link 
                href="/dashboard" 
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/trip?mode=create" 
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Create Trip
              </Link>
              {/* Mobile Notifications */}
              {isAuthenticated && (
                <Link 
                  href="/notifications" 
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Notifications
                </Link>
              )}
              {/* Mobile Search */}
              <div className="px-4 py-2">
                <SearchBar />
              </div>
              {/* Mobile Profile Actions */}
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/profile" 
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                      window.location.href = '/';
                    }}
                    className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link 
                  href="/auth" 
                  className="block px-4 py-3 text-center bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium mx-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}