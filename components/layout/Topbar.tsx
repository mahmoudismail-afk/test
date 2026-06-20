'use client';

import Link from 'next/link';
import { Bell, Menu, Settings, Sun, Moon } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  role?: string;
  onMenuClick?: () => void;
}

export default function Topbar({ userName, userEmail, avatarUrl, role, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="topbar">
      {/* Mobile menu button — opens full sidebar for extra pages */}
      <button
        className="btn btn-ghost btn-icon topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Toggle menu"
        id="topbar-menu-btn"
      >
        <Menu size={20} />
      </button>



      <div className="topbar-actions">
        {mounted && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {/* Settings link — visible on mobile next to avatar */}
        <Link
          href="/settings"
          className={`btn btn-ghost btn-icon topbar-settings-btn ${pathname.startsWith('/settings') ? 'topbar-settings-active' : ''}`}
          aria-label="Settings"
          id="topbar-settings-btn"
        >
          <Settings size={20} />
        </Link>

        {/* Notifications */}
        <button
          className="btn btn-ghost btn-icon topbar-notif-btn"
          aria-label="Notifications"
          id="notif-btn"
        >
          <Bell size={20} />
          <span className="notif-dot" />
        </button>

        {/* User avatar */}
        <div className="topbar-user" id="topbar-user">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName ?? 'User'} className="avatar avatar-sm" />
          ) : (
            <div className="avatar avatar-sm">
              {getInitials(userName ?? 'U')}
            </div>
          )}
          <div className="topbar-user-info">
            <span className="topbar-user-name">{userName ?? 'Admin'}</span>
            {userEmail ? (
              <span className="topbar-user-email">{userEmail}</span>
            ) : (
              <span className="topbar-user-email" style={{
                color: role === 'admin' ? 'var(--primary-light)' : 'var(--success)',
                fontWeight: 600,
              }}>
                {role === 'admin' ? '👑 Admin' : '👷 Staff'}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
