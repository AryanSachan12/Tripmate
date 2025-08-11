import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Illustration */}
        <div className="mb-8">
          <div className="mx-auto w-64 h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-bold text-blue-600 mb-4">404</div>
              <div className="w-32 h-1 bg-blue-600 mx-auto rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! You've Wandered Off the Path
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            The page you're looking for seems to have gone on an unexpected adventure. 
            Don't worry, we'll help you find your way back to planning amazing trips!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          
          <Link
            href="/explore"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explore Trips
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Maybe you were looking for:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard"
              className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900">Dashboard</p>
                <p className="text-sm text-gray-500">View your trips</p>
              </div>
            </Link>

            <Link
              href="/trip?mode=create"
              className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900">Create Trip</p>
                <p className="text-sm text-gray-500">Plan a new adventure</p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900">Profile</p>
                <p className="text-sm text-gray-500">Manage account</p>
              </div>
            </Link>

            <Link
              href="/auth"
              className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900">Sign In</p>
                <p className="text-sm text-gray-500">Access your account</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Still need help? <Link href="/contact" className="text-blue-600 hover:text-blue-800 font-medium">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
