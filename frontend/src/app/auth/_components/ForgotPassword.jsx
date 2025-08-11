"use client";
import { useState } from 'react';

export default function ForgotPassword({ onBack, onRequireReset }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        // Don't auto-redirect to reset form since user needs to check email first
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
          <p className="text-gray-600">
            We've sent password reset instructions to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Click the link in the email to reset your password. The link will be valid for 1 hour.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-500"
        >
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-gray-600">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your email"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending...' : 'Send Reset Instructions'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-500"
        >
          ← Back to login
        </button>
      </div>
    </form>
  );
}
