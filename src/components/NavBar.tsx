"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export default function NavBar() {
  const router = useRouter();

  return (
    <nav className="w-full bg-white border-b shadow-sm fixed top-0 left-0 right-0 z-50" style={{ borderColor: '#e0e0e0' }}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-lg font-semibold" style={{ color: '#333333' }}>
                Kibu Companion
              </h1>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-md transition text-sm"
              style={{ color: '#333333' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/features"
              className="px-3 py-2 rounded-md transition text-sm font-medium"
              style={{ color: '#333333' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Features
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

