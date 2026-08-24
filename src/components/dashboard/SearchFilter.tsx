"use client";

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react';

export default function SearchFilter({ placeholder = 'Search...' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    
    // Reset page to 1 on new search
    params.set('page', '1');
    
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, 300);

  return (
    <div className="relative w-full sm:max-w-xs">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className={`w-4 h-4 ${isPending ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors shadow-sm"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('query')?.toString()}
      />
    </div>
  );
}
