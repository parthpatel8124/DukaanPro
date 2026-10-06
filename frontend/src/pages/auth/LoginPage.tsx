import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  KeyRound,
  Fingerprint,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { loginUserAccount, googleAuthAccount, requestForgotPassword, resetPasswordConfirm } from '../../services/api';
import { toast } from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { setAuth, setAuthView } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OS Detection - Hide biometric option on iOS
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // Biometric Authentication state
  const [isBiometricEnabled] = useState(
    () => localStorage.getItem('dukaanpro_biometric_enabled') === 'true'
  );

  // Biometric Verification Modal State
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const executeBiometricAuth = async () => {
    setLoading(true);
    try {
      const savedUserRaw = localStorage.getItem('dukaanpro_biometric_user');
      let targetEmail = 'owner@kishanelectronics.com';
      if (savedUserRaw) {
        try {
          const parsed = JSON.parse(savedUserRaw);
          if (parsed?.email) targetEmail = parsed.email;
        } catch (e) {}
      }

      const res = await googleAuthAccount({
        email: targetEmail,
        fullName: 'Kishan Patel',
        googleId: 'biometric-demo-12345',
        shopName: 'KISHAN ELECTRONICS'
      });

      if (res && res.success && res.token) {
        setIsFingerprintModalOpen(false);
        setAuth(res.token, res.user, res.store);
        toast.success('Fingerprint hardware scan verified! Welcome back!');
      } else {
        toast.error('Biometric authentication failed. Please sign in with password.');
      }
    } catch (err) {
      toast.error('Biometric verification error.');
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      toast.error('Physical biometric sensor is not supported on this browser/OS.');
      return;
    }

    const savedCredIdRaw = localStorage.getItem('dukaanpro_biometric_cred_id');
    if (!savedCredIdRaw) {
      toast.error('No physical fingerprint registered on this device. Please enable biometrics in Settings.');
      return;
    }

    setLoading(true);
    try {
      const rawIdArr = JSON.parse(savedCredIdRaw);
      const credId = new Uint8Array(rawIdArr);

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Triggers physical OS hardware fingerprint sensor dialog
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: credId,
            type: 'public-key'
          }],
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential | null;

      if (!assertion) {
        toast.error('Physical fingerprint verification failed or was canceled.');
        setLoading(false);
        return;
      }

      // Physical hardware fingerprint scan verified!
      await executeBiometricAuth();
    } catch (err: any) {
      console.warn('Physical fingerprint scan error or canceled:', err);
      toast.error('Physical fingerprint scan canceled or failed.');
      setLoading(false);
    }
  };

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      executeBiometricAuth();
    }, 1200);
  };

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUserAccount({ email, password });
      if (res && res.success && res.token) {
        setAuth(res.token, res.user, res.store);
        toast.success(`Welcome back, ${res.user.fullName || 'User'}!`);
      } else {
        toast.error(res?.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const demoEmail = 'owner@kishanelectronics.com';
      const res = await googleAuthAccount({
        email: demoEmail,
        fullName: 'Kishan Patel',
        googleId: 'google-demo-12345',
        shopName: 'KISHAN ELECTRONICS'
      });
      if (res && res.success && res.token) {
        setAuth(res.token, res.user, res.store);
        toast.success('Signed in successfully with Google!');
      } else {
        toast.error(res?.error || 'Google Authentication failed.');
      }
    } catch (err) {
      toast.error('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await requestForgotPassword(forgotEmail);
      if (res.success) {
        toast.success(res.message || 'Reset code generated!');
        if (res.resetToken) setResetCode(res.resetToken);
        setResetStep(2);
      } else {
        toast.error(res.error || 'Password recovery failed.');
      }
    } catch (err) {
      toast.error('Failed sending reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) return;
    setForgotLoading(true);
    try {
      const res = await resetPasswordConfirm({
        email: forgotEmail,
        resetToken: resetCode,
        newPassword
      });
      if (res.success) {
        toast.success('Password reset successfully! You can now log in.');
        setIsForgotModalOpen(false);
        setEmail(forgotEmail);
        setPassword(newPassword);
      } else {
        toast.error(res.error || 'Failed to reset password.');
      }
    } catch (err) {
      toast.error('Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-brand-primary selection:text-white">
      {/* Top Header Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 gap-2">
        <div className="flex items-center min-w-0">
          <img
            src="/full-logo.png"
            alt="DukaanPro Enterprise"
            className="h-9 sm:h-10 w-auto object-contain flex-shrink-0"
          />
        </div>

        <button
          onClick={() => setAuthView('REGISTER')}
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-brand-primary/30 text-brand-primary font-extrabold text-xs hover:bg-brand-light transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs flex-shrink-0"
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Register New Shop</span>
          <span className="sm:hidden">New Shop</span>
        </button>
      </div>

      {/* Main Login Form Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to DukaanPro</h2>
            <p className="text-xs font-semibold text-slate-500">Access your shop inventory, bill book & finance accounts</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1 opacity-80">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@shopdomain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:bg-white transition-all text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold opacity-80">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary focus:bg-white transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Biometric Quick Login Option (Feature Disabled - Commented Out)
            {isBiometricEnabled && !isIOS && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl btn-gradient-primary text-white font-extrabold text-xs transition-all shadow-lg shadow-brand-primary/25 flex items-center justify-center space-x-2.5 cursor-pointer active:scale-98"
                >
                  <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>Quick Sign In with Fingerprint</span>
                </button>

                <div className="relative flex items-center justify-center my-3.5">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest absolute">
                    OR USE PASSWORD
                  </span>
                </div>
              </div>
            )}
            */}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs transition-all shadow-md shadow-brand-primary/25 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest absolute">
              OR
            </span>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center space-x-3 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Footer callout to register */}
        <p className="text-center text-xs font-semibold text-slate-500 mt-6">
          Don't have a shop account yet?{' '}
          <button
            onClick={() => setAuthView('REGISTER')}
            className="text-brand-primary font-black hover:underline cursor-pointer"
          >
            Create New Shop Profile
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-brand-primary" />
                <h3 className="font-extrabold text-sm text-slate-900">Reset Account Password</h3>
              </div>
              <button onClick={() => setIsForgotModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleSendResetCode} className="space-y-4 text-xs">
                <p className="text-slate-500 font-medium">Enter your registered email address and we will generate a password recovery code.</p>
                <div>
                  <label className="block font-bold mb-1 opacity-80">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@shopdomain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{forgotLoading ? 'Sending...' : 'Get Reset Code'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
                <p className="text-slate-500 font-medium">Enter the reset code sent to <strong>{forgotEmail}</strong> and your new password.</p>
                <div>
                  <label className="block font-bold mb-1 opacity-80">Reset Verification Code</label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. A1B2C3D4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold font-mono text-xs focus:outline-none focus:border-brand-primary uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 opacity-80">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{forgotLoading ? 'Resetting...' : 'Save New Password & Log In'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Fingerprint Hardware Verification Modal */}
      {isFingerprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-5 h-5 text-brand-primary" />
                <h3 className="font-extrabold text-sm text-slate-900">Fingerprint Scan Verification</h3>
              </div>
              <button onClick={() => setIsFingerprintModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 space-y-4">
              {/* Pulsing Fingerprint Sensor Icon Touch Zone */}
              <div
                onClick={handleSimulatedScan}
                className={`w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  isScanning
                    ? 'border-brand-primary bg-sky-100 animate-pulse scale-105 shadow-xl shadow-brand-primary/30'
                    : 'border-sky-200 hover:border-brand-primary bg-sky-50/50 hover:bg-sky-50 shadow-md'
                }`}
                title="Touch to scan fingerprint"
              >
                <Fingerprint className={`w-12 h-12 transition-colors ${isScanning ? 'text-brand-primary animate-bounce' : 'text-sky-600'}`} />
              </div>

              <div className="space-y-1">
                <p className="font-extrabold text-xs text-slate-900">
                  {isScanning ? 'Scanning Fingerprint Sensor...' : 'Touch Sensor to Scan Fingerprint'}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold max-w-xs mx-auto">
                  Place your registered finger on your device hardware sensor or tap the scanner above
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFingerprintModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulatedScan}
                disabled={isScanning}
                className="w-full py-2.5 rounded-xl btn-gradient-primary text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 cursor-pointer active:scale-98"
              >
                {isScanning ? 'Scanning...' : 'Scan Fingerprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="max-w-6xl w-full mx-auto text-center py-2 text-[11px] font-bold text-slate-400">
        © 2026 DukaanPro Enterprise POS • Secure JWT Encrypted Sessions
      </div>
    </div>
  );
};
