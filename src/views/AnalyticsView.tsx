import React, { useState, useMemo } from 'react';
import {
  Activity,
  CalendarRange,
  TrendingUp,
  CreditCard,
  Users,
  Store,
  ArrowRight,
  BarChart2,
  PieChart,
  ShoppingBag,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Shop, Sale, Product } from '../types';
import { formatETB, formatDate } from '../lib/engagement';

interface AnalyticsViewProps {
  shops: Shop[];
  sales: Sale[];
  products: Product[];
  onSelectShop: (shopId: string) => void;
  onNavigateToShops: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  shops,
  sales,
  products,
  onSelectShop,
  onNavigateToShops,
}) => {
  const [chartMetric, setChartMetric] = useState<'users' | 'revenue'>('users');
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: string; count: number } | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '7d'>('all');

  const now = Date.now();
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const d30 = now - 30 * 24 * 60 * 60 * 1000;

  // Filter both sales AND shops by the active time window
  const activeSales = useMemo(() => {
    return sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      if (timeFilter === '7d') return t >= d7;
      if (timeFilter === '30d') return t >= d30;
      return true;
    });
  }, [sales, timeFilter, d7, d30]);

  const activeShops = useMemo(() => {
    return shops.filter((s) => {
      const t = new Date(s.created_at).getTime();
      if (timeFilter === '7d') return t >= d7;
      if (timeFilter === '30d') return t >= d30;
      return true;
    });
  }, [shops, timeFilter, d7, d30]);

  // Aggregate KPI highlights for the selected timeframe
  const periodGMV = useMemo(() => activeSales.reduce((acc, s) => acc + Number(s.total || 0), 0), [activeSales]);
  const periodSalesCount = activeSales.length;
  const periodNewMerchants = activeShops.length;
  const periodAvgTicket = periodSalesCount > 0 ? Math.round(periodGMV / periodSalesCount) : 0;

  // Time-Series Graph Generation: Adapts based on timeFilter
  // 7d: Daily breakdown (7 bars)
  // 30d: 5-day / weekly breakdown (5-6 bars)
  // all: Weekly breakdown across lifetime
  const timeSeriesData = useMemo(() => {
    if (timeFilter === '7d') {
      // 7 Daily bins
      const daysMap: { [key: string]: { label: string; newUsers: number; revenue: number; salesCount: number; timestamp: number } } = {};
      
      // Initialize past 7 days chronologically
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = dayDate.toISOString().split('T')[0];
        const label = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        daysMap[key] = { label, newUsers: 0, revenue: 0, salesCount: 0, timestamp: dayDate.getTime() };
      }

      activeShops.forEach((s) => {
        const key = new Date(s.created_at).toISOString().split('T')[0];
        if (daysMap[key]) {
          daysMap[key].newUsers += 1;
        }
      });

      activeSales.forEach((s) => {
        const key = new Date(s.created_at).toISOString().split('T')[0];
        if (daysMap[key]) {
          daysMap[key].revenue += Number(s.total || 0);
          daysMap[key].salesCount += 1;
        }
      });

      return Object.values(daysMap);
    }

    if (timeFilter === '30d') {
      // Group by 4 distinct 7-day intervals
      const intervalMap: { [key: string]: { label: string; newUsers: number; revenue: number; salesCount: number; timestamp: number } } = {};
      
      for (let i = 3; i >= 0; i--) {
        const intervalEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
        const intervalStart = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const key = `week-${i}`;
        const label = `${intervalStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${intervalEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        intervalMap[key] = { label, newUsers: 0, revenue: 0, salesCount: 0, timestamp: intervalStart.getTime() };
      }

      activeShops.forEach((s) => {
        const t = new Date(s.created_at).getTime();
        for (let i = 3; i >= 0; i--) {
          const end = now - i * 7 * 24 * 60 * 60 * 1000;
          const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
          if (t >= start && t <= end) {
            intervalMap[`week-${i}`].newUsers += 1;
            break;
          }
        }
      });

      activeSales.forEach((s) => {
        const t = new Date(s.created_at).getTime();
        for (let i = 3; i >= 0; i--) {
          const end = now - i * 7 * 24 * 60 * 60 * 1000;
          const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
          if (t >= start && t <= end) {
            intervalMap[`week-${i}`].revenue += Number(s.total || 0);
            intervalMap[`week-${i}`].salesCount += 1;
            break;
          }
        }
      });

      return Object.values(intervalMap);
    }

    // "All Time": Full weekly progression
    const weeks: { [key: string]: { label: string; newUsers: number; revenue: number; salesCount: number; timestamp: number } } = {};
    
    shops.forEach((s) => {
      const d = new Date(s.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      if (!weeks[key]) {
        weeks[key] = { label, newUsers: 0, revenue: 0, salesCount: 0, timestamp: weekStart.getTime() };
      }
      weeks[key].newUsers += 1;
    });

    sales.forEach((s) => {
      const d = new Date(s.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      if (!weeks[key]) {
        weeks[key] = { label, newUsers: 0, revenue: 0, salesCount: 0, timestamp: weekStart.getTime() };
      }
      weeks[key].revenue += Number(s.total || 0);
      weeks[key].salesCount += 1;
    });

    return Object.values(weeks).sort((a, b) => a.timestamp - b.timestamp);
  }, [timeFilter, activeShops, activeSales, shops, sales, now]);

  // Payment Breakdown for active timeframe
  const paymentBreakdown = useMemo(() => {
    let cashCount = 0;
    let cashVolume = 0;
    let telebirrCount = 0;
    let telebirrVolume = 0;

    activeSales.forEach((s) => {
      const isTelebirr = s.payment_method?.toUpperCase().includes('TELEBIRR') || s.payment_method?.toUpperCase().includes('MOBILE');
      const val = Number(s.total || 0);
      if (isTelebirr) {
        telebirrCount++;
        telebirrVolume += val;
      } else {
        cashCount++;
        cashVolume += val;
      }
    });

    return {
      cash: { count: cashCount, volume: cashVolume, pct: activeSales.length ? Math.round((cashCount / activeSales.length) * 100) : 0 },
      telebirr: { count: telebirrCount, volume: telebirrVolume, pct: activeSales.length ? Math.round((telebirrCount / activeSales.length) * 100) : 0 },
    };
  }, [activeSales]);

  // Subscription Cohort Mix for active timeframe
  const planBreakdown = useMemo(() => {
    const targetShops = timeFilter === 'all' ? shops : activeShops;
    const counts = { free: 0, starter: 0, pro_pilot: 0, pro_paid: 0 };
    targetShops.forEach((s) => {
      if (s.plan_tier === 'pro') {
        if (s.is_pilot) counts.pro_pilot++;
        else counts.pro_paid++;
      } else if (s.plan_tier === 'starter') {
        counts.starter++;
      } else {
        counts.free++;
      }
    });
    return { counts, total: targetShops.length };
  }, [shops, activeShops, timeFilter]);

  // City Cluster Density for active timeframe
  const cityBreakdown = useMemo(() => {
    const targetShops = timeFilter === 'all' ? shops : activeShops;
    const counts: Record<string, number> = {};
    targetShops.forEach((s) => {
      const city = s.city || 'Addis Ababa';
      counts[city] = (counts[city] || 0) + 1;
    });
    return { counts, total: targetShops.length };
  }, [shops, activeShops, timeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-[#E6F4EC] text-[#006838] border border-[#A7F3D0] rounded-[2px]">
              DATA & ANALYTICS INTELLIGENCE
            </span>
            <span className="text-xs font-mono text-[#5A6470] uppercase">Decision Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#14181D] tracking-wide uppercase leading-tight">
            Decision Analytics & Growth Graphs
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#5A6470] mt-1.5 max-w-2xl leading-relaxed">
            Time-series trajectories, user acquisition velocity, gross merchandise volume curves, and settlement method analytics.
          </p>
        </div>

        {/* Global Time Filter Button Group */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#5A6470]" />
          <div className="inline-flex rounded-[4px] border border-[#D1D5DB] p-0.5 bg-[#F4F6F8]">
            <button
              onClick={() => {
                setTimeFilter('7d');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeFilter === '7d' ? 'bg-[#006838] text-white shadow-xs' : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => {
                setTimeFilter('30d');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeFilter === '30d' ? 'bg-[#006838] text-white shadow-xs' : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => {
                setTimeFilter('all');
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeFilter === 'all' ? 'bg-[#006838] text-white shadow-xs' : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Selected Timeframe Highlights Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm">
          <div className="text-[11px] font-mono text-[#5A6470] uppercase">
            {timeFilter === '7d' ? '7-Day Onboarded Users' : timeFilter === '30d' ? '30-Day Onboarded Users' : 'Total Registered Users'}
          </div>
          <div className="text-2xl font-display font-bold text-[#14181D] mt-1">
            {periodNewMerchants}
          </div>
          <div className="text-[10px] font-mono text-[#006838] mt-1">
            Active in chosen window
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm">
          <div className="text-[11px] font-mono text-[#5A6470] uppercase">
            {timeFilter === '7d' ? '7-Day Gross GMV' : timeFilter === '30d' ? '30-Day Gross GMV' : 'Lifetime Gross GMV'}
          </div>
          <div className="text-2xl font-display font-bold text-[#006838] mt-1 truncate">
            {formatETB(periodGMV)}
          </div>
          <div className="text-[10px] font-mono text-[#5A6470] mt-1">
            {periodSalesCount} receipts recorded
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm">
          <div className="text-[11px] font-mono text-[#5A6470] uppercase">
            Average Order Ticket
          </div>
          <div className="text-2xl font-display font-bold text-[#14181D] mt-1">
            {formatETB(periodAvgTicket)}
          </div>
          <div className="text-[10px] font-mono text-[#5A6470] mt-1">
            Per sale in window
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm">
          <div className="text-[11px] font-mono text-[#5A6470] uppercase">
            Digital Settlement Ratio
          </div>
          <div className="text-2xl font-display font-bold text-[#866128] mt-1">
            {paymentBreakdown.telebirr.pct}%
          </div>
          <div className="text-[10px] font-mono text-[#5A6470] mt-1">
            Telebirr vs Cash
          </div>
        </div>
      </div>

      {/* Main Growth Graph Card */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D1D5DB] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#006838]" />
              <h2 className="text-base font-display font-bold text-[#14181D] uppercase tracking-wider">
                Trajectory Curve ({timeFilter === '7d' ? 'Daily Breakdown' : timeFilter === '30d' ? 'Weekly Interval' : 'All-Time Trajectory'})
              </h2>
            </div>
            <p className="text-xs font-sans text-[#5A6470] mt-1">
              Data points adapt dynamically to the {timeFilter === '7d' ? '7-day' : timeFilter === '30d' ? '30-day' : 'all-time'} timeframe selection.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-[#5A6470] uppercase">Graph Mode:</span>
            <div className="inline-flex rounded-[4px] border border-[#D1D5DB] p-0.5 bg-[#F4F6F8]">
              <button
                onClick={() => setChartMetric('users')}
                className={`px-3 py-1 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                  chartMetric === 'users'
                    ? 'bg-[#14181D] text-white shadow-xs'
                    : 'text-[#5A6470] hover:text-[#14181D]'
                }`}
              >
                Users Added
              </button>
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                  chartMetric === 'revenue'
                    ? 'bg-[#006838] text-white shadow-xs'
                    : 'text-[#5A6470] hover:text-[#14181D]'
                }`}
              >
                GMV Sales (ETB)
              </button>
            </div>
          </div>
        </div>

        {/* Hover Inspector Tooltip Pill */}
        <div className="flex items-center justify-between bg-[#F4F6F8] border border-[#D1D5DB] rounded-[4px] px-3.5 py-2 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <CalendarRange className="w-4 h-4 text-[#006838]" />
            <span className="text-[#5A6470]">INSPECTOR:</span>
            <span className="font-bold text-[#14181D]">
              {hoveredPoint ? hoveredPoint.label : 'Hover over any bar below to view exact period volume'}
            </span>
          </div>
          {hoveredPoint && (
            <div className="font-bold text-[#006838]">
              {hoveredPoint.value}
            </div>
          )}
        </div>

        {/* Dynamic Graphic Bars */}
        <div className="pt-2 pb-2">
          {timeSeriesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs font-mono text-[#5A6470]">
              No transactions or merchant registrations found in this timeframe.
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col justify-between">
              <div className="flex-1 flex items-end gap-2 sm:gap-4 px-2 pt-6 pb-2 border-b border-[#D1D5DB]">
                {(() => {
                  const maxVal = chartMetric === 'users'
                    ? Math.max(...timeSeriesData.map((d) => d.newUsers), 1)
                    : Math.max(...timeSeriesData.map((d) => d.revenue), 1);

                  return timeSeriesData.map((pt, idx) => {
                    const currentVal = chartMetric === 'users' ? pt.newUsers : pt.revenue;
                    const heightPct = currentVal === 0 ? 4 : Math.max(8, Math.round((currentVal / maxVal) * 100));

                    const formattedValue = chartMetric === 'users'
                      ? `${pt.newUsers} Merchants Added`
                      : `${formatETB(pt.revenue)} (${pt.salesCount} receipts)`;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredPoint({ label: pt.label, value: formattedValue, count: currentVal })}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[48px] rounded-t-[3px] transition-all duration-200 group-hover:brightness-110 ${
                            currentVal === 0
                              ? 'bg-[#E5E7EB]'
                              : chartMetric === 'users'
                              ? 'bg-[#14181D] group-hover:bg-[#006838]'
                              : 'bg-[#006838] group-hover:bg-[#004D2A]'
                          }`}
                        />

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#14181D] text-white text-[10px] font-mono px-2 py-0.5 rounded-[2px] pointer-events-none whitespace-nowrap shadow-md z-10">
                          {chartMetric === 'users' ? `${pt.newUsers}` : formatETB(pt.revenue)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between items-center gap-2 sm:gap-4 px-2 pt-2 text-[10px] font-mono text-[#5A6470] overflow-x-auto">
                {timeSeriesData.map((pt, idx) => (
                  <div key={idx} className="flex-1 text-center truncate">
                    {pt.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Gauges & Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Methods Ratio */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
            <h3 className="font-display font-bold text-sm text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-[#006838]" />
              <span>Settlement Mix ({timeFilter})</span>
            </h3>
            <span className="text-[10px] font-mono text-[#5A6470]">{activeSales.length} Total</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#5A6470]">Physical Cash</span>
                <span className="font-bold text-[#14181D]">
                  {paymentBreakdown.cash.pct}% ({paymentBreakdown.cash.count})
                </span>
              </div>
              <div className="w-full bg-[#E5E7EB] h-2.5 rounded-[2px] overflow-hidden">
                <div
                  className="bg-[#14181D] h-full rounded-[2px]"
                  style={{ width: `${paymentBreakdown.cash.pct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#5A6470]">
                Volume: {formatETB(paymentBreakdown.cash.volume)}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#006838] font-bold">Telebirr / Mobile QR</span>
                <span className="font-bold text-[#006838]">
                  {paymentBreakdown.telebirr.pct}% ({paymentBreakdown.telebirr.count})
                </span>
              </div>
              <div className="w-full bg-[#E5E7EB] h-2.5 rounded-[2px] overflow-hidden">
                <div
                  className="bg-[#006838] h-full rounded-[2px]"
                  style={{ width: `${paymentBreakdown.telebirr.pct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#5A6470]">
                Volume: {formatETB(paymentBreakdown.telebirr.volume)}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Plan Mix */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
            <h3 className="font-display font-bold text-sm text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#866128]" />
              <span>Subscription Cohorts ({timeFilter})</span>
            </h3>
            <span className="text-[10px] font-mono text-[#5A6470]">{planBreakdown.total} Shops</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center p-2 bg-[#F4F6F8] rounded-[3px]">
              <span className="text-[#5A6470]">Pro Pilot (Free 30-Day):</span>
              <span className="font-bold text-[#006838]">{planBreakdown.counts.pro_pilot}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#F4F6F8] rounded-[3px]">
              <span className="text-[#5A6470]">Pro (Paid):</span>
              <span className="font-bold text-[#14181D]">{planBreakdown.counts.pro_paid}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#F4F6F8] rounded-[3px]">
              <span className="text-[#5A6470]">Starter Plan:</span>
              <span className="font-bold text-[#5A6470]">{planBreakdown.counts.starter}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#F4F6F8] rounded-[3px]">
              <span className="text-[#5A6470]">Free Tier:</span>
              <span className="font-bold text-[#5A6470]">{planBreakdown.counts.free}</span>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
            <h3 className="font-display font-bold text-sm text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
              <Store className="w-4 h-4 text-[#14181D]" />
              <span>City Cluster Density ({timeFilter})</span>
            </h3>
            <button
              onClick={onNavigateToShops}
              className="text-xs font-mono text-[#006838] hover:underline"
            >
              Fleet →
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {Object.entries(cityBreakdown.counts).map(([city, count]) => (
              <div key={city} className="flex justify-between items-center p-2 bg-[#F4F6F8] rounded-[3px]">
                <span className="text-[#14181D] font-medium">{city}</span>
                <span className="font-bold text-[#006838]">
                  {count} stores ({cityBreakdown.total > 0 ? Math.round((count / cityBreakdown.total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
