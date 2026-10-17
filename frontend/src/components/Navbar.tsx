import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b border-veya-border/80 bg-veya-obsidian/85 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-veya-indigo via-[#2E284A] to-veya-surface border border-veya-borderLight flex items-center justify-center shadow-lg shadow-black/40 group-hover:border-veya-orchid/60 transition-all">
              <Sparkles className="w-4 h-4 text-veya-orchid group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-veya-offwhite flex items-center gap-1.5 font-sans">
                ScrollSense
                <span className="text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full bg-veya-orchid/15 text-veya-orchid border border-veya-orchid/30">
                  v1.0
                </span>
              </span>
              <p className="text-[11px] text-veya-muted leading-none">Reclaim your time</p>
            </div>
          </Link>

          {/* Right Navigation */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-veya-surface border border-veya-border">
                  <User className="w-3.5 h-3.5 text-veya-lavender" />
                  <span className="text-xs font-medium text-veya-offwhite">{user.displayName}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 text-veya-muted hover:text-veya-coral hover:bg-veya-coral/10 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <Link
                  to="/privacy"
                  className="text-xs font-medium text-veya-muted hover:text-veya-offwhite px-2 sm:px-2.5 py-1.5 transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-veya-offwhite px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-veya-surface/80 transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold text-veya-obsidian bg-veya-blush hover:bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm shadow-veya-blush/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
