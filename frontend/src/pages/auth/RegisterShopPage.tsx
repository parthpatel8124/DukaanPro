import React, { useState } from 'react';
import {
  Store,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { registerShopAccount } from '../../services/api';
import { toast } from 'react-hot-toast';

export const RegisterShopPage: React.FC = () => {
  const { setAuth, setAuthView } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Owner Credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Shop Details
  const [shopName, setShopName] = useState('');
  const [tagline, setTagline] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('VALOD');
  const [district, setDistrict] = useState('Tapi');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('394640');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !phone) {
      toast.error('Please fill in all owner credential fields.');
      return;
    }
    setStep(2);
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName) {
      toast.error('Please enter your Shop Business Name.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerShopAccount({
        email,
        password,
        fullName,
        phone,
        shopName,
        tagline,
        gstin,
        address,
        city,
        district,
        state,
        pincode
      });

      if (res && res.success && res.token) {
        setAuth(res.token, res.user, res.store);
        toast.success(`Congratulations! Your shop "${shopName}" is registered.`);
      } else {
        toast.error(res?.error || 'Registration failed.');
      }
    } catch (err: any) {
      toast.error('Failed to create shop account. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-brand-primary selection:text-white">
      {/* Top Header Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2 gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/25 flex-shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight truncate">
              DukaanPro <span className="text-brand-primary font-bold text-[10px] sm:text-xs">Enterprise</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 hidden sm:block">Mobile & Electronics POS ERP</p>
          </div>
        </div>

        <button
          onClick={() => setAuthView('LOGIN')}
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-300 text-slate-700 font-extrabold text-xs hover:bg-slate-100 transition-all flex items-center space-x-1.5 cursor-pointer flex-shrink-0"
        >
          <span className="hidden sm:inline">Existing User? Sign In</span>
          <span className="sm:hidden">Sign In</span>
        </button>
      </div>

      {/* Main Registration Card */}
      <div className="max-w-xl w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div className="flex items-center space-x-2">
              <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                step === 1 ? 'bg-brand-primary text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step === 1 ? '1' : <CheckCircle2 className="w-4 h-4" />}
              </span>
              <span className="font-extrabold text-xs text-slate-900">1. Owner Credentials</span>
            </div>

            <div className="border-t-2 border-slate-200 flex-1 mx-4" />

            <div className="flex items-center space-x-2">
              <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                step === 2 ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </span>
              <span className="font-extrabold text-xs text-slate-900">2. Shop Profile</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900">
              {step === 1 ? 'Create Your Account Credentials' : 'Set Up Your Shop Details'}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {step === 1 ? 'Enter your personal details to secure your shop account' : 'Provide your business details for GST tax invoicing'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Mobile Number (10 Digits) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9974127474"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-primary text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@kishanelectronics.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Password (At least 6 characters) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:border-brand-primary text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs transition-all shadow-md shadow-brand-primary/25 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <span>Continue to Shop Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterShop} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Shop Business Name *</label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. KISHAN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-black text-xs uppercase focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. ELECTRONICS & MOBILES"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs uppercase focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="24AUJPP7785L1ZR"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono font-bold text-xs uppercase focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Shop State *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs focus:outline-none focus:border-brand-primary"
                  >
                    <option value="Gujarat">Gujarat (Default)</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1 opacity-80">City / Village</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="VALOD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 opacity-80">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Tapi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 opacity-80">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="394640"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold font-mono text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Complete Shop Address (For Invoices)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs transition-all shadow-md shadow-brand-primary/25 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{loading ? 'Creating Shop...' : 'Complete & Open Shop'}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="max-w-6xl w-full mx-auto text-center py-2 text-[11px] font-bold text-slate-400">
        © 2026 DukaanPro Enterprise POS • Multi-Tenant Shop Isolation
      </div>
    </div>
  );
};
