import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, ArrowRight, Lock, Mail, Loader2, Sparkles, Database } from 'lucide-react';
import mebachaLogo from '../assets/mebacha-1000.png';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@mebacha.com');
  const [password, setPassword] = useState('MebachaAdmin2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performSignIn = async (signInEmail: string, signInPass: string) => {
    if (!signInEmail || !signInPass) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPass,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data?.session) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    performSignIn(email, password);
  };

  const handleQuickAdminSignIn = () => {
    performSignIn('admin@mebacha.com', 'MebachaAdmin2026!');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-md">
        {/* Header Operations Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white border border-[#D1D5DB] rounded-[6px] mb-3 p-2 shadow-sm">
            <img src={mebachaLogo} alt="Mebacha Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[#14181D] tracking-wider uppercase">
            MEBACHA DISPATCH
          </h1>
          <p className="text-xs font-mono font-medium text-[#5A6470] uppercase tracking-wider mt-1">
            Freight Logistics Operations Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-6 sm:p-8 space-y-6 shadow-sm">
          {errorMsg && (
            <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-[4px] text-[#DC2626] text-xs font-mono flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-[#F4F6F8] border border-[#D1D5DB] rounded-[4px] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#006838]" />
              <span className="font-semibold text-[#14181D]">TELEMETRY: nkzccgjsfioizogxyuxl</span>
            </div>
            <span className="px-2 py-0.5 bg-[#E6F4EC] text-[#006838] border border-[#A7F3D0] text-[10px] font-bold uppercase rounded-[2px]">
              ONLINE
            </span>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[#14181D] uppercase tracking-wider mb-1.5 font-bold text-[11px]">
                Authorized Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A6470] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mebacha.com"
                  required
                  className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-[4px] pl-10 pr-4 py-2.5 text-sm text-[#14181D] placeholder-[#9CA3AF] focus:outline-none focus:border-[#006838] focus:ring-1 focus:ring-[#006838] transition min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#14181D] uppercase tracking-wider mb-1.5 font-bold text-[11px]">
                Access Token / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A6470] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-[4px] pl-10 pr-4 py-2.5 text-sm text-[#14181D] placeholder-[#9CA3AF] focus:outline-none focus:border-[#006838] focus:ring-1 focus:ring-[#006838] transition min-h-[44px]"
                />
              </div>
            </div>

            {/* Freight Primary Button (Mebacha Green) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#006838] hover:bg-[#004D2A] text-white font-mono font-bold uppercase tracking-wider py-3 px-4 rounded-[4px] border border-[#004D2A] transition disabled:opacity-50 min-h-[46px] shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Dispatch Authorization</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Real Admin Sign-In */}
          <div className="pt-4 border-t border-[#D1D5DB]">
            <div className="text-center mb-2.5">
              <span className="text-[10px] font-mono font-semibold text-[#5A6470] uppercase tracking-widest">
                Field Quick Login Bypass
              </span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleQuickAdminSignIn}
              className="w-full flex items-center justify-center space-x-2 bg-[#F4F6F8] hover:bg-[#E5E7EB] text-[#14181D] border border-[#D1D5DB] rounded-[4px] py-2.5 px-4 text-xs font-mono font-semibold uppercase tracking-wider transition min-h-[42px] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#866128]" />
              <span>1-Click Super Admin Sign In</span>
            </button>
            <p className="text-[10px] font-mono text-[#5A6470] text-center mt-2">
              Authenticates admin@mebacha.com via verified Supabase session.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs font-mono text-[#5A6470] uppercase">
          <p>© 2026 Mebacha OS — Freight Logistics System</p>
        </div>
      </div>
    </div>
  );
};

export const UnauthorizedScreen: React.FC<{ onSignOut: () => void; userEmail?: string }> = ({
  onSignOut,
  userEmail,
}) => {
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center p-6 text-center antialiased">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-8 space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-[#FEF2F2] border border-[#F87171] rounded-[4px] text-[#DC2626] mx-auto flex items-center justify-center mb-2">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-display font-bold text-[#14181D] uppercase tracking-tight">Access Restricted</h2>
        <p className="text-xs font-mono text-[#5A6470] uppercase tracking-wider">
          Unauthorized: Internal Mebacha Team Only.
        </p>
        <p className="text-xs text-[#14181D] bg-[#F4F6F8] p-3 border border-[#D1D5DB] rounded-[4px] font-mono truncate font-semibold">
          {userEmail || 'Account is not in admin_users whitelist'}
        </p>
        <p className="text-xs font-sans text-[#5A6470] pt-1">
          If you are a merchant, please log into the standard Mebacha Merchant app at{' '}
          <strong className="text-[#006838]">app.mebacha.et</strong>.
        </p>
        <button
          onClick={onSignOut}
          className="w-full py-2.5 px-4 bg-[#14181D] hover:bg-[#272F38] text-white uppercase text-xs font-mono font-semibold tracking-wider rounded-[4px] transition min-h-[42px]"
        >
          Sign Out & Return
        </button>
      </div>
    </div>
  );
};
