"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations('menu');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus management for menu
  useEffect(() => {
    if (isOpen) {
      // Focus first menu item when menu opens
      const firstItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLButtonElement;
      firstItem?.focus();

      // Trap focus within menu using Tab key
      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const focusableElements = menuRef.current?.querySelectorAll('[role="menuitem"]');
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLButtonElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLButtonElement;
            if (e.shiftKey && document.activeElement === firstElement) {
              lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: "/auth/signin", redirect: false });
    router.push("/auth/signin");
    router.refresh();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  if (!session) {
    return null;
  }

  const userInitial = session.user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors focus-ring"
        title={session.user?.email || 'User'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="用户菜单"
      >
        {userInitial}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-theme-surface rounded-lg shadow-lg border border-theme py-1 z-[9999]"
          role="menu"
          aria-label="用户菜单"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              // Return focus to trigger button
              (menuRef.current?.querySelector('button') as HTMLButtonElement)?.focus();
            }
          }}
        >
          <div className="px-4 py-2 border-b border-theme-subtle">
            <p className="text-sm font-medium text-theme-primary truncate">
              {session.user?.email}
            </p>
          </div>

          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-theme-surface/80 transition-colors focus-ring"
            role="menuitem"
          >
            {t('profile')}
          </button>

          <button
            onClick={() => handleNavigate('/settings')}
            className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-theme-surface/80 transition-colors focus-ring"
            role="menuitem"
          >
            {t('settings')}
          </button>

          {session.user?.role && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role) && (
            <button
              onClick={() => handleNavigate('/admin')}
              className="w-full text-left px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-theme-surface/80 transition-colors focus-ring"
              role="menuitem"
            >
              {t('admin')}
            </button>
          )}

          <div className="border-t border-theme-subtle my-1"></div>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-theme-surface/80 transition-colors focus-ring"
            role="menuitem"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
