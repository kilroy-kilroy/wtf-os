'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'call_report' | 'coaching_report';
  title: string;
  subtitle: string;
  date: string;
  url: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search calls, reports..."
          className="w-full md:w-64 px-3 py-1.5 pl-9 pr-8 bg-[#1a1a1a] border border-[#333333] text-white text-sm placeholder-[#666666] focus:outline-none focus:border-[#FFDE59] rounded"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-[#333333] rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-[#666666] text-sm">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="block px-4 py-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {result.title}
                      </div>
                      <div className="text-[#666666] text-xs mt-0.5 truncate">
                        {result.subtitle}
                      </div>
                    </div>
                    <div className="text-[#666666] text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(result.date), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] text-[#FFDE59] uppercase font-semibold">
                      {result.type === 'call_report' ? 'Call Report' : 'Coaching'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-[#666666] text-sm">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
