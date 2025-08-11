"use client";
import { useState } from 'react';
import LoginForm from './_components/LoginForm';
import RegisterForm from './_components/RegisterForm';
import EmailVerificationPending from './_components/EmailVerificationPending';
import ForgotPassword from './_components/ForgotPassword';
import ResetPassword from './_components/ResetPassword';

export default function AuthPage() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'emailVerification', 'forgotPassword', 'resetPassword'
  const [userEmail, setUserEmail] = useState('');

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
          {renderAuthComponent()}
        </div>
      </div>
    </div>
  );
}
