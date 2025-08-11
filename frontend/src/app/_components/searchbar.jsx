"use client";
import Image from 'next/image';
import { useState } from 'react';

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Redirect to explore page with search term
      window.location.href = `/explore?search=${encodeURIComponent(searchTerm)}`;
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <div className="flex items-center bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        <Image 
          src="/search-icon.png" 
          alt="Search" 
          width={18} 
          height={18} 
          className="text-gray-400 mr-3" 
        />
        <input 
          type="text" 
          placeholder="Search destinations, trips..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none flex-1 text-gray-700 placeholder-gray-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
