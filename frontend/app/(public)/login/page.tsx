"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Loader2, Eye, EyeOff, ArrowLeft,
  CheckCircle2, Mail, KeyRound, ShieldCheck, Send,
} from 'lucide-react';

// ── CSS book stack illustration data ────────────────────────────────────────
// Each book: { w, h, color, rotate, x, y } — rendered as absolute divs
const BOOKS = [
  // Stacked horizontal books (lying flat at bottom)
  { w: 120, h: 18, c: '#3cb976', r: -2,  x: 30,  y: 210, z: 1 },
  { w: 105, h: 16, c: '#c2599c', r:  1,  x: 38,  y: 195, z: 2 },
  { w: 130, h: 20, c: '#541440', r: -1,  x: 22,  y: 177, z: 3 },
  { w: 115, h: 17, c: '#9b3179', r:  2,  x: 32,  y: 162, z: 4 },
  // Standing books (upright)
  { w: 20, h: 90,  c: '#7e2562', r:  0,  x: 170, y: 135, z: 5 },
  { w: 24, h: 110, c: '#3cb976', r: -3,  x: 193, y: 115, z: 6 },
  { w: 18, h: 80,  c: '#f4dbe9', r:  2,  x: 220, y: 145, z: 7 },
  { w: 22, h: 100, c: '#c2599c', r: -1,  x: 240, y: 125, z: 8 },
  { w: 20, h: 88,  c: '#541440', r:  3,  x: 265, y: 137, z: 9 },
];

