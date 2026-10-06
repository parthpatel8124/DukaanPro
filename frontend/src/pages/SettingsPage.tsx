import React, { useEffect, useState, useRef } from 'react';
import {
  Save,
  Check,
  ShieldCheck,
  MapPin,
  FileText,
  HelpCircle,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  User,
  Mail,
  UserCheck,
  Phone,
  Building2,
  Fingerprint
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { fetchStoreProfile, updateStoreProfile, changePasswordAPI, updateUserProfileAPI } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { isDarkMode } = useStore();
  const { user, setAuth } = useAuthStore();

  // OS Detection - Hide biometric card on iOS devices
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // Active Settings Tab ('SHOP' | 'USER' | 'SECURITY')
  const [settingsTab, setSettingsTab] = useState<'SHOP' | 'USER' | 'SECURITY'>('SHOP');

  // Biometric Authentication state
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(
    () => localStorage.getItem('dukaanpro_biometric_enabled') === 'true'
  );

  const handleToggleBiometric = async () => {
    if (!isBiometricEnabled) {
      if (!window.PublicKeyCredential) {
        toast.error('Physical biometric sensor is not supported on this browser/OS.');
        return;
      }

      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        // Invokes native physical OS fingerprint sensor prompt (Touch ID / Android Fingerprint / Windows Hello)
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'DukaanPro ERP',
              id: window.location.hostname
            },
            user: {
              id: userId,
              name: user?.email || 'owner@dukaanpro.com',
              displayName: user?.fullName || 'Shop Owner'
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000
          }
        }) as PublicKeyCredential | null;

        if (credential) {
          const rawIdArr = Array.from(new Uint8Array(credential.rawId));
          localStorage.setItem('dukaanpro_biometric_enabled', 'true');
          localStorage.setItem('dukaanpro_biometric_cred_id', JSON.stringify(rawIdArr));
          if (user) {
            localStorage.setItem('dukaanpro_biometric_user', JSON.stringify(user));
          }
          setIsBiometricEnabled(true);
          toast.success('Physical Fingerprint sensor verified & registered!');
        } else {
          toast.error('Physical fingerprint verification was not completed.');
        }
      } catch (err: any) {
        console.warn('Physical WebAuthn registration canceled or failed:', err);
        toast.error('Physical fingerprint scan canceled or failed.');
      }
    } else {
      localStorage.removeItem('dukaanpro_biometric_enabled');
      localStorage.removeItem('dukaanpro_biometric_cred_id');
      localStorage.removeItem('dukaanpro_biometric_user');
      setIsBiometricEnabled(false);
      toast.success('Biometric login disabled.');
    }
  };

  // User Account Profile state
  const [userFullName, setUserFullName] = useState(user?.fullName || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userPhone, setUserPhone] = useState(user?.phone || '');
  const [userProfileLoading, setUserProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUserFullName(user.fullName || '');
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
    }
  }, [user]);

  const [name, setName] = useState('KISHAN');
  const [tagline, setTagline] = useState('ELECTRONICS');
  const [gstin, setGstin] = useState('24AUJPP7785L1ZR');
  const [phone, setPhone] = useState('99741 27474');
  const [address, setAddress] = useState('Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640');
  const [city, setCity] = useState('VALOD');
  const [district, setDistrict] = useState('Tapi');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('394640');
  const [jurisdiction, setJurisdiction] = useState('VALOD');
  const [terms, setTerms] = useState(
    'Goods once sold will not be taken back or exchanged. Guarantee/Warranty by Company.'
  );
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleLogoUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await fetchStoreProfile();
      if (profile) {
        setName(profile.name || 'KISHAN');
        setTagline(profile.tagline || 'ELECTRONICS');
        setGstin(profile.gstin || '24AUJPP7785L1ZR');
        setPhone(profile.phone || '99741 27474');
        setAddress(profile.address || 'Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640');
        setCity(profile.city || 'VALOD');
        setDistrict(profile.district || 'Tapi');
        setState(profile.state || 'Gujarat');
        setPincode(profile.pincode || '394640');
        setJurisdiction(profile.jurisdiction || 'VALOD');
        if (profile.terms) setTerms(profile.terms);
        if (profile.logoUrl) setLogoUrl(profile.logoUrl);
      }
    } catch (err) {
      console.error('Error loading store profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const updated = await updateStoreProfile({
        name,
        tagline,
        logoUrl,
        gstin,
        phone,
        address,
        city,
        district,
        state,
        pincode,
        jurisdiction,
        terms
      });

      if (updated) {
        setSuccessMsg('Shop Profile & GST settings updated successfully in database!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update store profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName.trim() || !userEmail.trim()) {
      toast.error('Full Name and Email Address are required.');
      return;
    }

    setUserProfileLoading(true);
    try {
      const res = await updateUserProfileAPI({
        fullName: userFullName.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim()
      });

      if (res && res.success) {
        toast.success('Your user account profile updated successfully!');
        if (res.token && res.user) {
          setAuth(res.token, res.user, res.store);
        }
      } else {
        toast.error(res?.error || 'Failed to update user profile.');
      }
    } catch (err) {
      toast.error('Failed to update user profile.');
    } finally {
      setUserProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePasswordAPI({ currentPassword, newPassword });
      if (res && res.success) {
        toast.success('Your password has been updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res?.error || 'Failed to update password.');
      }
    } catch (err) {
      toast.error('Failed to update password. Please check your connection.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="40" y="45" width="120" height="90" rx="8" opacity="0.15" />
            <circle cx="100" cy="75" r="18" opacity="0.2" />
            <path d="M60 115 H140" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M100 65 V85 M90 75 H110" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Store Settings &amp; Profile
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Configure shop brand, GST details, jurisdiction, and invoice printing preferences
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center space-x-2 shadow-md">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs: 3-Column Equal Grid on Mobile (Zero Horizontal Scroll), Flex on Desktop */}
      <div className={`p-1.5 sm:p-2 rounded-2xl border shadow-xs ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-3 md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setSettingsTab('SHOP')}
            className={`py-2 sm:py-2.5 px-1.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center space-x-1 sm:space-x-2 transition-all cursor-pointer ${
              settingsTab === 'SHOP'
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate hidden sm:inline">Shop Business Profile</span>
            <span className="truncate sm:hidden">Shop</span>
          </button>

          <button
            onClick={() => setSettingsTab('USER')}
            className={`py-2 sm:py-2.5 px-1.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center space-x-1 sm:space-x-2 transition-all cursor-pointer ${
              settingsTab === 'USER'
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate hidden sm:inline">Personal User Profile</span>
            <span className="truncate sm:hidden">User</span>
          </button>

          <button
            onClick={() => setSettingsTab('SECURITY')}
            className={`py-2 sm:py-2.5 px-1.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center space-x-1 sm:space-x-2 transition-all cursor-pointer ${
              settingsTab === 'SECURITY'
                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate hidden sm:inline">Account Security</span>
            <span className="truncate sm:hidden">Security</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 italic text-sm">
          Loading Shop Profile settings...
        </div>
      ) : (
        <div className="w-full space-y-6">
          {/* TAB 1: SHOP BUSINESS PROFILE */}
          {settingsTab === 'SHOP' && (
            <form onSubmit={handleSaveProfile} className={`p-4 sm:p-6 md:p-8 rounded-xl border shadow-xs space-y-6 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
            {/* 1. Shop Logo & Branding */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-brand-primary" />
                <span>1. Shop Logo & Identity</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Logo Upload */}
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden flex-shrink-0 ${isDarkMode
                      ? 'border-slate-700 hover:border-brand-primary bg-slate-950'
                      : 'border-slate-300 hover:border-brand-primary bg-slate-50'
                    }`}
                  title="Click to upload your shop logo"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-brand-primary mb-1" />
                      <span className="text-[9px] font-bold text-slate-400">Upload Logo</span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-3 w-full">
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[10px] font-bold text-rose-500 hover:underline flex items-center space-x-1 mb-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1 opacity-80">Shop / Business Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="KISHAN"
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 opacity-80">Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="ELECTRONICS"
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">Upload your shop logo (JPG/PNG, max 2MB). This logo will appear in the sidebar and on printed bills.</p>
                </div>
              </div>
            </div>

            {/* 2. GSTIN & Tax State Rules */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>2. GST Registration & Tax State Settings</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Shop GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="24AUJPP7785L1ZR"
                    className={`w-full px-3.5 py-2.5 rounded-lg border font-mono font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Default Shop State (Tax State) *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="Gujarat">Gujarat (Default)</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
              </div>

              <div className={`p-3.5 rounded-lg border text-xs space-y-1 ${isDarkMode
                  ? 'bg-brand-primary/10 border-brand-primary/20 text-sky-100'
                  : 'bg-brand-light border-brand-primary/30 text-slate-800'
                }`}>
                <p className="font-extrabold flex items-center space-x-1.5 text-brand-primary">
                  <HelpCircle className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>How GST Tax Split Works:</span>
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Setting your shop state to <strong>{state}</strong> ensures that selling to local customers will automatically split GST into <strong>CGST 9% + SGST 9%</strong> on bills! Selling to other states will apply <strong>IGST 18%</strong>.
                </p>
              </div>
            </div>

            {/* 3. Address & Phone */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-brand-primary" />
                <span>3. Physical Address & Contact Info</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Complete Shop Address (For Invoice Header) *</label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640"
                    className={`w-full px-3.5 py-2.5 rounded-lg border font-semibold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="99741 27474"
                      className={`w-full px-3 py-2 rounded-lg border font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">City / Village *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="VALOD"
                      className={`w-full px-3 py-2 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">District *</label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Tapi"
                      className={`w-full px-3 py-2 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="394640"
                      className={`w-full px-3 py-2 rounded-lg border font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Jurisdiction (Subject to Jurisdiction of) *</label>
                    <input
                      type="text"
                      required
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="VALOD"
                      className={`w-full px-3 py-2 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Terms & Conditions */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-brand-primary" />
                <span>4. Bill Terms & Conditions</span>
              </h3>

              <div>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Goods once sold will not be taken back or exchanged..."
                  className={`w-full px-3.5 py-2.5 rounded-lg border font-semibold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs transition-all shadow-md shadow-brand-primary/25 flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Profile Settings'}</span>
              </button>
            </div>
          </form>
          )}

          {/* TAB 2: PERSONAL USER PROFILE */}
          {settingsTab === 'USER' && (
            <div className={`p-4 sm:p-6 md:p-8 rounded-xl border shadow-xs ${isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
              <div className="flex items-center justify-between border-b pb-4 mb-6 border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-brand-primary border border-sky-500/20 flex items-center justify-center font-bold flex-shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                      Personal Account & User Profile
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Update your full name, login email address, and personal mobile number
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveUserProfile} className="space-y-4 max-w-xl text-xs font-semibold">
                <div>
                  <label className="block font-bold mb-1 opacity-80">User / Owner Full Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full px-3.5 py-2.5 pl-10 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Login Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="owner@dukaan.com"
                        className={`w-full px-3.5 py-2.5 pl-10 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Owner Phone Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="9974127474"
                        className={`w-full px-3.5 py-2.5 pl-10 rounded-lg border font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={userProfileLoading}
                    className="px-6 py-2.5 rounded-lg btn-gradient-primary text-white font-extrabold text-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
                  >
                    <Save className="w-4 h-4" />
                    <span>{userProfileLoading ? 'Saving Profile...' : 'Save User Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ACCOUNT SECURITY & PASSWORD CHANGE */}
          {settingsTab === 'SECURITY' && (
            <div className="space-y-6">
              {/* Biometric & Fingerprint Unlock Setting (Feature Disabled - Commented Out)
              {!isIOS && (
                <div className={`p-3.5 sm:p-6 md:p-8 rounded-xl border shadow-xs ${isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex items-start space-x-2.5 sm:space-x-3.5 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 text-brand-primary border border-sky-500/20 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider leading-snug">
                            Biometric &amp; Fingerprint Security
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border flex-shrink-0 ${isBiometricEnabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}>
                            {isBiometricEnabled ? 'Active on Device' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Enable Fingerprint &amp; Touch ID hardware verification for instant sign-in on your device
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleBiometric}
                      className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${isBiometricEnabled ? 'bg-brand-primary' : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${isBiometricEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              )}
              */}

              {/* Password Change Form Card */}
              <div className={`p-4 sm:p-6 md:p-8 rounded-xl border shadow-xs ${isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                <div className="flex items-center justify-between border-b pb-4 mb-6 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-brand-primary border border-sky-500/20 flex items-center justify-center font-bold flex-shrink-0">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                        Account Security & Change Password
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Update your account password to maintain maximum store security
                      </p>
                    </div>
                  </div>
                </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl text-xs font-semibold">
              <div>
                <label className="block font-bold mb-1 opacity-80">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current account password"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1 opacity-80">New Password *</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full px-3.5 py-2.5 rounded-lg border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-6 py-2.5 rounded-lg btn-gradient-primary text-white font-extrabold text-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-98"
                >
                  <Lock className="w-4 h-4" />
                  <span>{passLoading ? 'Updating Password...' : 'Update Account Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
