import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  Check, 
  X, 
  ShieldCheck, 
  BookOpen, 
  UserCheck, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../api.js';

interface GimkAuthProps {
  role: 'usher' | 'pastor' | 'admin';
  onLoginSuccess: (username: string) => void;
  onCancel: () => void;
}

export default function GimkAuth({ role, onLoginSuccess, onCancel }: GimkAuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitationPassword, setInvitationPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getRoleIcon = () => {
    switch (role) {
      case 'admin': return <ShieldCheck className="text-amber-400" size={32} />;
      case 'pastor': return <BookOpen className="text-amber-400" size={32} />;
      case 'usher': return <UserCheck className="text-amber-400" size={32} />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'pastor': return 'Pastor / Clergy';
      case 'usher': return 'Church Usher';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login({ username: username.trim(), password, role });
      if (res.success) {
        setSuccess('Login successful!');
        setTimeout(() => {
          onLoginSuccess(res.user.username);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim()) {
      setError('Please provide a username and password');
      return;
    }

    if (!invitationPassword) {
      setError('Invitation/Official passcode is required to create an account');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.register({
        username: username.trim(),
        password,
        role,
        invitationPassword
      });

      if (res.success) {
        setSuccess('Account created successfully! Switching to Login tab...');
        setTimeout(() => {
          setActiveTab('login');
          setPassword('');
          setInvitationPassword('');
          setError(null);
          setSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Error registering account. Verify your invitation passcode.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Banner */}
      <div className="bg-slate-900 px-6 py-8 text-center text-white space-y-3 relative border-b border-blue-900/30">
        <div className="mx-auto w-16 h-16 bg-slate-950/60 rounded-full border border-blue-900/40 flex items-center justify-center shadow-inner">
          {getRoleIcon()}
        </div>
        <div>
          <h2 className="text-md font-extrabold uppercase tracking-widest text-slate-100">GIMK Portal Access</h2>
          <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Role: {getRoleLabel()}</p>
        </div>
        <button 
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          title="Return to Congregant Portal"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button
          onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); }}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'login' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Login
        </button>
        <button
          onClick={() => { setActiveTab('register'); setError(null); setSuccess(null); }}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'register' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Create Account
        </button>
      </div>

      {/* Forms Body */}
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
            ✓ {success}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. pastor_ramba"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs bg-white text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs bg-white text-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 select-none active:scale-[0.98]"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={14} /> : <Lock size={14} />}
              <span>Log In to {getRoleLabel()}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Choose Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. jared_okwany"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs bg-white text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Create your personal password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs bg-white text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Official Passcode</label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter official church passcode"
                  value={invitationPassword}
                  onChange={(e) => setInvitationPassword(e.target.value)}
                  className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs bg-white text-slate-800 font-semibold"
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 pt-0.5 leading-relaxed">
                * To authorize {getRoleLabel()} registration, you must provide the official church-wide key.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 select-none active:scale-[0.98]"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
              <span>Register Account</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

interface ChangePasswordModalProps {
  username: string;
  role: 'usher' | 'pastor' | 'admin';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordModal({ username, role, isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword.trim() || !newPassword.trim()) {
      setError('Please fill in all password fields');
      return;
    }

    setIsLoading(true);
    try {
      await api.changePassword({
        username,
        oldPassword,
        newPassword,
        role
      });
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        onSuccess();
        setOldPassword('');
        setNewPassword('');
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Ensure your current password is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Change Access Password</h3>
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">User: {username} ({role})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-xl text-xs font-semibold leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-xs font-semibold leading-relaxed">
              ✓ {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                placeholder="Enter new custom password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pl-9 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50 select-none"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={13} /> : <Check size={13} />}
              <span>Save Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
