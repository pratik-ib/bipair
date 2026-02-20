'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Plane, Ticket, Users,
  CreditCard, Bell, Settings, LogOut, Menu, X, Activity
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/flights', label: 'Flights', icon: Plane },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { href: '/admin/passengers', label: 'Passengers', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  username?: string;
}

export function Sidebar({ username }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
            style={isActive ? { backgroundColor: '#FF6600' } : {}}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-gray-950 border-r border-gray-800 min-h-screen">
        <div className="p-6 border-b border-gray-800">
          <div className="text-2xl font-black" style={{ color: '#FF6600' }}>BipAir</div>
          <div className="text-gray-500 text-xs mt-1">Management System</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-gray-400 text-xs mb-2 px-3">{username || 'admin'}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile hamburger */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        {open && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative flex flex-col w-64 bg-gray-950 border-r border-gray-800">
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="text-2xl font-black" style={{ color: '#FF6600' }}>BipAir</div>
                <button onClick={() => setOpen(false)} className="text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                <NavLinks />
              </nav>
              <div className="p-4 border-t border-gray-800">
                <div className="text-gray-400 text-xs mb-2 px-3">{username || 'admin'}</div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
