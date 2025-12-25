import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, FileText, Menu, X, Settings as SettingsIcon, Monitor, Smartphone } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import clsx from 'clsx';
import { AppTheme, PlatformMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const themes: Record<AppTheme, { sidebar: string, text: string, primary: string, accent: string, active: string }> = {
  blue: { sidebar: 'bg-blue-600', text: 'text-slate-900', primary: 'text-blue-600', accent: 'bg-blue-50', active: 'bg-blue-600 text-white' },
  green: { sidebar: 'bg-emerald-600', text: 'text-stone-900', primary: 'text-emerald-700', accent: 'bg-emerald-50', active: 'bg-emerald-600 text-white' },
  purple: { sidebar: 'bg-purple-600', text: 'text-slate-900', primary: 'text-purple-700', accent: 'bg-purple-50', active: 'bg-purple-600 text-white' },
  dark: { sidebar: 'bg-gray-800', text: 'text-gray-100', primary: 'text-blue-400', accent: 'bg-gray-800', active: 'bg-blue-600 text-white' },
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profile = useLiveQuery(() => db.settings.get(1));
  
  // Platform & Theme Logic
  const [activePlatform, setActivePlatform] = useState<PlatformMode>('windows');
  
  useEffect(() => {
    if (profile) {
      // Handle Dark Mode
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = profile.darkMode === 'dark' || (profile.darkMode === 'system' && isSystemDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Handle Platform
      if (profile.platformMode === 'auto') {
        const isMobile = /Android|iPhone/i.test(navigator.userAgent);
        setActivePlatform(isMobile ? 'android' : 'windows');
      } else {
        setActivePlatform(profile.platformMode || 'windows');
      }
    }
  }, [profile]);

  const currentTheme = themes[profile?.theme || 'blue'];
  const isWindows = activePlatform === 'windows';

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'New Bill', path: '/billing', icon: ShoppingCart },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Parties', path: '/parties', icon: Users },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  // --- Windows 11 Style Components ---
  const WindowsSidebar = () => (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-gray-800 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg", currentTheme.sidebar)}>
          <FileText className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-tight dark:text-white">Gopi Dist.</span>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden',
              isActive(item.path) 
                ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-gray-700' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800/50'
            )}
          >
            {isActive(item.path) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md bg-blue-600"></div>}
            <item.icon className={clsx("w-5 h-5 mr-3 transition-colors", isActive(item.path) ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-gray-800">
         <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center">
               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AD</span>
            </div>
            <div className="text-xs">
               <div className="font-bold dark:text-white">Admin User</div>
               <div className="text-slate-500">v3.1 Win</div>
            </div>
         </div>
      </div>
    </aside>
  );

  // --- Android 11 Style Components ---
  const AndroidNav = () => (
    <>
      {/* Top Bar for Mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-50/95 dark:bg-gray-900/95 backdrop-blur-md z-40 flex items-center justify-between px-4 border-b border-slate-200 dark:border-gray-800">
         <span className="font-bold text-xl text-slate-800 dark:text-white tracking-wide">{profile?.companyName || 'Gopi'}</span>
         <div className="w-8 h-8 bg-blue-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-blue-600">
             <span className="font-bold text-xs">GD</span>
         </div>
      </div>

      {/* Desktop Rail */}
      <aside className="hidden md:flex flex-col w-24 h-screen fixed left-0 top-0 bg-slate-50 dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 z-50 items-center py-6">
        <div className="mb-8 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-700 dark:text-blue-400 shadow-sm">
          <FileText className="w-6 h-6" />
        </div>
        <nav className="flex-1 space-y-6 w-full px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center w-full group"
            >
              <div className={clsx(
                "w-14 h-9 rounded-2xl flex items-center justify-center mb-1 transition-all duration-300",
                isActive(item.path) 
                  ? "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 shadow-sm" 
                  : "hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400"
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={clsx("text-[11px] font-medium transition-colors", isActive(item.path) ? "text-slate-900 dark:text-white font-bold" : "text-slate-500 dark:text-slate-500")}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center h-20 px-2 pb-2">
          {navItems.slice(0, 5).map((item) => (
             <Link
             key={item.path}
             to={item.path}
             className="flex flex-col items-center justify-center w-full h-full"
           >
             <div className={clsx(
               "w-16 h-8 rounded-2xl flex items-center justify-center transition-all duration-300",
               isActive(item.path) 
                 ? "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100" 
                 : "text-slate-500 dark:text-slate-400"
             )}>
               <item.icon className="w-5 h-5" />
             </div>
             <span className={clsx("text-[10px] font-medium mt-1", isActive(item.path) ? "text-slate-900 dark:text-white" : "text-slate-500")}>{item.label}</span>
           </Link>
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <div className={clsx(
      "min-h-screen transition-colors duration-300",
      "bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100",
      isWindows ? "font-[Segoe UI,sans-serif]" : "font-[Roboto,sans-serif] tracking-wide" 
    )}>
      {isWindows ? <WindowsSidebar /> : <AndroidNav />}

      <main className={clsx(
        "flex-grow min-h-screen w-full transition-all duration-300",
        isWindows ? "md:pl-64" : "md:pl-24 pb-24 md:pb-0 pt-20 md:pt-0"
      )}>
        <div className={clsx(
          "max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500",
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Menu for Windows Mode */}
      {isWindows && (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      )}
       {isWindows && isMobileMenuOpen && (
          <div className="fixed inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-40 p-8 pt-20 animate-in slide-in-from-bottom-10">
              <div className="grid grid-cols-2 gap-4">
                  {navItems.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm">
                       <item.icon className="w-8 h-8 text-blue-600" />
                       <span className="font-bold">{item.label}</span>
                    </Link>
                  ))}
              </div>
          </div>
       )}
    </div>
  );
};