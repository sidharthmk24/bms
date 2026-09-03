"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  BookOpen, 
  Mail, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email: cleanEmail });
      setIsSuccess(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-4 ring-white">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
        </div>

        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Reset your password
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
          Enter your registered email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 bg-red-50/90 border border-red-200 rounded-xl p-3.5 flex items-start text-red-700 shadow-sm"
              >
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2.5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Check your inbox</h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  We have sent a password reset link to <strong className="text-gray-900">{email}</strong>. The link expires in 1 hour.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSubmit}
                  className="w-full py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend reset link'}
                </button>
                <Link
                  href="/login"
                  className="block w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="forgot-email"
                    name="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex justify-center items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Bookstore Management System &bull; Secure Enterprise Portal
        </p>
      </div>
    </div>
  );
}
