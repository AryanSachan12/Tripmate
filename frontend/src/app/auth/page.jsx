"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './_components/LoginForm';
import RegisterForm from './_components/RegisterForm';
import EmailVerificationPending from './_components/EmailVerificationPending';
import ForgotPassword from './_components/ForgotPassword';
import ResetPassword from './_components/ResetPassword';

function AuthPageContent() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'emailVerification', 'forgotPassword', 'resetPassword'
  const [userEmail, setUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'password-reset-success') {
      setSuccessMessage('Your password has been reset successfully. Please log in with your new password.');
    }
  }, [searchParams]);

  const renderAuthComponent = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginForm 
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgotPassword')}
          />
        );
      case 'register':
        return (
          <RegisterForm 
            onSwitchToLogin={() => setCurrentView('login')}
            onEmailSent={(email) => {
              setUserEmail(email);
              setCurrentView('emailVerification');
            }}
          />
        );
      case 'emailVerification':
        return (
          <EmailVerificationPending 
            email={userEmail}
            onBack={() => setCurrentView('login')}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPassword 
            onBack={() => setCurrentView('login')}
            onRequireReset={(email) => {
              setUserEmail(email);
              setCurrentView('resetPassword');
            }}
          />
        );
      case 'resetPassword':
        return (
          <ResetPassword 
            email={userEmail}
            onSuccess={() => setCurrentView('login')}
            onBack={() => setCurrentView('forgotPassword')}
          />
        );
      default:
        return <LoginForm onSwitchToRegister={() => setCurrentView('register')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {currentView === 'login' && 'Welcome Back'}
            {currentView === 'register' && 'Join TripMate'}
            {currentView === 'emailVerification' && 'Check Your Email'}
            {currentView === 'forgotPassword' && 'Reset Password'}
            {currentView === 'resetPassword' && 'Create New Password'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {currentView === 'login' && 'Sign in to your account to continue'}
            {currentView === 'register' && 'Create your account and start planning trips'}
            {currentView === 'emailVerification' && 'We sent you a verification link'}
            {currentView === 'forgotPassword' && 'Enter your email to receive reset instructions'}
            {currentView === 'resetPassword' && 'Enter your new password'}
          </p>
        </div>
        
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8">
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}
          {renderAuthComponent()}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}