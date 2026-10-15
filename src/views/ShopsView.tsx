import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Clock,
  ShieldCheck,
  CreditCard,
  History,
  X,
  Loader2,
  Store,
  Plus,
} from 'lucide-react';
import type {
  Shop,
  PlanTier,
  SubscriptionStatus,
  SubscriptionAuditLog,
  PersonaType,
} from '../types';
import { formatETB, formatDate, getDaysRemaining } from '../lib/engagement';
import { supabase } from '../lib/supabase';

interface ShopsViewProps {
  shops: Shop[];
  onSelectShop: (shopId: string) => void;
  onRefreshShops: () => Promise<void>;
}

export const ShopsView: React.FC<ShopsViewProps> = ({
  shops,
  onSelectShop,
  onRefreshShops,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [personaFilter, setPersonaFilter] = useState<string>('all');

  // Register merchant modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCity, setRegCity] = useState('Addis Ababa');
  const [regPhone, setRegPhone] = useState('');
  const [regCategory, setRegCategory] = useState('Retail');
  const [regPersona, setRegPersona] = useState<PersonaType>('solo_owner');
  const [regPlan, setRegPlan] = useState<'pilot_pro' | 'free' | 'starter' | 'pro'>('pilot_pro');
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Plan override modal state
  const [managingShop, setManagingShop] = useState<Shop | null>(null);
  const [auditLogs, setAuditLogs] = useState<SubscriptionAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filter shops
  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.phone && shop.phone.includes(searchTerm)) ||
      (shop.category && shop.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlan =
      planFilter === 'all' ||
      (planFilter === 'pilot_pro' ? shop.plan_tier === 'pro' && shop.is_pilot : shop.plan_tier === planFilter);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pilot' ? shop.subscription_status === 'pilot_trial' : shop.subscription_status === statusFilter);

    const matchesTier = tierFilter === 'all' || shop.computed_tier === tierFilter;
    const matchesPersona = personaFilter === 'all' || shop.persona_type === personaFilter;

    return (
      matchesSearch &&
      matchesPlan &&
      matchesStatus &&
      matchesTier &&
      matchesPersona
    );
  });

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    setRegistering(true);
    setRegError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const ownerId = authData?.user?.id || '0405b865-85a4-40d7-b372-17d8fecdb11a';

      const isPilot = regPlan === 'pilot_pro';
      const planTier: PlanTier = isPilot ? 'pro' : regPlan;
      const subscriptionStatus: SubscriptionStatus = isPilot ? 'pilot_trial' : 'active';
      const expiresAt = isPilot ? new Date(Date.now() + 30 * 86400000).toISOString() : null;

      const { error } = await supabase.from('shops').insert({
        owner_id: ownerId,
        name: regName.trim(),
        city: regCity.trim() || 'Addis Ababa',
        phone: regPhone.trim() || null,
        category: regCategory,
        persona_type: regPersona,
        plan_tier: planTier,
        subscription_status: subscriptionStatus,
        is_pilot: isPilot,
        pilot_started_at: isPilot ? new Date().toISOString() : null,
        plan_expires_at: expiresAt,
        currency: 'ETB',
        timezone: 'Africa/Addis_Ababa',
        catalog_status: 'draft',
      });

      if (error) throw error;

      setShowRegisterModal(false);
      setRegName('');
      setRegPhone('');
      await onRefreshShops();
    } catch (err: any) {
      setRegError(err?.message || 'Failed to register shop');
    } finally {
      setRegistering(false);
    }
  };

  const openPlanModal = async (shop: Shop, e: React.MouseEvent) => {
    e.stopPropagation();
    setManagingShop(shop);
    setActionFeedback(null);
    setCustomNote('');
    setLoadingLogs(true);

    try {
      const { data, error } = await supabase
        .from('subscription_audit_logs')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const executePlanUpdate = async (
    plan: PlanTier,
    status: SubscriptionStatus,
    isPilot: boolean,
    durationDays: number | null,
    reason: string
  ) => {
    if (!managingShop) return;
    setActionLoading(true);
    setActionFeedback(null);

    let expiresAt: string | null = null;
    if (durationDays !== null) {
      const baseDate =
        managingShop.plan_expires_at && new Date(managingShop.plan_expires_at) > new Date()
          ? new Date(managingShop.plan_expires_at)
          : new Date();
      expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      const { error } = await supabase.rpc('admin_update_shop_subscription', {
        target_shop_id: managingShop.id,
        p_plan: plan,
        p_status: status,
        p_is_pilot: isPilot,
        p_expires_at: expiresAt,
        p_reason: customNote ? `${reason}: ${customNote}` : reason,
      });

      if (error) {
        setActionFeedback(`Error: ${error.message}`);
      } else {
        setActionFeedback('Plan updated successfully!');
        await onRefreshShops();
        const { data: updatedLogs } = await supabase
          .from('subscription_audit_logs')
          .select('*')
          .eq('shop_id', managingShop.id)
          .order('created_at', { ascending: false });
        if (updatedLogs) setAuditLogs(updatedLogs);
      }
    } catch (err: any) {
      setActionFeedback(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#14181D] uppercase tracking-tight flex items-center space-x-2">
            <span>Shops & Subscription Manager</span>
            <span className="text-xs px-2 py-0.5 bg-[#14181D] text-white font-mono">
              {filteredShops.length} of {shops.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5A6470] mt-1">
            Real-time subscriber state, engagement tiers, and instant subscription override controls.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Register Merchant</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Bauhaus High-Contrast) */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-4 sm:p-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6470] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by shop name, merchant phone number, or category..."
            className="w-full bg-[#FFFFFF] border border-[#14181D] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#14181D] placeholder-[#5A6470] focus:outline-none focus:bg-[#F4F6F8] transition min-h-[44px]"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 text-xs font-bold uppercase">
          {/* Plan Filter */}
          <div>
            <label className="text-[10px] text-[#5A6470] mb-1 block">Plan Tier</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#14181D] p-2 text-[#14181D] focus:outline-none min-h-[38px]"
            >
              <option value="all">All Plans</option>
              <option value="pro">Pro (All)</option>
              <option value="pilot_pro">Pro (Free Pilot)</option>
              <option value="starter">Starter</option>
              <option value="free">Free</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] text-[#5A6470] mb-1 block">Subscription</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#14181D] p-2 text-[#14181D] focus:outline-none min-h-[38px]"
            >
              <option value="all">All Statuses</option>
              <option value="pilot">Pilot Trial</option>
              <option value="active">Active (Paid)</option>
              <option value="expired">Expired</option>
              <option value="grace_period">Grace Period</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="text-[10px] text-[#5A6470] mb-1 block">Engagement</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#14181D] p-2 text-[#14181D] focus:outline-none min-h-[38px]"
            >
              <option value="all">All Tiers</option>
              <option value="green">Green (Habit)</option>
              <option value="yellow">Yellow (At Risk)</option>
              <option value="red">Red (Blocked)</option>
            </select>
          </div>

          {/* Persona Filter */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-[#5A6470] mb-1 block">Persona</label>
            <select
              value={personaFilter}
              onChange={(e) => setPersonaFilter(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#14181D] p-2 text-[#14181D] focus:outline-none min-h-[38px]"
            >
              <option value="all">All Personas</option>
              <option value="solo_owner">Solo Owner</option>
              <option value="staff_1_to_4">1–4 Staff</option>
              <option value="social_seller">Social / Telegram</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block md:hidden space-y-3">
        {filteredShops.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#14181D] p-8 text-center space-y-3">
            <Store className="w-8 h-8 text-[#5A6470] mx-auto" />
            <h4 className="font-black text-sm text-[#14181D] uppercase">No Shops in Database</h4>
            <p className="text-xs text-[#5A6470]">Database is on a clean slate. Tap below to register your first merchant shop live into Supabase.</p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Register Merchant</span>
            </button>
          </div>
        ) : (
          filteredShops.map((shop) => {
            const daysLeft = getDaysRemaining(shop.plan_expires_at);
            return (
            <div
              key={shop.id}
              onClick={() => onSelectShop(shop.id)}
              className="bg-[#FFFFFF] border border-[#14181D] p-4 space-y-3 cursor-pointer active:bg-[#F4F6F8] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-[#14181D] text-base uppercase leading-snug">{shop.name}</h3>
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#5A6470] uppercase mt-0.5">
                    <span>{shop.city || 'Addis Ababa'}</span>
                    <span>•</span>
                    <span>{shop.category || 'Retail'}</span>
                  </div>
                </div>

                {/* Tier Badge */}
                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border border-[#14181D] ${
                      shop.computed_tier === 'green'
                        ? 'bg-[#2E7D32] text-white'
                        : shop.computed_tier === 'yellow'
                        ? 'bg-[#FDD835] text-[#14181D]'
                        : 'bg-[#006838] text-white'
                    }`}
                  >
                    {shop.computed_tier}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#F4F6F8] border border-[#14181D] text-center text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#5A6470] uppercase block">Products</span>
                  <span className="font-black text-[#14181D]">{shop.product_count || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5A6470] uppercase block">Sales Total</span>
                  <span className="font-black text-[#14181D]">
                    {formatETB(shop.total_revenue || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5A6470] uppercase block">Customer Debt</span>
                  <span className="font-black text-[#006838]">
                    {formatETB(shop.total_debt || 0)}
                  </span>
                </div>
              </div>

              {/* Status & Plan Footer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#14181D] text-white">
                    {shop.plan_tier} {shop.is_pilot ? '(Pilot)' : ''}
                  </span>

                  {daysLeft !== null && (
                    <span
                      className={`text-[11px] font-bold uppercase ${
                        daysLeft <= 3 ? 'text-[#006838]' : 'text-[#5A6470]'
                      }`}
                    >
                      {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => openPlanModal(shop, e)}
                  className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F4F6F8] text-[#14181D] border border-[#14181D] text-xs font-black uppercase transition min-h-[38px]"
                >
                  Manage Plan
                </button>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* DESKTOP TABLE VIEW (Bauhaus Grid) */}
      <div className="hidden md:block bg-[#FFFFFF] border border-[#14181D] overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#14181D] text-white uppercase text-[11px] font-black tracking-wider">
              <th className="py-3 px-4">Shop & Location</th>
              <th className="py-3 px-4">Persona</th>
              <th className="py-3 px-4">Engagement Tier</th>
              <th className="py-3 px-4">Plan & Status</th>
              <th className="py-3 px-4">Expires</th>
              <th className="py-3 px-4 text-right">Sales / Debt</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[#14181D]">
            {filteredShops.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center bg-[#FFFFFF]">
                  <Store className="w-10 h-10 text-[#5A6470] mx-auto mb-2" />
                  <div className="font-black text-sm text-[#14181D] uppercase">No Shops in Database</div>
                  <p className="text-xs text-[#5A6470] mt-1 mb-4">Database is on a clean slate. Click below to register your first merchant store live into Supabase.</p>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Merchant Store</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredShops.map((shop) => {
                const daysLeft = getDaysRemaining(shop.plan_expires_at);
                return (
                <tr
                  key={shop.id}
                  onClick={() => onSelectShop(shop.id)}
                  className="hover:bg-[#F4F6F8] cursor-pointer transition"
                >
                  {/* Shop name */}
                  <td className="py-3 px-4">
                    <div className="font-black text-[#14181D] text-sm uppercase">{shop.name}</div>
                    <div className="text-[11px] font-medium text-[#5A6470]">
                      {shop.city || 'Addis Ababa'} • {shop.phone || 'No phone'}
                    </div>
                  </td>

                  {/* Persona */}
                  <td className="py-3 px-4 font-bold uppercase text-[#5A6470]">
                    {shop.persona_type?.replace(/_/g, ' ') || '—'}
                  </td>

                  {/* Engagement Tier */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border border-[#14181D] ${
                        shop.computed_tier === 'green'
                          ? 'bg-[#2E7D32] text-white'
                          : shop.computed_tier === 'yellow'
                          ? 'bg-[#FDD835] text-[#14181D]'
                          : 'bg-[#006838] text-white'
                      }`}
                    >
                      {shop.computed_tier}
                    </span>
                  </td>

                  {/* Plan & Status */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-[#14181D] text-white">
                        {shop.plan_tier}
                      </span>
                      {shop.is_pilot && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[#FDD835] border border-[#14181D] text-[#14181D]">
                          Pilot
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[#5A6470] uppercase mt-0.5">
                      {shop.subscription_status.replace(/_/g, ' ')}
                    </div>
                  </td>

                  {/* Expires At */}
                  <td className="py-3 px-4 text-[#14181D] font-mono">
                    <div>{formatDate(shop.plan_expires_at)}</div>
                    {daysLeft !== null && (
                      <div
                        className={`text-[10px] font-black uppercase ${
                          daysLeft <= 3 ? 'text-[#006838]' : 'text-[#5A6470]'
                        }`}
                      >
                        {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                      </div>
                    )}
                  </td>

                  {/* Sales & Debt */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-black text-[#14181D]">
                      {formatETB(shop.total_revenue || 0)}
                    </div>
                    <div className="text-[10px] font-bold text-[#006838]">
                      Debt: {formatETB(shop.total_debt || 0)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => openPlanModal(shop, e)}
                      className="px-3 py-1 bg-[#FFFFFF] hover:bg-[#14181D] hover:text-white text-[#14181D] border border-[#14181D] text-xs font-black uppercase transition"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* PLAN MODAL (Bauhaus Pure Geometry) */}
      {managingShop && (
        <div className="fixed inset-0 z-50 bg-[#14181D]/80 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#14181D] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-[#14181D] flex items-center justify-between bg-[#F4F6F8]">
              <div>
                <h3 className="text-base font-black text-[#14181D] uppercase flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#006838]" />
                  <span>Manage Plan: {managingShop.name}</span>
                </h3>
                <p className="text-xs font-bold text-[#5A6470] uppercase mt-0.5">
                  CURRENT: <span className="text-[#14181D]">{managingShop.plan_tier}</span> ({managingShop.subscription_status})
                </p>
              </div>
              <button
                onClick={() => setManagingShop(null)}
                className="w-8 h-8 bg-[#FFFFFF] border border-[#14181D] flex items-center justify-center text-[#14181D] hover:bg-[#006838] hover:text-white transition font-black"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {actionFeedback && (
                <div
                  className={`p-3 text-xs font-black uppercase border border-[#14181D] ${
                    actionFeedback.startsWith('Error')
                      ? 'bg-[#006838] text-white'
                      : 'bg-[#2E7D32] text-white'
                  }`}
                >
                  {actionFeedback}
                </div>
              )}

              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#14181D] uppercase tracking-wider block">
                  One-Click Preset Overrides
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    disabled={actionLoading}
                    onClick={() =>
                      executePlanUpdate(
                        'pro',
                        'pilot_trial',
                        true,
                        30,
                        'Granted 30-Day Free Pro Pilot'
                      )
                    }
                    className="p-3 bg-[#FFFFFF] hover:bg-[#F4F6F8] border border-[#14181D] text-left transition space-y-1"
                  >
                    <div className="text-xs font-black text-[#14181D] uppercase flex items-center justify-between">
                      <span>Grant 30-Day Pro Pilot</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#006838]" />
                    </div>
                    <p className="text-[11px] font-medium text-[#5A6470]">
                      Plan=Pro, Status=Pilot Trial, Duration=30 days.
                    </p>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() =>
                      executePlanUpdate(
                        managingShop.plan_tier,
                        'pilot_trial',
                        true,
                        7,
                        'Extended pilot grace period (+7 days)'
                      )
                    }
                    className="p-3 bg-[#FFFFFF] hover:bg-[#F4F6F8] border border-[#14181D] text-left transition space-y-1"
                  >
                    <div className="text-xs font-black text-[#14181D] uppercase flex items-center justify-between">
                      <span>Extend Pilot (+7 Days)</span>
                      <Clock className="w-3.5 h-3.5 text-[#FDD835]" />
                    </div>
                    <p className="text-[11px] font-medium text-[#5A6470]">
                      Adds 7 days to current expiration for extra check-ins.
                    </p>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() =>
                      executePlanUpdate(
                        'pro',
                        'active',
                        false,
                        365,
                        'Converted to Paid Pro (Annual prepaid telebirr/CBE)'
                      )
                    }
                    className="p-3 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#14181D] text-left transition space-y-1"
                  >
                    <div className="text-xs font-black uppercase flex items-center justify-between">
                      <span>Upgrade to Paid Pro (1 Yr)</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-[11px] text-white/90">
                      Sets Plan=Pro, Status=Active, Duration=365 days.
                    </p>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() =>
                      executePlanUpdate(
                        'free',
                        'active',
                        false,
                        null,
                        'Downgraded to Free tier'
                      )
                    }
                    className="p-3 bg-[#F4F6F8] hover:bg-[#FFFFFF] border border-[#14181D] text-[#14181D] text-left transition space-y-1"
                  >
                    <div className="text-xs font-black uppercase">Downgrade to Free</div>
                    <p className="text-[11px] font-medium text-[#5A6470]">
                      Standard free tier without pilot flags.
                    </p>
                  </button>
                </div>
              </div>

              {/* Note Input */}
              <div>
                <label className="text-xs font-black text-[#14181D] uppercase mb-1 block">
                  Payment / Audit Note
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Paid via CBE Ref #FT268499, or Verbal approval from field rep"
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] placeholder-[#5A6470] focus:outline-none focus:bg-[#F4F6F8]"
                />
              </div>

              {/* Audit History */}
              <div className="space-y-2 pt-3 border-t-2 border-[#14181D]">
                <div className="flex items-center space-x-2 text-xs font-black text-[#14181D] uppercase tracking-wider">
                  <History className="w-4 h-4 text-[#5A6470]" />
                  <span>Subscription Audit History</span>
                </div>

                {loadingLogs ? (
                  <div className="py-4 text-center text-xs font-bold text-[#5A6470]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#14181D]" />
                    Loading audit trail...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-[#5A6470] italic">No previous plan changes recorded.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-[#F4F6F8] border border-[#14181D] text-xs space-y-0.5"
                      >
                        <div className="flex justify-between items-center text-[#5A6470] text-[10px] font-mono">
                          <span>{formatDate(log.created_at)}</span>
                          <span className="font-black text-[#14181D] uppercase">
                            {log.previous_plan || 'none'} ➔ {log.new_plan} ({log.new_status})
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-[#14181D] font-medium text-[11px]">{log.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-[#14181D] bg-[#F4F6F8] flex justify-end">
              <button
                onClick={() => setManagingShop(null)}
                className="px-4 py-2 bg-[#14181D] text-white uppercase text-xs font-black transition border border-[#14181D]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MERCHANT MODAL (Bauhaus High-Contrast Modal) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-[#14181D]/80 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#14181D] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-[#14181D] flex items-center justify-between bg-[#F4F6F8]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#006838]">
                  NEW MERCHANT ONBOARDING
                </span>
                <h3 className="text-base font-black text-[#14181D] uppercase">
                  Register Merchant Store
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 bg-[#FFFFFF] border border-[#14181D] flex items-center justify-center text-[#14181D] hover:bg-[#006838] hover:text-white transition font-black"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterShop} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs font-bold">
              {regError && (
                <div className="p-3 bg-[#006838] text-white text-xs font-bold border border-[#14181D]">
                  {regError}
                </div>
              )}

              <div>
                <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Adonay Electronics & Mobile"
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] focus:outline-none focus:bg-[#FFFDE7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Addis Ababa"
                    className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] focus:outline-none focus:bg-[#FFFDE7]"
                  />
                </div>

                <div>
                  <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+251 9..."
                    className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] focus:outline-none focus:bg-[#FFFDE7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] uppercase font-bold"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing / Fashion</option>
                    <option value="Cosmetics">Cosmetics & Beauty</option>
                    <option value="Groceries">Groceries / Mini Market</option>
                    <option value="Services">Services</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                    Persona Type
                  </label>
                  <select
                    value={regPersona}
                    onChange={(e) => setRegPersona(e.target.value as any)}
                    className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] uppercase font-bold"
                  >
                    <option value="solo_owner">Solo Owner</option>
                    <option value="staff_1_to_4">1–4 Staff</option>
                    <option value="social_seller">Social / Telegram Seller</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#14181D] uppercase tracking-wider mb-1">
                  Pilot / Subscription Tier
                </label>
                <select
                  value={regPlan}
                  onChange={(e) => setRegPlan(e.target.value as any)}
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] uppercase font-bold"
                >
                  <option value="pilot_pro">Pro (30-Day Free Pilot)</option>
                  <option value="free">Free Forever</option>
                  <option value="starter">Starter Plan (Paid)</option>
                  <option value="pro">Pro Plan (Paid)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-3 px-4 bg-[#006838] hover:bg-[#004D2A] text-white font-black uppercase tracking-wider border border-[#14181D] transition disabled:opacity-50 min-h-[48px]"
                >
                  {registering ? 'Creating Store in Supabase...' : 'Save & Register Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
