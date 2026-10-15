import React from 'react';
import {
  Users,
  Store,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldAlert,
  Layers,
  ChevronRight,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { Shop, Sale, PilotTouchpoint, PilotIssue } from '../types';
import { getDaysRemaining } from '../lib/engagement';

interface DashboardViewProps {
  shops: Shop[];
  sales: Sale[];
  touchpoints: PilotTouchpoint[];
  issues: PilotIssue[];
  totalUserCount: number;
  onSelectShop: (shopId: string) => void;
  onNavigateToShops: () => void;
  onNavigateToTriage: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shops,
  sales,
  touchpoints,
  issues,
  totalUserCount,
  onSelectShop,
  onNavigateToShops,
  onNavigateToTriage,
}) => {
  const pilotShops = shops.filter((s) => s.is_pilot);
  const totalShopsCount = shops.length;

  // Subscription breakdown
  const freeShops = shops.filter((s) => s.plan_tier === 'free');
  const starterShops = shops.filter((s) => s.plan_tier === 'starter');
  const proPaidShops = shops.filter((s) => s.plan_tier === 'pro' && !s.is_pilot);
  const proPilotShops = shops.filter((s) => s.plan_tier === 'pro' && s.is_pilot);

  // Expiring in <= 7 days
  const expiringSoonShops = shops.filter((s) => {
    const days = getDaysRemaining(s.plan_expires_at);
    return days !== null && days >= 0 && days <= 7;
  });

  // Persona counts
  const soloOwners = pilotShops.filter((s) => s.persona_type === 'solo_owner');
  const staffOwners = pilotShops.filter((s) => s.persona_type === 'staff_1_to_4');
  const socialSellers = pilotShops.filter((s) => s.persona_type === 'social_seller');

  // Success Scorecard Calculations
  const activatedShops = pilotShops.filter((s) => {
    const start = new Date(s.pilot_started_at || s.created_at).getTime();
    const shopSales = sales.filter((sale) => sale.shop_id === s.id);
    return shopSales.some((sale) => {
      const saleTime = new Date(sale.created_at).getTime();
      const diffHours = (saleTime - start) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 48;
    });
  });
  const activationPct = pilotShops.length ? Math.round((activatedShops.length / pilotShops.length) * 100) : 0;

  const habitShops = pilotShops.filter((s) => {
    const start = new Date(s.pilot_started_at || s.created_at).getTime();
    const day7 = start + 7 * 24 * 60 * 60 * 1000;
    const shopSales = sales.filter((sale) => {
      const t = new Date(sale.created_at).getTime();
      return sale.shop_id === s.id && t >= start && t <= day7;
    });
    const days = new Set(shopSales.map((sale) => new Date(sale.created_at).toISOString().split('T')[0]));
    return days.size >= 5;
  });
  const earlyHabitPct = pilotShops.length ? Math.round((habitShops.length / pilotShops.length) * 100) : 0;

  const depthShops = pilotShops.filter((s) => {
    let count = 0;
    if ((s.product_count || 0) > 0) count++;
    if ((s.sale_count || 0) > 0) count++;
    if ((s.debt_count || 0) > 0) count++;
    if (s.catalog_status === 'active' || s.has_catalog) count++;
    return count >= 3;
  });
  const featureDepthPct = pilotShops.length ? Math.round((depthShops.length / pilotShops.length) * 100) : 0;

  const sustainedShops = pilotShops.filter((s) => {
    const start = new Date(s.pilot_started_at || s.created_at).getTime();
    const day22 = start + 22 * 24 * 60 * 60 * 1000;
    const day30 = start + 30 * 24 * 60 * 60 * 1000;
    const w4Sales = sales.filter((sale) => {
      const t = new Date(sale.created_at).getTime();
      return sale.shop_id === s.id && t >= day22 && t <= day30;
    });
    return w4Sales.length > 0;
  });
  const sustainedUsePct = pilotShops.length ? Math.round((sustainedShops.length / pilotShops.length) * 100) : 0;

  const conversionIntentShops = pilotShops.filter(
    (s) => s.would_they_pay === 'yes' || s.would_they_pay === 'maybe'
  );
  const conversionIntentPct = pilotShops.length
    ? Math.round((conversionIntentShops.length / pilotShops.length) * 100)
    : 0;

  const feedbackCompleteShops = pilotShops.filter((s) => {
    const daysLogged = touchpoints.filter((t) => t.shop_id === s.id).map((t) => t.touchpoint_day);
    return daysLogged.includes('Day 7') || daysLogged.includes('Day 30') || daysLogged.length >= 2;
  });
  const feedbackCompletenessPct = pilotShops.length
    ? Math.round((feedbackCompleteShops.length / pilotShops.length) * 100)
    : 0;

  // Needs Attention List
  const needsAttentionList = shops
    .map((shop) => {
      const reasons: string[] = [];
      const daysRemaining = getDaysRemaining(shop.plan_expires_at);

      if (shop.computed_tier === 'red') {
        reasons.push('Engagement Tier: Red');
      } else if (shop.computed_tier === 'yellow') {
        reasons.push('Engagement Tier: Yellow (Gap in usage)');
      }

      if (daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
        reasons.push(`Pilot expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`);
      }

      if (shop.has_open_blocker) {
        reasons.push('Active blocker defect open');
      }

      const start = new Date(shop.pilot_started_at || shop.created_at).getTime();
      const ageDays = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      const scheduledDays = [1, 3, 7, 14, 21, 30];

      if (scheduledDays.includes(ageDays)) {
        const logged = touchpoints.some(
          (t) => t.shop_id === shop.id && t.touchpoint_day === `Day ${ageDays}`
        );
        if (!logged) {
          reasons.push(`Day ${ageDays} check-in due today`);
        }
      }

      return {
        shop,
        reasons,
        isUrgent: shop.computed_tier === 'red' || (daysRemaining !== null && daysRemaining <= 2),
      };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));

  return (
    <div className="space-y-6">
      {/* Top Banner (Freight Logistics Operational Manifest) */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-[#E6F4EC] text-[#006838] border border-[#A7F3D0] rounded-[2px]">
              PILOT DISPATCH SCORECARD
            </span>
            <span className="text-xs font-mono text-[#5A6470] uppercase">Operations Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#14181D] tracking-wide uppercase leading-tight">
            Decision Hub & Fleet Control
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#5A6470] mt-1.5 max-w-2xl leading-relaxed">
            Real-time quantitative gate metrics, merchant onboarding cohort mix, and priority field intervention queues.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={onNavigateToShops}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#006838] hover:bg-[#004D2A] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-[4px] border border-[#004D2A] shadow-sm transition min-h-[42px]"
          >
            <Store className="w-4 h-4" />
            <span>Merchant Fleet ({totalShopsCount})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Freight Industrial Density) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Accounts */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Fleet / Users</span>
            <Users className="w-4 h-4 text-[#14181D]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-display font-bold text-[#14181D] leading-none">{totalShopsCount}</span>
              <span className="text-xs font-mono text-[#5A6470]">/ {totalUserCount} profiles</span>
            </div>
            <p className="text-[11px] font-mono text-[#006838] uppercase mt-2 font-medium">
              ● {pilotShops.length} in 30-day pilot cohort
            </p>
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Plan Distribution</span>
            <Layers className="w-4 h-4 text-[#14181D]" />
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#5A6470]">Pro Pilot:</span>
              <span className="font-bold text-[#006838]">{proPilotShops.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A6470]">Pro (Paid):</span>
              <span className="font-bold text-[#14181D]">{proPaidShops.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A6470]">Starter / Free:</span>
              <span className="font-bold text-[#5A6470]">{starterShops.length} / {freeShops.length}</span>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Expiring ≤ 7 Days</span>
            <Clock className={`w-4 h-4 ${expiringSoonShops.length > 0 ? 'text-[#866128]' : 'text-[#5A6470]'}`} />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl sm:text-4xl font-display font-bold leading-none ${expiringSoonShops.length > 0 ? 'text-[#866128]' : 'text-[#14181D]'}`}>
                {expiringSoonShops.length}
              </span>
              <span className="text-xs font-mono text-[#5A6470] uppercase">merchants</span>
            </div>
            <p className="text-[11px] font-mono text-[#5A6470] mt-2">
              Scheduled for exit debriefs
            </p>
          </div>
        </div>

        {/* Open Blockers */}
        <div
          onClick={onNavigateToTriage}
          className="bg-[#FFFFFF] border border-[#D1D5DB] hover:border-[#DC2626] rounded-[6px] p-4 flex flex-col justify-between cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Critical Defects</span>
            <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-display font-bold text-[#DC2626] leading-none">
                {issues.filter((i) => i.severity === 'blocker' && i.status !== 'resolved').length}
              </span>
              <span className="text-xs font-mono text-[#5A6470] uppercase">blockers</span>
            </div>
            <p className="text-[11px] font-mono text-[#DC2626] mt-2 font-medium">
              Auto-flags shop tier to Red
            </p>
          </div>
        </div>
      </div>

      {/* Pilot Cohort Mix Progress Bar */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-display font-bold text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#006838]" />
            <span>Pilot Cohort Target Quotas</span>
            <span className="text-xs font-mono font-medium text-[#5A6470]">
              [{pilotShops.length} of 40 Registered]
            </span>
          </h2>
          <p className="text-xs font-sans text-[#5A6470] mt-1">
            Target benchmark: 15 Solo Owners, 15 Owners with 1–4 Staff, 10 Social/Telegram Sellers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Solo Owners */}
          <div className="bg-[#F4F6F8] p-3.5 border border-[#D1D5DB] rounded-[4px]">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="font-semibold text-[#14181D] uppercase">Solo Owners</span>
              <span className="text-[#5A6470] font-bold">{soloOwners.length} / 15</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2.5 rounded-[2px] overflow-hidden">
              <div
                className="bg-[#006838] h-full rounded-[2px]"
                style={{ width: `${Math.min(100, (soloOwners.length / 15) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470] mt-1.5">
              {Math.round((soloOwners.length / 15) * 100)}% quota target
            </p>
          </div>

          {/* 1-4 Staff */}
          <div className="bg-[#F4F6F8] p-3.5 border border-[#D1D5DB] rounded-[4px]">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="font-semibold text-[#14181D] uppercase">1–4 Staff Members</span>
              <span className="text-[#5A6470] font-bold">{staffOwners.length} / 15</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2.5 rounded-[2px] overflow-hidden">
              <div
                className="bg-[#006838] h-full rounded-[2px]"
                style={{ width: `${Math.min(100, (staffOwners.length / 15) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470] mt-1.5">
              {Math.round((staffOwners.length / 15) * 100)}% quota target
            </p>
          </div>

          {/* Social Sellers */}
          <div className="bg-[#F4F6F8] p-3.5 border border-[#D1D5DB] rounded-[4px]">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="font-semibold text-[#14181D] uppercase">Social Sellers</span>
              <span className="text-[#5A6470] font-bold">{socialSellers.length} / 10</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2.5 rounded-[2px] overflow-hidden">
              <div
                className="bg-[#866128] h-full rounded-[2px]"
                style={{ width: `${Math.min(100, (socialSellers.length / 10) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470] mt-1.5">
              {Math.round((socialSellers.length / 10) * 100)}% quota target
            </p>
          </div>
        </div>
      </div>

      {/* Pilot Success Scorecard */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 space-y-4 shadow-sm">
        <div>
          <h2 className="text-base font-display font-bold text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#006838]" />
            <span>Pilot Success Scorecard (Live PostgREST Gates)</span>
          </h2>
          <p className="text-xs font-sans text-[#5A6470] mt-0.5">
            Quantitative gates calculated live against actual Supabase merchant sales & touchpoint logs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Activation */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">1. Activation (48h)</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL ≥ 80%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${activationPct >= 80 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {activationPct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({activatedShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${activationPct >= 80 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, activationPct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">≥1 sale within 48h of counter start</p>
          </div>

          {/* 2. Early Habit */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">2. Early Habit</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL ≥ 60%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${earlyHabitPct >= 60 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {earlyHabitPct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({habitShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${earlyHabitPct >= 60 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, earlyHabitPct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">Sales on ≥5 of first 7 days</p>
          </div>

          {/* 3. Feature Depth */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">3. Feature Depth</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL ≥ 50%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${featureDepthPct >= 50 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {featureDepthPct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({depthShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${featureDepthPct >= 50 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, featureDepthPct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">Used ≥3 features (sales, debt, catalog)</p>
          </div>

          {/* 4. Sustained Use */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">4. Sustained (W4)</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL ≥ 50%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${sustainedUsePct >= 50 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {sustainedUsePct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({sustainedShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${sustainedUsePct >= 50 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, sustainedUsePct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">Active sales in Days 22–30</p>
          </div>

          {/* 5. Conversion Intent */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">5. Conversion Intent</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL ≥ 30%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${conversionIntentPct >= 30 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {conversionIntentPct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({conversionIntentShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${conversionIntentPct >= 30 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, conversionIntentPct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">Answered "Yes" or "Maybe" to pay</p>
          </div>

          {/* 6. Feedback Completeness */}
          <div className="bg-[#F4F6F8] p-4 border border-[#D1D5DB] rounded-[4px] space-y-2">
            <div className="flex justify-between items-start text-xs font-mono font-semibold uppercase">
              <span className="text-[#14181D]">6. Feedback Logged</span>
              <span className="px-1.5 py-0.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[10px] text-[#5A6470]">
                GOAL 100%
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-display font-bold ${feedbackCompletenessPct >= 90 ? 'text-[#006838]' : 'text-[#866128]'}`}>
                {feedbackCompletenessPct}%
              </span>
              <span className="text-xs font-mono text-[#5A6470]">({feedbackCompleteShops.length}/{pilotShops.length})</span>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-[2px] overflow-hidden">
              <div
                className={`h-full ${feedbackCompletenessPct >= 90 ? 'bg-[#006838]' : 'bg-[#866128]'}`}
                style={{ width: `${Math.min(100, feedbackCompletenessPct)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#5A6470]">Day 7 & Day 30 debrief logs complete</p>
          </div>
        </div>
      </div>

      {/* "Needs Attention Today" Queue */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D1D5DB] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-[#866128]" />
              <h2 className="text-base font-display font-bold text-[#14181D] uppercase tracking-wider">
                Needs Attention Dispatch Queue
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold uppercase bg-[#DC2626] text-white rounded-[2px]">
                {needsAttentionList.length} Action Items
              </span>
            </div>
            <p className="text-xs font-sans text-[#5A6470] mt-1">
              Field intervention list: Red/Yellow engagement merchants, scheduled milestone follow-ups, and impending trial expirations.
            </p>
          </div>
        </div>

        {needsAttentionList.length === 0 ? (
          <div className="text-center py-10 bg-[#F4F6F8] border border-[#D1D5DB] rounded-[4px]">
            <CheckCircle2 className="w-8 h-8 text-[#006838] mx-auto mb-2" />
            <p className="text-xs font-mono uppercase text-[#14181D] font-bold">All pilot merchants operating smoothly</p>
          </div>
        ) : (
          <div className="space-y-2">
            {needsAttentionList.map(({ shop, reasons, isUrgent }) => (
              <div
                key={shop.id}
                onClick={() => onSelectShop(shop.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-[4px] cursor-pointer hover:border-[#5A6470] transition ${
                  isUrgent ? 'bg-[#FEF2F2] border-[#FCA5A5]' : 'bg-[#FFFFFF] border-[#D1D5DB]'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-[#14181D] uppercase truncate">{shop.name}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-[#F4F6F8] border border-[#D1D5DB] text-[#5A6470] rounded-[2px]">
                      {shop.city || 'Addis Ababa'}
                    </span>
                    {shop.computed_tier && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          shop.computed_tier === 'green'
                            ? 'bg-[#006838]'
                            : shop.computed_tier === 'yellow'
                            ? 'bg-[#866128]'
                            : 'bg-[#DC2626]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((r, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#FFFFFF] border border-[#D1D5DB] text-[#5A6470] rounded-[2px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 mt-3 sm:mt-0 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShop(shop.id);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#006838] hover:bg-[#004D2A] text-white text-xs font-mono font-semibold uppercase transition rounded-[4px] border border-[#004D2A] shadow-sm"
                  >
                    <span>Counter Manifest</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
