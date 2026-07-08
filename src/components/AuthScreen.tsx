import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Mail, Eye, EyeOff, ShieldCheck, 
  CheckCircle2, AlertCircle, Info, ChevronRight,
  Sparkles, Check, User, X, Github
} from 'lucide-react';

interface AuthScreenProps {
  loginId: string;
  setLoginId: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  setNotification: (val: null) => void;
  isActionLoading: boolean;
}

export default function AuthScreen({
  loginId,
  setLoginId,
  loginPassword,
  setLoginPassword,
  handleLogin,
  notification,
  setNotification,
  isActionLoading
}: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sign up fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  // Password strength
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };

  const strength = getPasswordStrength(loginPassword);
  
  const getStrengthColor = () => {
    if (strength === 0) return 'bg-white/10';
    if (strength === 1) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (strength === 2) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
    if (strength === 3) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      // Mock verification UI
      setShowVerification(true);
      setTimeout(() => setShowVerification(false), 3000);
    } else {
      handleLogin(e);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050508] font-sans antialiased flex flex-col items-center justify-center text-white p-4 overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decorative Ambient Blobs & Particles */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#22104a] rounded-full blur-[140px] opacity-40 animate-pulse-slow-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#0c1a4a] rounded-full blur-[120px] opacity-40 animate-pulse-slow-2 pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/40 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            opacity: Math.random() * 0.5 + 0.1
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [null, 0]
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}

      {/* Dynamic Pop-up Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full flex items-center gap-2 shadow-2xl backdrop-blur-md border ${
              notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              notification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
             notification.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> :
             <Info className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium tracking-wide">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-0.5 rounded-full hover:bg-white/10 transition-colors ml-2 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Authentication Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Animated Gradient Border using CSS pseudo-elements technique */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-indigo-500/50 via-purple-500/20 to-blue-500/50 rounded-[32px] opacity-70 blur-[2px]" />
        
        <div className="relative glass-panel bg-[#09090e]/80 backdrop-blur-2xl p-8 sm:p-10 rounded-[32px] border border-white/10 shadow-[0_0_80px_rgba(79,70,229,0.15)] flex flex-col">
          
          <div className="flex flex-col items-center mb-8 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="w-14 h-14 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center mb-5 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles className="w-7 h-7 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10" />
            </div>
            
            <motion.h1 
              key={isSignUp ? 'signup-title' : 'login-title'}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60"
            >
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </motion.h1>
            <motion.p 
              key={isSignUp ? 'signup-desc' : 'login-desc'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-white/40 mt-1.5 font-medium"
            >
              {isSignUp ? 'Join the next generation platform' : 'Sign in to continue'}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      required={isSignUp}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 transition-all focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] outline-none" 
                      placeholder="Enter your name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5 ml-1">Email / Master ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input 
                  type="text" 
                  required 
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 transition-all focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] outline-none" 
                  placeholder="Enter email or ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 transition-all focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] outline-none" 
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <AnimatePresence>
                {isSignUp && loginPassword.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className="flex gap-1.5 mb-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${strength > i ? getStrengthColor() : 'bg-transparent'}`} 
                          />
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/40 ml-1">
                      {strength <= 1 && 'Weak password'}
                      {strength === 2 && 'Fair password'}
                      {strength === 3 && 'Good password'}
                      {strength === 4 && 'Strong password'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required={isSignUp}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full bg-white/[0.03] border rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 transition-all outline-none ${
                        confirmPassword && confirmPassword !== loginPassword 
                          ? 'border-red-500/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                          : 'border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                      }`} 
                      placeholder="Confirm your password"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isSignUp && (
              <div className="flex items-center justify-between mt-1 mb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                    rememberMe ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 group-hover:border-white/40'
                  }`}>
                    {rememberMe && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">Remember Me</span>
                </label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium hover:underline underline-offset-2">
                  Forgot Password?
                </a>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isActionLoading || showVerification}
              className="group relative w-full bg-white text-black hover:bg-gray-100 transition-all py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mt-2 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              
              {showVerification ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Sending Verification...
                </>
              ) : isActionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="my-6 relative flex items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="mx-4 text-xs font-mono text-white/30 uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm font-medium transition-all group hover:border-white/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
              </svg>
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm font-medium transition-all group hover:border-white/20">
              <Github className="w-4 h-4 group-hover:scale-110 transition-transform text-white" />
              GitHub
            </button>
          </div>
          
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-white/50">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:underline underline-offset-4"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
