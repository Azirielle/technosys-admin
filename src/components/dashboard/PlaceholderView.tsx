import React from 'react';

export default function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-700">
        <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">{title}</h2>
      <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-sm mx-auto text-xs leading-relaxed">
        This module is currently under active operations. Check back later for updates to the {title} feature.
      </p>
    </div>
  );
}
