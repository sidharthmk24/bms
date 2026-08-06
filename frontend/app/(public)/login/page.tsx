"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Loader2, Book, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<'EMAIL' | 'PASSWORD' | 'SETUP'>('EMAIL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-email', { email });
      if (response.data?.status === 'PENDING_SETUP') {
        setStep('SETUP');
      } else {
        setStep('PASSWORD');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account not found. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.success && response.data?.accessToken) {
        await login(response.data.accessToken);
      } else {
        setError('Invalid credentials');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/setup-password', { email, password });
      if (response.success && response.data?.accessToken) {
        await login(response.data.accessToken);
      } else {
        setError('Setup failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Book className="h-7 w-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {step === 'EMAIL' && 'Sign in to your account'}
          {step === 'PASSWORD' && 'Enter your password'}
          {step === 'SETUP' && 'Create your password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'EMAIL' && 'Welcome back to the Bookstore Management System'}
          {step === 'PASSWORD' && 'Welcome back! Please enter your password to continue.'}
          {step === 'SETUP' && 'Welcome! Please set up a secure password for your new account.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={step === 'EMAIL' ? handleVerifyEmail : step === 'PASSWORD' ? handleLogin : handleSetup}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start"
              >
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={step !== 'EMAIL'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {step !== 'EMAIL' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 mt-6">
                  {step === 'SETUP' ? 'New Password' : 'Password'}
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={step === 'SETUP' ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {step === 'PASSWORD' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                <div className="text-sm leading-6">
                  <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </a>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : step === 'EMAIL' ? (
                  'Continue'
                ) : step === 'SETUP' ? (
                  'Set Password & Sign in'
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
            
            {step !== 'EMAIL' && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setStep('EMAIL'); setPassword(''); setError(''); }}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  &larr; Use a different email
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
