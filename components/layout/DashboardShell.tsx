'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import {
  LayoutDashboard, Users, DollarSign, CreditCard,
  Receipt, ShoppingCart, History,
} from 'lucide-react';

// 5 most important pages for the bottom bar
const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard, id: 'dashboard' },
  { href: '/members',   label: 'Members',  icon: Users,           id: 'members' },
  { href: '/payments',  label: 'Payments', icon: DollarSign,      id: 'payments' },
  { href: '/plans',     label: 'Plans',    icon: CreditCard,      id: 'plans' },
  { href: '/history',   label: 'History',  icon: History,         id: 'history' },
];

interface DashboardShellProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  role: string;
  staffPermissions?: string[];
  children: React.ReactNode;
}

export default function DashboardShell({ userName, userEmail, avatarUrl, role, staffPermissions, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isAdmin = role === 'admin';

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleBottomNav = BOTTOM_NAV.filter(
    (item) => isAdmin || (staffPermissions ?? []).includes(item.id)
  );

  return (
    <CurrencyProvider>
      <div className="dashboard-shell">
        {/* Overlay backdrop for mobile sidebar (tablet only — phones use bottom nav) */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 350,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} role={role} staffPermissions={staffPermissions} />

        <div className="dashboard-main">
          <Topbar
            userName={userName}
            userEmail={userEmail}
            avatarUrl={avatarUrl}
            role={role}
            onMenuClick={() => setMobileOpen(prev => !prev)}
          />
          <main className="dashboard-content">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation bar (phones ≤768px) */}
        <nav className="mobile-bottom-nav">
          {visibleBottomNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </CurrencyProvider>
  );
}
