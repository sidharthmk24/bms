"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  Loader2, 
  BookOpen, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<'EMAIL' | 'PASSWORD' | 'SETUP' | 'FORGOT_PASSWORD'>('EMAIL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer for forgot password resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-email', { email: cleanEmail });
      if (response.data?.name) {
        setUserName(response.data.name);
      }
      if (response.data?.status === 'PENDING_SETUP') {
        setStep('SETUP');
      } else {
        setStep('PASSWORD');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account not found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email: cleanEmail, password });
      if (response.success && response.data?.accessToken) {
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        await login(response.data.accessToken);
      } else {
        setError(response.message || 'Invalid credentials. Please check your password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

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
      const response = await api.post('/auth/setup-password', { email: cleanEmail, password });
      if (response.success && response.data?.accessToken) {
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        await login(response.data.accessToken);
      } else {
        setError('Failed to setup password. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
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
      setForgotSuccess(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetToEmailStep = () => {
    setStep('EMAIL');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setForgotSuccess(false);
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
          {step === 'EMAIL' && 'Sign in to BMS'}
          {step === 'PASSWORD' && 'Enter your password'}
          {step === 'SETUP' && 'Create your password'}
          {step === 'FORGOT_PASSWORD' && 'Reset your password'}
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
          {step === 'EMAIL' && 'Bookstore Management System enterprise portal'}
          {step === 'PASSWORD' && (userName ? `Welcome back, ${userName}! Enter your password to continue.` : 'Enter your password to sign in to your dashboard.')}
          {step === 'SETUP' && (userName ? `Welcome, ${userName}! Your account has been provisioned. Set a password to activate your account.` : 'Welcome! Set up a password to activate your new account.')}
          {step === 'FORGOT_PASSWORD' && 'Enter your email to receive a secure password reset link.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-gray-100 relative overflow-hidden">
          {/* Subtle top brand accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Error Message */}
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

          {/* STEP 1: EMAIL */}
          {step === 'EMAIL' && (
            <form className="space-y-5" onSubmit={handleVerifyEmail}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setStep('FORGOT_PASSWORD'); setError(''); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PASSWORD (Existing User) */}
          {step === 'PASSWORD' && (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                    {userName ? userName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-900 truncate">{userName || email}</p>
                    <p className="text-xs text-gray-500 truncate">{email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="ml-2 text-xs text-gray-600 font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => { setStep('FORGOT_PASSWORD'); setError(''); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full flex justify-center items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SETUP PASSWORD (Admin-created first-time login) */}
          {step === 'SETUP' && (
            <form className="space-y-5" onSubmit={handleSetup}>
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start text-amber-800 text-xs">
                <ShieldCheck className="h-4 w-4 text-amber-600 mr-2 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Initial Account Setup</span>
                  <p className="mt-0.5 text-amber-700">Please choose a secure password to activate your account.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-600 truncate">{email}</span>
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Create Password
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
                  Confirm Password
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
                    placeholder="Re-enter your password"
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Set Password & Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: FORGOT PASSWORD */}
          {step === 'FORGOT_PASSWORD' && (
            <div>
              {forgotSuccess ? (
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
                      onClick={handleForgotPassword}
                      className="w-full py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend reset link'}
                    </button>
                    <button
                      type="button"
                      onClick={resetToEmailStep}
                      className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Back to sign in
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form className="space-y-5" onSubmit={handleForgotPassword}>
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
                    <button
                      type="button"
                      onClick={resetToEmailStep}
                      className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      Back to sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Bookstore Management System &bull; Secure Enterprise Portal
        </p>
      </div>
    </div>
  );
}

