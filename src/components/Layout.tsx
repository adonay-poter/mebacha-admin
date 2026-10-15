import React, { useState } from 'react';
import {
  Home,
  LayoutDashboard,
  Store,
  Bug,
  LogOut,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import mebachaLogo from '../assets/mebacha-1000.png';

interface LayoutProps {
  currentView: 'home' | 'analytics' | 'dashboard' | 'shops' | 'shop-detail' | 'triage';
  onNavigate: (view: 'home' | 'analytics' | 'dashboard' | 'shops' | 'triage') => void;
  user: User | null;
  onSignOut: () => void;
  onRefresh?: () => void;
  children: React.ReactNode;
  activeShopName?: string;
  openIssuesCount?: number;
  needsAttentionCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  currentView,
  onNavigate,
  user,
  onSignOut,
  onRefresh,
  children,
  activeShopName,
  openIssuesCount = 0,
  needsAttentionCount = 0,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const navItems = [
    {
      id: 'home' as const,
      label: 'HOME OVERVIEW',
      icon: Home,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'analytics' as const,
      label: 'CHARTS & STATS',
      icon: BarChart3,
      badge: 'LIVE',
      badgeColor: 'bg-[#006838] text-white',
    },
    {
      id: 'dashboard' as const,
      label: 'PILOT SCORECARD',
      icon: LayoutDashboard,
      badge: needsAttentionCount > 0 ? `${needsAttentionCount} ALERT` : null,
      badgeColor: 'bg-[#DC2626] text-white',
    },
    {
      id: 'shops' as const,
      label: 'MERCHANTS & FLEET',
      icon: Store,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'triage' as const,
      label: 'INCIDENTS & TRIAGE',
      icon: Bug,
      badge: openIssuesCount > 0 ? `${openIssuesCount}` : null,
      badgeColor: 'bg-[#866128] text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#14181D] flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar (Freight Logistics Layout) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#D1D5DB] bg-[#FFFFFF] p-5 shrink-0 md:sticky md:top-0 md:h-screen md:self-start overflow-y-auto justify-between z-20">
        <div className="space-y-6">
          {/* Logo & Operations Brand Block */}
          <div className="flex items-center space-x-3 pb-5 border-b border-[#D1D5DB]">
            <div className="w-10 h-10 bg-white border border-[#D1D5DB] rounded-[4px] flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <img src={mebachaLogo} alt="Mebacha Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-bold text-lg tracking-wider text-[#14181D] uppercase">MEBACHA</span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-[#E6F4EC] text-[#006838] border border-[#A7F3D0] rounded-[2px]">
                  PORTAL
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#5A6470] tracking-tight uppercase">Admin & Pilot v2.4</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || (item.id === 'shops' && currentView === 'shop-detail');
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono font-semibold tracking-wide transition-all min-h-[44px] rounded-[4px] border ${
                    isActive
                      ? 'bg-[#14181D] text-white border-[#14181D] shadow-sm'
                      : 'bg-[#FFFFFF] text-[#5A6470] border-transparent hover:border-[#D1D5DB] hover:bg-[#F4F6F8] hover:text-[#14181D]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#006838]' : 'text-[#5A6470]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 font-mono font-bold rounded-[2px] ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-4 border-t border-[#D1D5DB] space-y-3 mt-auto">
          <div className="p-3 bg-[#F4F6F8] border border-[#D1D5DB] rounded-[4px] flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#006838] text-white flex items-center justify-center font-bold text-xs rounded-[2px]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono font-bold text-[#14181D] truncate">
                {user?.email || 'admin@mebacha.com'}
              </p>
              <p className="text-[9px] font-mono text-[#5A6470] uppercase">Mebacha Admin Guard</p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono font-semibold uppercase text-[#5A6470] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-[#D1D5DB] hover:border-[#FCA5A5] rounded-[4px] bg-[#FFFFFF] transition min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#D1D5DB] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Branding */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-white border border-[#D1D5DB] rounded-[4px] flex items-center justify-center p-1 shadow-sm shrink-0">
                <img src={mebachaLogo} alt="Mebacha Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-bold text-base text-[#14181D] tracking-wider uppercase">Mebacha Ops</span>
            </div>

            {/* Desktop Breadcrumb */}
            <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-[#5A6470]">
              <span className="font-semibold text-[#14181D]">MEBACHA</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span className="text-[#006838] font-bold uppercase">
                {currentView === 'shop-detail'
                  ? `Counter // ${activeShopName || ''}`
                  : currentView === 'home'
                  ? 'Home Overview'
                  : currentView === 'analytics'
                  ? 'Charts & Statistics'
                  : currentView === 'dashboard'
                  ? 'Pilot Scorecard'
                  : currentView}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                title="Refresh Live Data"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-semibold uppercase text-[#14181D] bg-[#FFFFFF] hover:bg-[#F4F6F8] border border-[#D1D5DB] hover:border-[#5A6470] rounded-[4px] transition min-h-[36px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#006838]' : ''}`} />
                <span className="hidden sm:inline">Sync Live Data</span>
              </button>
            )}

            <div className="hidden sm:flex items-center px-2.5 py-1 text-[11px] font-mono font-semibold uppercase text-[#004D2A] bg-[#E6F4EC] border border-[#A7F3D0] rounded-[3px]">
              <span className="w-2 h-2 bg-[#006838] mr-2 inline-block rounded-full animate-pulse"></span>
              Live Supabase
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#D1D5DB] px-2 py-1 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'shops' && currentView === 'shop-detail');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-all relative min-h-[48px] ${
                isActive ? 'text-[#006838] font-bold bg-[#E6F4EC] rounded-[4px]' : 'text-[#5A6470] font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-[#006838]' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-[#006838] rounded-full border border-white" />
                )}
              </div>
              <span className="text-[10px] mt-1 font-mono tracking-wider uppercase truncate max-w-[80px]">
                {item.id === 'home'
                  ? 'Home'
                  : item.id === 'analytics'
                  ? 'Charts'
                  : item.id === 'dashboard'
                  ? 'Pilot'
                  : item.id === 'shops'
                  ? 'Fleet'
                  : 'Triage'}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
