import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">404</h1>
        <h2 className="text-lg font-bold text-slate-300 mt-2">Page Not Found</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          The requested page does not exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};