const QUOTES = [
  { ml: 'വായന ഒരു ജനലാണ്', en: 'Reading is a window to the world' },
  { ml: 'പുസ്തകം ഒരു ജ്ഞാനദീപം', en: 'A book is a lamp of knowledge' },
  { ml: 'അക്ഷരങ്ങൾ അനശ്വരമാണ്', en: 'Letters are immortal' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<'EMAIL' | 'PASSWORD' | 'SETUP' | 'FORGOT_PASSWORD'>('EMAIL');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [errorKey, setErrorKey]         = useState(0);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [quoteIdx, setQuoteIdx]         = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const bump = () => setErrorKey(p => p + 1);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/verify-email', { email: cleanEmail });
      if (res.data?.name) setUserName(res.data.name);
      setStep(res.data?.status === 'PENDING_SETUP' ? 'SETUP' : 'PASSWORD');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Account not found with this email address.');
      bump();
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { email: cleanEmail, password });
      if (res.success && res.data?.accessToken) {
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken);
        await login(res.data.accessToken);
      } else { setError(res.message || 'Invalid credentials.'); bump(); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.'); bump();
    } finally { setLoading(false); }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); bump(); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); bump(); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/setup-password', { email: cleanEmail, password });
      if (res.success && res.data?.accessToken) {
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken);
        await login(res.data.accessToken);
      } else { setError('Failed to setup password.'); bump(); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup password.'); bump();
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Please enter your email address.'); bump(); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email: cleanEmail });
      setForgotSuccess(true); setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link.'); bump();
    } finally { setLoading(false); }
  };

  const resetToEmailStep = () => {
    setStep('EMAIL'); setPassword(''); setConfirmPassword('');
    setError(''); setForgotSuccess(false);
  };

  // ── Design primitives ──────────────────────────────────────────────────────
  const inputRow = "apple-input-container flex items-center border border-[#e2d9df] rounded-sm bg-white overflow-hidden";
  const inputEl  = "flex-1 border-0 border-none outline-none focus:outline-none focus:ring-0 px-2.5 py-2.5 text-sm text-[#180e15] bg-transparent placeholder:text-[#a090a0]";
  const iconSlot = "pl-3.5 pr-0.5 text-[#b09ab0] shrink-0 flex items-center justify-center";
  const lbl      = "block text-[10px] font-bold tracking-widest text-[#9a7a90] uppercase mb-1.5";
  const primaryBtn = `
    apple-button w-full flex items-center justify-center gap-2 py-2.5 px-4
    text-sm font-bold text-white rounded-sm transition-all
    disabled:cursor-not-allowed disabled:opacity-40
  `;

  return (
    <main
      className="h-dvh w-full overflow-hidden flex items-center justify-center relative"
      style={{ background: 'linear-gradient(160deg, #f7f2ee 0%, #efe8e4 50%, #f0e8ec 100%)' }}
    >
      {/* ── Page background decorations ─────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Large faint circles */}
        <div className="absolute top-[-200px] left-[-150px] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(126,37,98,0.06) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-180px] right-[-150px] w-[550px] h-[550px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(60,185,118,0.05) 0%, transparent 60%)' }} />

        {/* Decorative dots pattern top-right */}
        <div className="absolute top-8 right-10 opacity-20"
          style={{
            width: 120, height: 120,
            backgroundImage: 'radial-gradient(circle, #7e2562 1.5px, transparent 1.5px)',
            backgroundSize: '14px 14px',
          }} />
        {/* Decorative dots pattern bottom-left */}
        <div className="absolute bottom-8 left-10 opacity-15"
          style={{
            width: 100, height: 100,
            backgroundImage: 'radial-gradient(circle, #7e2562 1.5px, transparent 1.5px)',
            backgroundSize: '14px 14px',
          }} />

        {/* Thin decorative lines */}
        <div className="absolute top-0 left-0 w-full h-[3px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #7e2562 40%, #3cb976 60%, transparent 100%)', opacity: 0.4 }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CENTERED CARD
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full animate-apple-in"
        style={{ maxWidth: 880 }}
      >
        <div
          className="flex overflow-hidden mx-4 sm:mx-6"
          style={{
            borderRadius: 4,
            boxShadow: '0 2px 4px rgba(126,37,98,0.04), 0 8px 24px rgba(126,37,98,0.10), 0 40px 80px rgba(126,37,98,0.16)',
          }}
        >

          {/* ── LEFT: Dark brand panel ─────────────────────────────── */}
          <div
            className="hidden md:flex flex-col w-[46%] shrink-0 relative overflow-hidden"
            style={{
              background: 'linear-gradient(155deg, #1e0916 0%, #3a0f2a 50%, #541440 100%)',
              minHeight: 540,
            }}
          >
            {/* Subtle inner texture */}
            <div className="absolute inset-0 opacity-[0.035]" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />

            {/* Accent color strip along top */}
            {/* <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, #c2599c 0%, #7e2562 40%, #3cb976 100%)' }} /> */}

            <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">

              {/* Logo — white pill so original brand colors show on dark bg */}
              <div className="mb-auto">
                <div className="inline-flex items-center gap-2.5 rounded-sm px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                  <Image src="/kairaliLogo.png" alt="Kairali Books" width={110} height={38} priority
                    className="h-7 w-auto object-contain" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px]  text-white/35 uppercase">
                    Bookstore Management System
                  </span>
                </div>
              </div>

              {/* CSS Book illustration */}
              <div className="relative my-6" style={{ height: 240 }}>
                {/* Shelf surface */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full"
                  style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.06) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-8"
                  style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.15))' }} />

                {/* Upright books */}
                {[
                  { w: 26, h: 105, c: '#7e2562', accent: '#c2599c', x: 0   },
                  { w: 20, h: 130, c: '#1e5e3a', accent: '#3cb976', x: 30  },
                  { w: 28, h: 88,  c: '#541440', accent: '#9b3179', x: 54  },
                  { w: 22, h: 118, c: '#2d4a1e', accent: '#4a7c2f', x: 86  },
                  { w: 24, h: 96,  c: '#7e2562', accent: '#f4dbe9', x: 112 },
                  { w: 20, h: 140, c: '#c2599c', accent: '#faedf5', x: 140 },
                  { w: 26, h: 82,  c: '#1e3a5e', accent: '#4a8fb5', x: 164 },
                  { w: 22, h: 122, c: '#541440', accent: '#c2599c', x: 194 },
                  { w: 20, h: 100, c: '#3cb976', accent: '#f4dbe9', x: 220 },
                  { w: 28, h: 110, c: '#7e2562', accent: '#e8b6d6', x: 244 },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="absolute bottom-[3px] rounded-[1px_1px_0_0] overflow-hidden"
                    style={{
                      left: b.x, width: b.w, height: b.h,
                      background: `linear-gradient(180deg, ${b.c}dd 0%, ${b.c} 100%)`,
                      boxShadow: `inset -2px 0 4px rgba(0,0,0,0.3), inset 1px 0 1px rgba(255,255,255,0.06)`,
                      animation: `book-pop 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both`,
                    }}
                  >
                    {/* Book spine highlight line */}
                    <div className="absolute top-0 left-[3px] bottom-0 w-[1px]"
                      style={{ background: `linear-gradient(180deg, ${b.accent}60 0%, transparent 100%)` }} />
                    {/* Title stripe */}
                    <div className="absolute top-6 left-[3px] right-[3px] h-[2px] rounded-full opacity-40"
                      style={{ background: b.accent }} />
                    <div className="absolute top-10 left-[3px] right-[3px] h-[1px] rounded-full opacity-20"
                      style={{ background: b.accent }} />
                  </div>
                ))}

                {/* Lying books stack on the right */}
                <div className="absolute bottom-[3px]" style={{ right: 0 }}>
                  {[
                    { w: 72, h: 16, c: '#3cb976' },
                    { w: 80, h: 14, c: '#c2599c' },
                    { w: 68, h: 18, c: '#4a7c2f' },
                    { w: 76, h: 15, c: '#7e2562' },
                  ].map((b, i) => (
                    <div key={i} style={{
                      width: b.w, height: b.h, marginBottom: 0, marginLeft: 'auto',
                      background: `linear-gradient(90deg, ${b.c}cc 0%, ${b.c} 100%)`,
                      borderRadius: '0 1px 1px 0',
                      boxShadow: '0 -1px 3px rgba(0,0,0,0.2)',
                      animation: `book-pop 0.6s cubic-bezier(0.16,1,0.3,1) ${(10 + i) * 0.06}s both`,
                    }} />
                  ))}
                </div>
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-3 gap-1 px-2 py-2.5 rounded-sm mb-6"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {[
                  { v: '12,000+', l: 'Titles' },
                  { v: '6',       l: 'Branches' },
                  { v: '200+',    l: 'Daily Bills' },
                ].map(({ v, l }, i) => (
                  <div key={l} className={`flex flex-col items-center justify-center text-center ${i > 0 ? 'border-l border-white/10' : ''}`}>
                    <span className="text-xs font-bold text-white tracking-tight">{v}</span>
                    <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider mt-0.5">{l}</span>
                  </div>
                ))}
              </div>

              {/* Rotating quote */}
              <div key={quoteIdx} className="animate-apple-in border-l-2 border-[#c2599c]/40 pl-3">
                <p className="text-[13px] font-bold text-white/60 font-ml leading-snug">
                  {QUOTES[quoteIdx].ml}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5 italic">{QUOTES[quoteIdx].en}</p>
              </div>

              {/* Bottom corner decoration */}
              <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10"
                style={{ background: 'radial-gradient(circle at 100% 100%, #c2599c, transparent 70%)' }} />
            </div>
          </div>

          {/* ── RIGHT: Clean white form panel ──────────────────────── */}
          <div className="flex-1 flex flex-col justify-center bg-white px-8 py-10 xl:px-12">

            {/* Mobile: show logo */}
            <div className="md:hidden mb-6 flex items-center gap-2">
              <Image src="/kairaliLogo.png" alt="Kairali Books" width={110} height={40} priority
                className="h-8 w-auto object-contain" />
            </div>

            {/* Step header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {step !== 'EMAIL' && (
                  <button type="button" onClick={step === 'FORGOT_PASSWORD' ? resetToEmailStep : resetToEmailStep}
                    className="apple-button text-[#9a7a90] hover:text-[#7e2562] transition-colors p-0.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className="text-[10px] font-bold tracking-widest text-[#b09ab0] uppercase">
                  {step === 'EMAIL'           ? 'Sign in' :
                   step === 'PASSWORD'        ? 'Password' :
                   step === 'SETUP'           ? 'Account setup' : 'Password reset'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#180e15] leading-tight">
                {step === 'EMAIL'           && 'Welcome back'}
                {step === 'PASSWORD'        && (userName ? `Hello, ${userName}` : 'Enter password')}
                {step === 'SETUP'           && 'Set your password'}
                {step === 'FORGOT_PASSWORD' && 'Reset password'}
              </h2>
              <p className="mt-1 text-[13px] text-[#9a7a90]">
                {step === 'EMAIL'           && 'Enter your work email to continue'}
                {step === 'PASSWORD'        && 'Sign in to your BMS account'}
                {step === 'SETUP'           && 'Create a password to activate your account'}
                {step === 'FORGOT_PASSWORD' && "We'll email you a reset link"}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div key={errorKey} role="alert"
                className="mb-4 flex items-start gap-2 rounded-sm bg-red-50 border border-red-200 px-3 py-2.5 text-[12px] font-semibold text-red-700 animate-apple-in">
                <svg className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* ── EMAIL ── */}
            {step === 'EMAIL' && (
              <form onSubmit={handleVerifyEmail} className={`space-y-4 ${error ? 'animate-apple-shake' : ''}`}>
                <div>
                  <label htmlFor="email" className={lbl}>Work Email</label>
                  <div className={inputRow}>
                    <div className={iconSlot}><Mail className="h-4 w-4" /></div>
                    <input id="email" name="email" type="email" autoComplete="username"
                      required autoFocus placeholder="name@kairalibooks.in"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className={inputEl} />
                  </div>
                </div>
                <button type="submit" id="btn-continue" disabled={loading || !email.trim()}
                  className={primaryBtn}
                  style={{ background: 'linear-gradient(135deg, #7e2562 0%, #541440 100%)', boxShadow: '0 4px 16px rgba(126,37,98,0.35)' }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue →'}
                </button>
              </form>
            )}

            {/* ── PASSWORD ── */}
            {step === 'PASSWORD' && (
              <form onSubmit={handleLogin} className={`space-y-4 ${error ? 'animate-apple-shake' : ''}`}>
                {/* User chip */}
                <div className="flex items-center justify-between rounded-sm border border-[#ece3ea] bg-[#fdf7fa] px-3 py-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7e2562, #9b3179)' }}>
                      {(userName || email).charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      {userName && <p className="text-[12px] font-bold text-[#180e15] truncate leading-none">{userName}</p>}
                      <p className="text-[11px] text-[#9a7a90] truncate mt-0.5">{email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={resetToEmailStep}
                    className="text-[11px] font-bold text-[#7e2562] hover:underline shrink-0 ml-2">Change</button>
                </div>

                <div>
                  <label htmlFor="password" className={lbl}>Password</label>
                  <div className={inputRow}>
                    <div className={iconSlot}><KeyRound className="h-4 w-4" /></div>
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password" required autoFocus placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className={inputEl} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                      className="apple-button mr-2 h-7 w-7 flex items-center justify-center rounded-sm text-[#b09ab0] hover:text-[#7e2562] hover:bg-[#faedf5] transition-all">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded-sm border-[#e2d9df] text-[#7e2562]" />
                  <label htmlFor="remember" className="text-[12px] text-[#9a7a90] cursor-pointer">Remember me on this device</label>
                </div>

                <button type="submit" id="btn-signin" disabled={loading || !password}
                  className={primaryBtn}
                  style={{ background: 'linear-gradient(135deg, #7e2562 0%, #541440 100%)', boxShadow: '0 4px 16px rgba(126,37,98,0.35)' }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </button>

                <div className="text-center">
                  <button type="button" onClick={() => { setStep('FORGOT_PASSWORD'); setError(''); }}
                    className="text-[12px] font-semibold text-[#9a7a90] hover:text-[#7e2562] transition-colors">
                    Forgot your password?
                  </button>
                </div>
              </form>
            )}

            {/* ── SETUP ── */}
            {step === 'SETUP' && (
              <form onSubmit={handleSetup} className={`space-y-3.5 ${error ? 'animate-apple-shake' : ''}`}>
                <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-amber-800 text-[12px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>First login.</strong> Set a secure password to activate your account.</span>
                </div>

                <div className="rounded-sm border border-[#ece3ea] bg-[#fdf7fa] px-3 py-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-[#9a7a90] truncate">{email}</span>
                  <button type="button" onClick={resetToEmailStep}
                    className="text-[11px] font-bold text-[#7e2562] hover:underline shrink-0 ml-2">Change</button>
                </div>

                <div>
                  <label htmlFor="new-password" className={lbl}>Create Password</label>
                  <div className={inputRow}>
                    <div className={iconSlot}><KeyRound className="h-4 w-4" /></div>
                    <input id="new-password" name="new-password" type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password" required autoFocus placeholder="At least 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)} className={inputEl} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                      className="apple-button mr-2 h-7 w-7 flex items-center justify-center rounded-sm text-[#b09ab0] hover:text-[#7e2562] hover:bg-[#faedf5] transition-all">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className={lbl}>Confirm Password</label>
                  <div className={inputRow}>
                    <div className={iconSlot}><KeyRound className="h-4 w-4" /></div>
                    <input id="confirm-password" name="confirm-password" type={showConfirmPw ? 'text' : 'password'}
                      autoComplete="new-password" required placeholder="Re-enter password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputEl} />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}
                      className="apple-button mr-2 h-7 w-7 flex items-center justify-center rounded-sm text-[#b09ab0] hover:text-[#7e2562] hover:bg-[#faedf5] transition-all">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Strength */}
                <div className="flex gap-4 pl-0.5">
                  {[
                    { ok: password.length >= 6, label: 'Min 6 chars' },
                    { ok: !!password && password === confirmPassword, label: 'Passwords match' },
                  ].map(({ ok, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[11px]">
                      <div className={`h-1.5 w-1.5 rounded-full transition-all ${ok ? 'bg-[#3cb976]' : 'bg-[#e2d9df]'}`} />
                      <span className={ok ? 'text-[#22794d] font-semibold' : 'text-[#b09ab0]'}>{label}</span>
                    </div>
                  ))}
                </div>

                <button type="submit" id="btn-setup" disabled={loading || password.length < 6 || password !== confirmPassword}
                  className={primaryBtn}
                  style={{ background: 'linear-gradient(135deg, #7e2562 0%, #541440 100%)', boxShadow: '0 4px 16px rgba(126,37,98,0.35)' }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate Account'}
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {step === 'FORGOT_PASSWORD' && (
              <div>
                {forgotSuccess ? (
                  <div className="py-2 text-center space-y-4 animate-apple-in">
                    <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto border-2 border-[#3cb976]/30 bg-[#f0fbf5]">
                      <CheckCircle2 className="h-7 w-7 text-[#3cb976]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#180e15]">Check your inbox</p>
                      <p className="text-[12px] text-[#9a7a90] mt-1">
                        Reset link sent to <strong className="text-[#180e15]">{email}</strong>. Expires in 1 hour.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button type="button" disabled={resendCooldown > 0 || loading}
                        onClick={handleForgotPassword as any}
                        className="apple-button w-full py-2.5 text-[12px] font-bold text-[#7e2562] border border-[#7e2562]/25 bg-[#faedf5] hover:bg-[#f4dbe9] rounded-sm disabled:opacity-40 transition-colors">
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend link'}
                      </button>
                      <button type="button" onClick={resetToEmailStep}
                        className="w-full py-2 text-[11px] font-semibold text-[#9a7a90] hover:text-[#180e15] transition-colors">
                        Back to sign in
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className={`space-y-4 ${error ? 'animate-apple-shake' : ''}`}>
                    <div>
                      <label htmlFor="forgot-email" className={lbl}>Your Email Address</label>
                      <div className={inputRow}>
                        <div className={iconSlot}><Mail className="h-4 w-4" /></div>
                        <input id="forgot-email" name="forgot-email" type="email" autoComplete="email"
                          required autoFocus placeholder="name@kairalibooks.in"
                          value={email} onChange={e => setEmail(e.target.value)} className={inputEl} />
                      </div>
                    </div>
                    <button type="submit" id="btn-forgot" disabled={loading || !email.trim()}
                      className={primaryBtn}
                      style={{ background: 'linear-gradient(135deg, #7e2562 0%, #541440 100%)', boxShadow: '0 4px 16px rgba(126,37,98,0.35)' }}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Send Reset Link</>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Footer */}
            <p className="mt-8 text-[10px] text-[#c8b8c4] text-center">
              Authorised personnel only &nbsp;·&nbsp; © {new Date().getFullYear()} Kairali Books, Kannur
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes book-pop {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .font-ml { font-family: 'Anek Malayalam', sans-serif; }
      `}</style>
    </main>
  );
}
