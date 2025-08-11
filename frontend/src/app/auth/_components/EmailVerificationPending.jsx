"use client";
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function EmailVerificationPending({ email, onBack }) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      setResendMessage('');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        }
      });

      if (error) {
        setResendMessage('Failed to resend email. Please try again.');
      } else {
        setResendMessage('Verification email sent successfully!');
      }
    } catch (err) {
      setResendMessage('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
        <p className="text-gray-600 mb-4">
          We've sent a verification link to{' '}
          <span className="font-medium text-gray-900">{email}</span>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Click the link in the email to verify your account and complete your registration.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="text-blue-800 font-medium mb-1">Didn't receive the email?</p>
            <ul className="text-blue-700 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure {email} is correct</li>
              <li>• The link will expire in 24 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {resendMessage && (
        <div className={`text-center p-3 rounded-lg ${
          resendMessage.includes('successfully') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {resendMessage}
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleResendEmail}
          disabled={isResending}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? 'Sending...' : 'Resend verification email'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-gray-600 hover:text-gray-500 py-2 text-center"
        >
          ← Back to login
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600 text-center">
          <strong>Note:</strong> After clicking the verification link, you'll be redirected to the login page. 
          Use your email and password to sign in.
        </p>
      </div>
    </div>
  );
}
