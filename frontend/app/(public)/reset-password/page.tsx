"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  BookOpen, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.message || 'Failed to reset password. The link may have expired.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired password reset link. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  // Case 1: No token provided in URL
  if (!token) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-50">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Missing Reset Token</h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
            This password reset link is invalid or incomplete. Please request a new password reset link from the sign-in page.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Case 2: Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6 space-y-4"
      >
        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Password Reset Complete!</h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
            Your password has been successfully updated. You can now sign in using your new credentials.
          </p>
        </div>
        <div className="pt-3">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
          >
            Proceed to Sign In
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </div>
      </motion.div>
    );
  }

  // Case 3: Reset password form
  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-50/90 border border-red-200 rounded-xl p-3.5 flex items-start text-red-700 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2.5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
          New Password
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <input
            id="new-password"
            name="new-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-xl border border-gray-300 pl-10 pr-11 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
          Confirm New Password
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <input
            id="confirm-password"
            name="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-xl border border-gray-300 pl-10 pr-11 py-2.5 text-gray-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center text-xs text-gray-500">
          <div className={`h-1.5 w-1.5 rounded-full mr-2 ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span>Minimum 6 characters</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <div className={`h-1.5 w-1.5 rounded-full mr-2 ${password && password === confirmPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span>Passwords match</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || password.length < 6 || password !== confirmPassword}
        className="w-full flex justify-center items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Set New Password'}
      </button>

      <div className="text-center pt-1">
        <Link
          href="/login"
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 ring-4 ring-white">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
        </div>

        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Create New Password
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
          Please enter your new password below to secure your BMS account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Bookstore Management System &bull; Secure Enterprise Portal
        </p>
      </div>
    </div>
  );
}
