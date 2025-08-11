"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the token and email from URL parameters (your custom email format)
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('Auth callback params:', {
          token: token ? 'present' : 'missing',
          email: email ? 'present' : 'missing',
          error,
          errorDescription,
          currentURL: window.location.href
        });

        // Store debug info for display
        setDebugInfo({
          url: window.location.href,
          hasToken: !!token,
          hasEmail: !!email,
          hasError: !!error,
          token: token || null, // Show full token for debugging
          email: email || null,
          tokenLength: token ? token.length : 0
        });

        // Handle error in URL
        if (error) {
          console.error('URL contains error parameter:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Email verification failed');
          return;
        }

        // Handle token verification (from your custom email template)
        if (token && email) {
          console.log('Verifying token with email:', { token, email });
          
          try {
            // Use the proper OTP verification method with both token and email
            console.log('Attempting OTP verification with token and email...');
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'email',
              email: email
            });

            if (verifyError) {
              console.error('OTP verification failed:', verifyError);
              
              // Try alternative verification method - using token as confirmation token
              console.log('Trying alternative verification method...');
              const { data: altData, error: altError } = await supabase.auth.verifyOtp({
                token: token,
                type: 'email',
                email: email
              });

              if (altError) {
                console.error('Alternative verification also failed:', altError);
                throw altError;
              }

              if (altData?.user) {
                console.log('Alternative verification successful:', altData.user.email);
                setStatus('success');
                setMessage('Email verified successfully! Redirecting to your dashboard...');
                
                setTimeout(() => {
                  router.push('/dashboard');
                }, 2000);
                return;
              }
            }

            if (data?.user) {
              console.log('Token verification successful:', data.user.email);
              setStatus('success');
              setMessage('Email verified successfully! Redirecting to your dashboard...');
              
              setTimeout(() => {
                router.push('/dashboard');
              }, 2000);
              return;
            }

            // If we get here, verification didn't fail but also didn't return a user
            console.error('Verification completed but no user data received');
            setStatus('error');
            setMessage('Verification completed but failed to get user data. Please try logging in manually.');
            return;
            
          } catch (error) {
            console.error('Token verification error:', error);
            setStatus('error');
            setMessage(`Email verification failed: ${error.message}

Possible causes:
• The verification token has expired (tokens are valid for 24 hours)
• The token has already been used
• There's a mismatch in the token format or email address

Token received: ${token}
Email: ${email}

Please try requesting a new verification email.`);
            return;
          }
        }

        // Handle case where we have token but no email (fallback to old method)
        if (token && !email) {
          console.log('Token found but no email parameter - trying fallback methods...');
          setStatus('error');
          setMessage(`Email verification requires both token and email parameters.

The verification link appears to be incomplete. This usually means:
• The email template is missing the email parameter
• The link has been modified

Please request a new verification email.`);
          return;
        }

        // No token found
        console.error('No token parameter found in URL');
        setStatus('error');
        setMessage(`Email verification failed - no token found.

This usually means:
• The verification link is incomplete
• The email template configuration has an issue
• The link has been modified

Current URL parameters:
${Array.from(searchParams.entries()).map(([key, value]) => `• ${key}: ${value}`).join('\n') || '• No parameters found'}

Please request a new verification email.`);
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Something went wrong during verification. Please try again.');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center pt-20 pb-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">{message}</p>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified Successfully!</h2>
              <p className="text-gray-600 mb-6">Welcome to GlobeTrotter! You're being redirected to your dashboard...</p>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Redirecting...</span>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Verification Failed</h2>
              <div className="text-gray-600 mb-6 text-left bg-gray-50 p-4 rounded-lg">
                <div className="whitespace-pre-line text-sm">{message}</div>
              </div>
              
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Debug Information:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>URL: <code className="bg-white px-1 rounded text-xs break-all">{debugInfo.url}</code></div>
                    <div>Has Token: <span className={debugInfo.hasToken ? 'text-green-600' : 'text-red-600'}>{debugInfo.hasToken ? 'Yes' : 'No'}</span></div>
                    <div>Has Email: <span className={debugInfo.hasEmail ? 'text-green-600' : 'text-red-600'}>{debugInfo.hasEmail ? 'Yes' : 'No'}</span></div>
                    {debugInfo.token && <div>Token Preview: <code className="bg-white px-1 rounded break-all">{debugInfo.token}</code></div>}
                    {debugInfo.email && <div>Email: <code className="bg-white px-1 rounded">{debugInfo.email}</code></div>}
                    <div>Has Error: <span className={debugInfo.hasError ? 'text-red-600' : 'text-green-600'}>{debugInfo.hasError ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/auth')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Try Again
                </button>
                <p className="text-xs text-gray-500">
                  Need help? Contact support at{' '}
                  <a href="mailto:support@globetrotter.com" className="text-blue-600 hover:text-blue-500">
                    support@globetrotter.com
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function AuthCallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center pt-20 pb-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing email verification...</p>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
