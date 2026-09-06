import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  ...props
}) => {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rounded'
      ? 'rounded-xl'
      : 'rounded-none';

  return (
    <div
      className={`relative overflow-hidden bg-white/[0.07] border border-white/[0.08] backdrop-blur-md animate-pulse ${variantClass} ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
    </div>
  );
};

// Stat Card Skeleton (Dashboard / Metrics)
export const SkeletonStatCard: React.FC = () => (
  <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-5 space-y-3 shadow-xl">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton variant="circular" className="w-8 h-8 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-28" />
  </div>
);

// Table Row Skeleton (Students & Scans History)
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 3 }) => (
  <tr className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
    {/* Chevron / Icon col */}
    <td className="py-4 pl-4 pr-1 text-center w-14">
      <Skeleton variant="circular" className="w-8 h-8 mx-auto rounded-xl" />
    </td>

    {/* Primary Text / Badges col */}
    <td className="py-4 px-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-4 w-36 sm:w-48" />
        <Skeleton className="h-4 w-12 rounded-lg" />
      </div>
    </td>

    {/* Right Action col */}
    <td className="py-4 pr-4 sm:pr-6 pl-2 text-right w-24">
      <Skeleton className="h-7 w-20 ml-auto rounded-xl" />
    </td>
  </tr>
);

// Scanner Terminal Card Skeleton
export const SkeletonScannerCard: React.FC = () => (
  <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton variant="circular" className="w-10 h-10 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <div className="bg-white/[0.08] rounded-2xl p-3 border border-white/15 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>

    <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2">
      <Skeleton className="h-7 w-18 rounded-xl" />
      <Skeleton className="h-7 w-22 rounded-xl" />
    </div>
  </div>
);

// Audit Log Item Skeleton
export const SkeletonActivityItem: React.FC = () => (
  <div className="p-4 rounded-2xl bg-white/[0.08] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
    <div className="flex items-start gap-3">
      <Skeleton variant="circular" className="w-8 h-8 rounded-xl shrink-0 mt-0.5" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-48 sm:w-72" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
    <div className="space-y-1.5 text-right sm:w-32 shrink-0">
      <Skeleton className="h-4 w-20 ml-auto rounded" />
      <Skeleton className="h-3 w-24 ml-auto" />
    </div>
  </div>
);

// Full Page / Tab Skeleton Loader Router
export const TabSkeletonView: React.FC<{ tabId: string }> = ({ tabId }) => {
  if (tabId === 'dashboard') {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 sm:w-80" />
            <Skeleton className="h-3.5 w-48 sm:w-96" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tabId === 'students') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        {/* Badges Toolbar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-2xl p-3.5 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>

        {/* Search Toolbar */}
        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-3 sm:p-4 flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Table Container */}
        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 bg-white/[0.06] backdrop-blur-md">
                <th className="w-14 py-3.5 pl-4 pr-1 text-center"></th>
                <th className="py-3.5 px-4"><Skeleton className="h-3 w-28" /></th>
                <th className="w-24 py-3.5 px-4 text-right pr-6"><Skeleton className="h-3 w-16 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {[...Array(6)].map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tabId === 'scans') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-3 sm:p-4 flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 bg-white/[0.06] backdrop-blur-md">
                <th className="w-10 py-3.5 pl-4 pr-2"></th>
                <th className="py-3.5 px-4"><Skeleton className="h-3 w-28" /></th>
                <th className="py-3.5 px-4 text-right pr-6"><Skeleton className="h-3 w-20 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {[...Array(6)].map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tabId === 'scanners') {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <SkeletonScannerCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (tabId === 'event') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="bg-[#242b4d]/45 border border-white/20 rounded-3xl p-6 space-y-5 backdrop-blur-2xl">
          <div className="flex justify-between pb-4 border-b border-white/15">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-52 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="bg-[#242b4d]/45 border border-white/20 rounded-3xl p-6 space-y-4 backdrop-blur-2xl">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (tabId === 'activity') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        <Skeleton className="h-12 max-w-md rounded-2xl" />

        <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonActivityItem key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Default / settings tab skeleton
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>

      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>

      <div className="bg-[#242b4d]/45 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-96" />
      </div>

      <div className="bg-rose-950/30 border border-rose-500/35 backdrop-blur-2xl rounded-3xl p-6 space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  );
};

// Public Marketing & Informational Page Skeleton
export const PublicPageSkeletonView: React.FC<{ path?: string }> = ({ path = '/' }) => {
  if (path === '/login') {
    return (
      <div className="max-w-md w-full mx-auto p-6 bg-[#181d36]/80 border border-white/15 rounded-3xl space-y-6 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-200">
        <div className="text-center space-y-2">
          <Skeleton variant="circular" className="w-12 h-12 mx-auto rounded-2xl" />
          <Skeleton className="h-6 w-44 mx-auto rounded-lg" />
          <Skeleton className="h-3.5 w-60 mx-auto rounded" />
        </div>
        {/* Role tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-9 rounded-xl bg-transparent" />
        </div>
        {/* Form fields */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-2xl pt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-in fade-in duration-200">
      {/* Hero Skeleton */}
      <div className="text-center max-w-3xl mx-auto space-y-6 pt-6">
        <div className="flex justify-center">
          <Skeleton className="h-7 w-48 rounded-full" />
        </div>
        <Skeleton className="h-12 sm:h-16 w-3/4 mx-auto rounded-2xl" />
        <Skeleton className="h-4 sm:h-5 w-5/6 mx-auto rounded-xl" />
        <Skeleton className="h-4 sm:h-5 w-2/3 mx-auto rounded-xl" />
        <div className="flex items-center justify-center gap-4 pt-4">
          <Skeleton className="h-12 w-36 rounded-2xl" />
          <Skeleton className="h-12 w-36 rounded-2xl" />
        </div>
      </div>

      {/* Feature / Content Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-[#242b4d]/35 border border-white/15 backdrop-blur-2xl rounded-3xl p-6 space-y-4 shadow-xl"
          >
            <Skeleton variant="circular" className="w-12 h-12 rounded-2xl" />
            <Skeleton className="h-6 w-40 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-5/6 rounded" />
              <Skeleton className="h-3.5 w-4/6 rounded" />
            </div>
            <div className="pt-2">
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Broad Content Section Skeleton */}
      <div className="bg-[#242b4d]/30 border border-white/15 backdrop-blur-2xl rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-72 rounded" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Scanner Terminal Skeleton View (Full Screen)
// Scanner Terminal Skeleton View (Full Screen matching Admin Console)
export const ScannerPageSkeletonView: React.FC = () => {
  return (
    <div className="min-h-screen mesh-bg text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="glass-header border-b border-white/[0.08] px-4 sm:px-6 py-3 sticky top-0 z-40 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-9 h-9 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </header>

      {/* Main Terminal Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-6 flex flex-col justify-center items-center">
        {/* Viewport Frame Card */}
        <div className="max-w-lg w-full bg-[#242b4d]/40 border border-white/20 rounded-3xl p-5 sm:p-6 space-y-4 backdrop-blur-2xl shadow-2xl">
          {/* Segmented Mode Control */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
            <Skeleton className="h-9 rounded-xl" />
            <Skeleton className="h-9 rounded-xl bg-transparent" />
          </div>

          {/* Viewfinder Reticle Frame */}
          <div className="relative aspect-[4/3] w-full rounded-2xl bg-[#090d16] border border-white/15 overflow-hidden flex items-center justify-center shadow-inner">
            <div className="w-[180px] h-[180px] border-2 border-indigo-400/40 rounded-2xl flex items-center justify-center p-3">
              <Skeleton className="w-full h-full rounded-xl bg-indigo-500/10" />
            </div>
          </div>

          {/* Status Instruction Bar */}
          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-3">
            <Skeleton variant="circular" className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>

          {/* Search Input & Action Button */}
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-24 rounded-2xl" />
          </div>
        </div>
      </main>

      {/* Floating Apple Dock Bar Skeleton */}
      <div className="fixed bottom-3 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
        <div className="p-2 rounded-3xl bg-[#181d36]/90 border border-white/20 backdrop-blur-2xl shadow-2xl flex items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="circular" className="w-11 h-11 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

// Scanner Dock Tabs Skeleton View (Matching Admin Console Aesthetics)
export const ScannerTabSkeletonView: React.FC<{ tabId: string }> = ({ tabId }) => {
  if (tabId === 'home') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
        {/* Header / Event Banner Card */}
        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-8 w-72 rounded-xl" />
              <Skeleton className="h-3.5 w-56 rounded" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
        </div>

        {/* Metric Cards Grid (Matching Admin Dashboard Stat Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-2xl p-4 space-y-2 shadow-lg"
            >
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Recent Check-Ins Card */}
        <div className="bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-7 w-28 rounded-xl" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" className="w-8 h-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tabId === 'scanner') {
    return (
      <div className="flex flex-col justify-between max-w-lg mx-auto w-full h-full animate-in fade-in duration-200 gap-3">
        {/* Segmented Mode Control */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900/90 border border-white/15 shadow-md">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-9 rounded-xl bg-transparent" />
        </div>

        {/* Camera Viewfinder Frame */}
        <div className="relative w-full aspect-[4/3] max-h-[46vh] bg-[#090d16] rounded-3xl border border-white/20 overflow-hidden flex items-center justify-center shadow-2xl">
          <div className="w-[200px] h-[200px] border-2 border-indigo-400/50 rounded-2xl flex items-center justify-center p-4">
            <Skeleton className="w-full h-full rounded-xl bg-indigo-500/10" />
          </div>
        </div>

        {/* Status / Instructions Card */}
        <div className="p-4 rounded-2xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl flex items-center gap-3 shadow-md">
          <Skeleton variant="circular" className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>

        {/* Search Bar Input Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (tabId === 'roster') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-28 rounded-2xl" />
        </div>
        <div className="flex gap-2 overflow-x-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
          ))}
        </div>
        <div className="space-y-2.5 pt-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tabId === 'log') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
        <div className="flex justify-between items-center pb-2">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <div className="space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tabId === 'stats') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-3xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl space-y-2 shadow-lg"
            >
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl space-y-4 shadow-xl">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="p-6 rounded-3xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl space-y-4 shadow-xl">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // settings tab skeleton
  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl space-y-4 shadow-xl">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-80" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#242b4d]/40 border border-white/20 backdrop-blur-2xl space-y-4 shadow-xl">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

