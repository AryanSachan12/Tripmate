"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function VerifyOTP({ email, onSuccess, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      setError('');

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpString,
        type: 'signup'
      });

      if (error) {
        setError('Invalid verification code. Please try again.');
      } else if (data.user) {
        // Verification successful
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        setError('Failed to resend code. Please try again.');
      } else {
        setTimeLeft(60);
        setCanResend(false);
        setError('');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-center">
        <p className="text-gray-600 mb-6">
          We've sent a 6-digit verification code to{' '}
          <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex justify-center space-x-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="text-center space-y-4">
        <div>
          {canResend ? (
            <button
              onClick={handleResendOTP}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Resend verification code
            </button>
          ) : (
            <p className="text-gray-500">
              Resend code in {timeLeft} seconds
            </p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-500"
          >
            ← Back to login
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Demo:</strong> Use code <code className="bg-blue-100 px-1 rounded">123456</code> to proceed
        </p>
      </div>
    </div>
  );
}
