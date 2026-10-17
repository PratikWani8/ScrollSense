import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; count?: number }> = ({ rows, count }) => {
  const items = rows ?? count ?? 4;
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 bg-slate-800/40 rounded-2xl border border-slate-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-800/40 rounded-2xl border border-slate-800" />
        ))}
      </div>
      <div className="h-64 bg-slate-800/40 rounded-2xl border border-slate-800" />
    </div>
  );
};
