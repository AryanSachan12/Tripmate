"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';

export default function LoginForm({ onSwitchToRegister, onSwitchToForgotPassword, onRequireOTP }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Use Supabase client directly for authentication to establish session
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (error) {
        setError(error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message
        );
      } else if (data.session) {
        // Session established - UserContext will handle the state update
        console.log('Login successful, session established');
        
        // Update last login in database (optional, don't block on this)
        try {
          await authApi.updateLastLogin();
        } catch (err) {
          console.warn('Failed to update last login:', err);
        }
        
        // Small delay to allow UserContext to update, then redirect
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        }
      });
      
      if (error) {
        setError('Google login failed. Please try again.');
      }
    } catch (err) {
      setError('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          placeholder="Enter your password"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            Remember me
          </label>
        </div>

        <button
          type="button"
          onClick={onSwitchToForgotPassword}
          className="text-sm text-blue-600 hover:text-blue-500 text-left sm:text-right"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center text-sm sm:text-base"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div className="text-center">
        <span className="text-gray-600 text-sm sm:text-base">Don't have an account? </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:text-blue-500 font-medium text-sm sm:text-base"
        >
          Sign up here
        </button>
      </div>
    </form>
  );
}
