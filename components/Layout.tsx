import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, FileText, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import clsx from 'clsx';
import { AppTheme } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const themes: Record<AppTheme, { bg: string, sidebar: string, text: string, primary: string, accent: string }> = {
  blue: { bg: 'bg-slate-50', sidebar: 'bg-blue-600', text: 'text-slate-900', primary: 'text-blue-600', accent: 'bg-blue-100' },
  green: { bg: 'bg-stone-50', sidebar: 'bg-emerald-700', text: 'text-stone-900', primary: 'text-emerald-700', accent: 'bg-emerald-100' },
  purple: { bg: 'bg-fuchsia-50', sidebar: 'bg-purple-700', text: 'text-slate-900', primary: 'text-purple-700', accent: 'bg-purple-100' },
  dark: { bg: 'bg-gray-900', sidebar: 'bg-gray-800', text: 'text-gray-100', primary: 'text-blue-400', accent: 'bg-gray-700' },
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const profile = useLiveQuery(() => db.settings.get(1));
  const currentTheme = themes[profile?.theme || 'blue'];
  const isDark = profile?.theme === 'dark';

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'New Bill', path: '/billing', icon: ShoppingCart },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Parties', path: '/parties', icon: Users },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    document.body.className = currentTheme.bg + (isDark ? ' text-white' : ' text-slate-900');
  }, [currentTheme, isDark]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${currentTheme.bg}`}>
      <header className={`${currentTheme.sidebar} text-white shadow-xl sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 py-3">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                   <FileText className="w-6 h-6" />
                </div>
                {profile?.companyName || 'Gopi Distributors'}
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-full text-sm font-medium transition-all duration-200',
                    isActive(item.path)
                      ? 'bg-white/20 text-white shadow-inner backdrop-blur-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:bg-white/10 p-2 rounded-full focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/20 backdrop-blur-lg pb-4">
            <div className="px-2 pt-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    'block px-4 py-3 rounded-2xl text-base font-medium',
                    isActive(item.path)
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className={`${isDark ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-slate-200'} py-8 mt-auto transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Created by Yash K Pathak
          </p>
          <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            &copy; {new Date().getFullYear()} {profile?.companyName || 'Gopi Distributors'}
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
            Wholesale Billing System v3.0 • High Performance Engine
          </p>
        </div>
      </footer>
    </div>
  );
};