"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Send 
} from 'lucide-react';

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
  const [errorKey, setErrorKey] = useState(0);
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
      setErrorKey((prev) => prev + 1);
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
        setErrorKey((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      setErrorKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setErrorKey((prev) => prev + 1);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      setErrorKey((prev) => prev + 1);
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
        setErrorKey((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup password. Please try again.');
      setErrorKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      setErrorKey((prev) => prev + 1);
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
      setErrorKey((prev) => prev + 1);
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
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12 selection:bg-primary selection:text-white bg-background">
      {/* Brand plum ambient glow matching PMS */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="h-[520px] w-[680px] -translate-y-12 rounded-full bg-[#7e2562]/[0.07] blur-[100px]" />
        <div className="h-[300px] w-[400px] translate-y-24 rounded-full bg-[#9b3179]/[0.04] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-apple-in">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 transition-transform duration-300 hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={220}
              height={55}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#7e2562]/8 px-3.5 py-1 text-xs font-bold text-[#7e2562]">
            Bookstore Management System
          </span>
        </div>

        {/* Login Container */}
        <div className="rounded-sm border border-[#7e2562]/15 bg-white p-7 shadow-plum-md sm:p-8">
          {/* Error Message with Alert Pill */}
          {error && (
            <div
              key={errorKey}
              role="alert"
              className="mb-5 flex items-center gap-2 rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-800 border border-rose-200 animate-apple-in"
            >
              <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: EMAIL */}
          {step === 'EMAIL' && (
            <form onSubmit={handleVerifyEmail} className={`space-y-4.5 ${error ? "animate-apple-shake" : ""}`}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Work Email Address
                </label>
                <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
                  <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    autoFocus
                    placeholder="name@kairalibooks.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </button>

              {/* <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setStep('FORGOT_PASSWORD'); setError(''); }}
                  className="text-xs font-semibold text-[#7e2562] hover:text-primary-hover hover:underline"
                >
                  Forgot your password?
                </button>
              </div> */}
            </form>
          )}

          {/* STEP 2: PASSWORD (Existing User) */}
          {step === 'PASSWORD' && (
            <form onSubmit={handleLogin} className={`space-y-4.5 ${error ? "animate-apple-shake" : ""}`}>
              <div className="bg-[#faf6f9] border border-[#7e2562]/15 rounded-sm px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="h-7 w-7 rounded-sm bg-[#faedf5] text-[#7e2562] font-bold flex items-center justify-center text-xs shrink-0 border border-[#7e2562]/20">
                    {userName ? userName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate text-left">
                    <p className="text-xs font-bold text-foreground truncate">{userName || email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="text-xs font-bold text-[#7e2562] hover:text-primary-hover shrink-0 ml-2 hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
                  <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
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
                    className="h-4 w-4 rounded-xs border-gray-300 text-[#7e2562] focus:ring-[#7e2562] cursor-pointer"
                  />
                  <span className="ml-2 text-xs text-muted-foreground font-medium">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SETUP PASSWORD (Admin-created first-time login) */}
          {step === 'SETUP' && (
            <form onSubmit={handleSetup} className={`space-y-4.5 ${error ? "animate-apple-shake" : ""}`}>
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-sm p-3 flex items-start text-amber-800 text-xs">
                <ShieldCheck className="h-4 w-4 text-amber-600 mr-2 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Initial Account Setup</span>
                  <p className="mt-0.5 text-amber-700">Please choose a secure password to activate your account.</p>
                </div>
              </div>

              <div className="bg-[#faf6f9] border border-[#7e2562]/15 rounded-sm px-3.5 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{email}</span>
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="text-xs font-bold text-[#7e2562] hover:text-primary-hover shrink-0 ml-2 hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Create Password
                </label>
                <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
                  <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    autoFocus
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm Password
                </label>
                <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
                  <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
                    <KeyRound className="h-4 w-4" />
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
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center text-xs text-muted-foreground">
                  <div className={`h-1.5 w-1.5 rounded-full mr-2 ${password.length >= 6 ? 'bg-[#3cb976]' : 'bg-gray-300'}`} />
                  <span>Minimum 6 characters</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <div className={`h-1.5 w-1.5 rounded-full mr-2 ${password && password === confirmPassword ? 'bg-[#3cb976]' : 'bg-gray-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Password & Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={resetToEmailStep}
                  className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
                <div className="text-center py-4 space-y-4 animate-apple-in">
                  <div className="h-12 w-12 bg-[#f0fbf5] text-[#3cb976] rounded-full flex items-center justify-center mx-auto ring-4 ring-[#3cb976]/20 border border-[#3cb976]/30">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Check your inbox</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      We have sent a password reset link to <strong className="text-foreground">{email}</strong>. The link expires in 1 hour.
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleForgotPassword}
                      className="apple-button w-full py-2.5 px-3 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#faedf5]/80 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend reset link'}
                    </button>
                    <button
                      type="button"
                      onClick={resetToEmailStep}
                      className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Back to sign in
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className={`space-y-4.5 ${error ? "animate-apple-shake" : ""}`}>
                  <div>
                    <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Account Email Address
                    </label>
                    <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
                      <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="forgot-email"
                        name="forgot-email"
                        type="email"
                        autoComplete="email"
                        required
                        autoFocus
                        placeholder="name@kairalibooks.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Send Reset Link
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={resetToEmailStep}
                      className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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

        {/* Footer Support Prompt matching PMS */}
        {/* <div className="mt-7 text-center">
          <p className="text-[13px] text-muted-foreground">
            Need system assistance?{" "}
            <Link
              href="mailto:admin@kairalibooks.in"
              className="font-bold text-[#7e2562] hover:underline"
            >
              Contact Administrator
            </Link>
          </p>
        </div> */}
      </div>
    </main>
  );
}
