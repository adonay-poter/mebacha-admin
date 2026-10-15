import React, { useState } from 'react';
import {
  Users,
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  UserCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  Sparkles,
  BarChart3,
  BadgeDollarSign,
  ArrowRight,
} from 'lucide-react';
import { Shop, Sale, Product } from '../types';
import { formatETB, formatDate } from '../lib/engagement';

interface HomeOverviewProps {
  shops: Shop[];
  sales: Sale[];
  products: Product[];
  onNavigateToShops: () => void;
  onNavigateToPilot: () => void;
  onNavigateToAnalytics: () => void;
  onSelectShop: (shopId: string) => void;
}

export const HomeOverviewView: React.FC<HomeOverviewProps> = ({
  shops,
  sales,
  products,
  onNavigateToShops,
  onNavigateToPilot,
  onNavigateToAnalytics,
  onSelectShop,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');

  const now = Date.now();
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const d30 = now - 30 * 24 * 60 * 60 * 1000;

  // Filter sales & new registrations by selected window
  const activeSales = sales.filter((s) => {
    if (timeRange === '7d') return new Date(s.created_at).getTime() >= d7;
    if (timeRange === '30d') return new Date(s.created_at).getTime() >= d30;
    return true;
  });

  const totalGMV = activeSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalSalesCount = activeSales.length;
  const averageOrderValue = totalSalesCount > 0 ? Math.round(totalGMV / totalSalesCount) : 0;

  // Users & merchants growth
  const totalMerchantUsers = shops.length;
  const newMerchants7d = shops.filter((s) => new Date(s.created_at).getTime() >= d7).length;
  const newMerchants30d = shops.filter((s) => new Date(s.created_at).getTime() >= d30).length;

  // Products telemetry
  const totalProductsCount = products.length;
  const activeProducts = products.filter((p) => p.status !== 'archived').length;
  const totalInventoryStock = products.reduce((acc, p) => acc + Number(p.quantity || 0), 0);
  const totalInventoryValuation = products.reduce(
    (acc, p) => acc + Number(p.selling_price || 0) * Number(p.quantity || 1),
    0
  );

  // Customer debt total across all shops
  const totalDebtAcrossShops = shops.reduce((acc, s) => acc + Number(s.total_debt || 0), 0);

  // Top Performing Stores by Volume
  const topShops = [...shops]
    .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
    .slice(0, 5);

  // Recent Real Transactions
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Platform Telemetry Header */}
      <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-[#E6F4EC] text-[#006838] border border-[#A7F3D0] rounded-[2px]">
              MEBACHA PLATFORM CORE
            </span>
            <span className="text-xs font-mono text-[#5A6470] uppercase">National SaaS Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#14181D] tracking-wide uppercase leading-tight">
            Ecosystem Overview & Vital Stats
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#5A6470] mt-1.5 max-w-2xl leading-relaxed">
            Live aggregated metrics across all merchant shops, active user accounts, catalog inventory items, and POS transactions.
          </p>
        </div>

        {/* Time Window Selector & Quick Pilot Link */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[4px] border border-[#D1D5DB] p-0.5 bg-[#F4F6F8]">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeRange === '7d'
                  ? 'bg-[#006838] text-white shadow-xs'
                  : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeRange === '30d'
                  ? 'bg-[#006838] text-white shadow-xs'
                  : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-xs font-mono font-semibold uppercase rounded-[3px] transition ${
                timeRange === 'all'
                  ? 'bg-[#006838] text-white shadow-xs'
                  : 'text-[#5A6470] hover:text-[#14181D]'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={onNavigateToAnalytics}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#004D2A] text-xs font-mono font-bold uppercase rounded-[4px] transition shadow-xs"
          >
            <BarChart3 className="w-4 h-4 text-white" />
            <span>Open Charts & Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Top 4 Core Macro Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users / Merchant Accounts */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Merchant Users</span>
            <Users className="w-4 h-4 text-[#006838]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl sm:text-4xl font-display font-bold text-[#14181D] leading-none">
                {totalMerchantUsers}
              </span>
              <span className="text-xs font-mono text-[#5A6470]">merchants</span>
            </div>
            <div className="flex items-center space-x-2 mt-2 font-mono text-[11px]">
              <span className="text-[#006838] font-bold">+{newMerchants7d} new (7d)</span>
              <span className="text-[#5A6470]">+{newMerchants30d} (30d)</span>
            </div>
          </div>
        </div>

        {/* Total Registered Shops */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Registered Shops</span>
            <Store className="w-4 h-4 text-[#14181D]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl sm:text-4xl font-display font-bold text-[#14181D] leading-none">
                {shops.length}
              </span>
              <span className="text-xs font-mono text-[#5A6470]">active stores</span>
            </div>
            <p className="text-[11px] font-mono text-[#5A6470] mt-2">
              Across Addis Ababa & Regions
            </p>
          </div>
        </div>

        {/* Total Catalog Products */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Products</span>
            <Package className="w-4 h-4 text-[#866128]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl sm:text-4xl font-display font-bold text-[#14181D] leading-none">
                {totalProductsCount}
              </span>
              <span className="text-xs font-mono text-[#5A6470]">SKUs listed</span>
            </div>
            <p className="text-[11px] font-mono text-[#006838] mt-2">
              {activeProducts} active in live POS inventory
            </p>
          </div>
        </div>

        {/* Total Processed Gross Sales */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#5A6470] mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Gross GMV</span>
            <BadgeDollarSign className="w-4 h-4 text-[#006838]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-display font-bold text-[#006838] leading-none truncate">
                {formatETB(totalGMV)}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#5A6470] mt-2">
              {totalSalesCount} recorded POS receipts
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Financial & Inventory Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Transaction Value */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-[#5A6470] text-xs font-mono">
            <span>Average Order Value</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#006838]" />
          </div>
          <div className="text-xl font-display font-bold text-[#14181D]">
            {formatETB(averageOrderValue)}
          </div>
          <p className="text-[10px] font-mono text-[#5A6470]">Per finalized POS transaction</p>
        </div>

        {/* Total Customer Debt Outstanding */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-[#5A6470] text-xs font-mono">
            <span>Merchant Customer Debt</span>
            <CreditCard className="w-3.5 h-3.5 text-[#DC2626]" />
          </div>
          <div className="text-xl font-display font-bold text-[#DC2626]">
            {formatETB(totalDebtAcrossShops)}
          </div>
          <p className="text-[10px] font-mono text-[#5A6470]">Active informal ledger credit tabs</p>
        </div>

        {/* Total Physical Stock Items */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-[#5A6470] text-xs font-mono">
            <span>Total Units in Stock</span>
            <Package className="w-3.5 h-3.5 text-[#5A6470]" />
          </div>
          <div className="text-xl font-display font-bold text-[#14181D]">
            {totalInventoryStock.toLocaleString()}
          </div>
          <p className="text-[10px] font-mono text-[#5A6470]">Across retail shop shelves</p>
        </div>

        {/* Inventory Retail Value */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-4 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-[#5A6470] text-xs font-mono">
            <span>Stock Retail Valuation</span>
            <Sparkles className="w-3.5 h-3.5 text-[#866128]" />
          </div>
          <div className="text-xl font-display font-bold text-[#14181D]">
            {formatETB(totalInventoryValuation)}
          </div>
          <p className="text-[10px] font-mono text-[#5A6470]">Total shelf product value</p>
        </div>
      </div>

      {/* Two Column Layout: Top Performing Shops & Live Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Merchants by Sales Volume */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-[#006838]" />
              <h2 className="text-sm font-display font-bold text-[#14181D] uppercase tracking-wider">
                Top Merchants by Sales Volume
              </h2>
            </div>
            <button
              onClick={onNavigateToShops}
              className="text-xs font-mono text-[#006838] hover:underline font-semibold"
            >
              View All ({shops.length}) →
            </button>
          </div>

          <div className="space-y-2.5">
            {topShops.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => onSelectShop(s.id)}
                className="flex items-center justify-between p-3 bg-[#F4F6F8] hover:bg-[#E5E7EB] border border-[#D1D5DB] rounded-[4px] cursor-pointer transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-6 h-6 bg-[#14181D] text-white rounded-[2px] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs text-[#14181D] uppercase truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] font-mono text-[#5A6470]">
                      {s.product_count || 0} products • {s.sale_count || 0} sales recorded
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-xs text-[#006838]">
                    {formatETB(s.total_revenue || 0)}
                  </p>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[2px] text-[#5A6470]">
                    {s.plan_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Real POS Transactions Feed */}
        <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-[6px] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-[#866128]" />
              <h2 className="text-sm font-display font-bold text-[#14181D] uppercase tracking-wider">
                Live POS Receipts Telemetry
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#5A6470] uppercase">
              {sales.length} Lifetime
            </span>
          </div>

          <div className="space-y-2">
            {recentSales.map((sale) => {
              const shopObj = shops.find((s) => s.id === sale.shop_id);
              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-2.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-[4px] text-xs font-mono"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#14181D] truncate">
                        {shopObj ? shopObj.name : 'Unknown Shop'}
                      </span>
                      <span className="text-[10px] text-[#5A6470]">
                        #{sale.sale_number || sale.id.slice(0, 6)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5A6470] truncate mt-0.5">
                      {formatDate(sale.created_at)} • Payment: {sale.payment_method || 'CASH'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#14181D]">
                      {formatETB(sale.total || 0)}
                    </p>
                    <span className="text-[9px] font-semibold text-[#006838] bg-[#E6F4EC] px-1 py-0.2 rounded-[2px]">
                      {sale.status || 'completed'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
