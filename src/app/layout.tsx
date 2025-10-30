import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Home, Users } from "lucide-react";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kibu Companion",
  description: "Voice + Smart Note Companion for Care Providers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 flex min-h-screen`}
      >
        <Toaster>
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </Toaster>
      </body>
    </html>
  );
}

// -----------------------------------------------------------------------------
// Sidebar Component
// -----------------------------------------------------------------------------
function Sidebar() {
  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "People", href: "/people", icon: Users },
  ];

  return (
    <nav className="w-56 h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col p-4">
      <h1 className="text-lg font-semibold mb-6 text-gray-800">
        Kibu Companion
      </h1>

      <div className="flex flex-col gap-2">
        {links.map(({ name, href, icon: Icon }) => (
          <Link
            key={name}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 transition"
          >
            <Icon size={18} />
            <span>{name}</span>
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-400">
        © {new Date().getFullYear()} Kibu Prototype
      </div>
    </nav>
  );
}