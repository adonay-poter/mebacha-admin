import React, { useState, useEffect, useCallback } from 'react';
import { supabase, checkIsAdmin } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { Login, UnauthorizedScreen } from './components/Login';
import { HomeOverviewView } from './views/HomeOverviewView';
import { AnalyticsView } from './views/AnalyticsView';
import { DashboardView } from './views/DashboardView';
import { ShopsView } from './views/ShopsView';
import { ShopDetailView } from './views/ShopDetailView';
import { TriageView } from './views/TriageView';
import { Shop, Sale, Product, CustomerDebt, PilotTouchpoint, PilotIssue } from './types';
import { computeEngagementTier } from './lib/engagement';
import { Loader2 } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App routing: home | analytics | dashboard | shops | shop-detail | triage
  const [currentView, setCurrentView] = useState<'home' | 'analytics' | 'dashboard' | 'shops' | 'shop-detail' | 'triage'>('home');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Live Supabase telemetry state
  const [shops, setShops] = useState<Shop[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [touchpoints, setTouchpoints] = useState<PilotTouchpoint[]>([]);
  const [issues, setIssues] = useState<PilotIssue[]>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);

  // Check auth & session
  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const adminStatus = await checkIsAdmin(session.user);
          setIsAdmin(adminStatus);
        } else {
          setUser(null);
          setIsAdmin(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoadingAuth(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const adminStatus = await checkIsAdmin(session.user);
        setIsAdmin(adminStatus);
      } else {
        setUser(null);
        setIsAdmin(null);
      }
      setLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(null);
    setCurrentView('home');
    setSelectedShopId(null);
  };

  // Fetch all live data from Supabase
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      // 1. Fetch shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*');

      // 4. Fetch debts (customer_ledger)
      const { data: debtsData } = await supabase
        .from('customer_ledger')
        .select('id, shop_id, debit, credit, balance_after');

      // 5. Fetch touchpoints
      const { data: touchpointsData } = await supabase
        .from('pilot_touchpoints')
        .select('*')
        .order('created_at', { ascending: false });

      // 6. Fetch issues
      const { data: issuesData } = await supabase
        .from('pilot_issues')
        .select('*')
        .order('created_at', { ascending: false });

      const allSales: Sale[] = salesData || [];
      const allIssues: PilotIssue[] = issuesData || [];
      const allProducts: Product[] = productsData || [];
      const allDebts = debtsData || [];

      // Compute aggregates per shop
      const blockerIssues = allIssues.filter(i => i.severity === 'blocker' && i.status !== 'resolved');

      const enrichedShops: Shop[] = (shopsData || []).map((shop: any) => {
        const shopSales = allSales.filter(s => s.shop_id === shop.id && s.status !== 'cancelled');
        const shopProducts = allProducts.filter(p => p.shop_id === shop.id && p.status !== 'archived');
        const shopDebts = allDebts.filter(d => d.shop_id === shop.id);

        const hasBlocker = blockerIssues.some(b => b.affected_shop_ids?.includes(shop.id));
        const totalRevenue = shopSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
        const totalDebt = shopDebts.reduce((acc, d) => acc + Number(d.debit || 0), 0);

        const tempShop: Shop = {
          ...shop,
          product_count: shopProducts.length,
          sale_count: shopSales.length,
          total_revenue: totalRevenue,
          debt_count: shopDebts.length,
          total_debt: totalDebt,
          has_open_blocker: hasBlocker,
        };

        const computedTier = computeEngagementTier(tempShop, allSales, hasBlocker);

        return {
          ...tempShop,
          computed_tier: computedTier,
        };
      });

      setShops(enrichedShops);
      setSales(allSales);
      setProducts(allProducts);
      setTouchpoints(touchpointsData || []);
      setIssues(allIssues);
      setTotalUserCount(enrichedShops.length || 32);
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // Auth Loading state
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-8 h-8 border-3 border-[#D1D5DB] border-t-[#006838] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-[#14181D] uppercase tracking-wider">
          Connecting to Mebacha Supabase...
        </span>
      </div>
    );
  }

  // Not logged in -> Show Login Screen
  if (!user) {
    return (
      <Login
        onSuccess={() => {}}
      />
    );
  }

  // Logged in but not an authorized admin -> Unauthorized Screen
  if (isAdmin === false) {
    return (
      <UnauthorizedScreen
        onSignOut={handleSignOut}
        userEmail={user.email}
      />
    );
  }

  const activeShop = shops.find(s => s.id === selectedShopId);
  const openBlockerCount = issues.filter(i => i.severity === 'blocker' && i.status !== 'resolved').length;
  const needsAttentionCount = shops.filter(s => s.computed_tier === 'red' || s.computed_tier === 'yellow').length;

  return (
    <Layout
      currentView={currentView}
      onNavigate={(view) => {
        setCurrentView(view);
        setSelectedShopId(null);
      }}
      user={user}
      onSignOut={handleSignOut}
      onRefresh={fetchData}
      activeShopName={activeShop?.name}
      openIssuesCount={openBlockerCount}
      needsAttentionCount={needsAttentionCount}
    >
      {currentView === 'home' && (
        <HomeOverviewView
          shops={shops}
          sales={sales}
          products={products}
          onNavigateToShops={() => setCurrentView('shops')}
          onNavigateToPilot={() => setCurrentView('dashboard')}
          onNavigateToAnalytics={() => setCurrentView('analytics')}
          onSelectShop={(shopId) => {
            setSelectedShopId(shopId);
            setCurrentView('shop-detail');
          }}
        />
      )}

      {currentView === 'analytics' && (
        <AnalyticsView
          shops={shops}
          sales={sales}
          products={products}
          onSelectShop={(shopId) => {
            setSelectedShopId(shopId);
            setCurrentView('shop-detail');
          }}
          onNavigateToShops={() => setCurrentView('shops')}
        />
      )}

      {currentView === 'dashboard' && (
        <DashboardView
          shops={shops}
          sales={sales}
          touchpoints={touchpoints}
          issues={issues}
          totalUserCount={totalUserCount}
          onSelectShop={(shopId) => {
            setSelectedShopId(shopId);
            setCurrentView('shop-detail');
          }}
          onNavigateToShops={() => setCurrentView('shops')}
          onNavigateToTriage={() => setCurrentView('triage')}
        />
      )}

      {currentView === 'shops' && (
        <ShopsView
          shops={shops}
          onSelectShop={(shopId) => {
            setSelectedShopId(shopId);
            setCurrentView('shop-detail');
          }}
          onRefreshShops={fetchData}
        />
      )}

      {currentView === 'shop-detail' && selectedShopId && (
        <ShopDetailView
          shopId={selectedShopId}
          onBack={() => {
            setCurrentView('shops');
            setSelectedShopId(null);
          }}
          onRefreshShop={fetchData}
        />
      )}

      {currentView === 'triage' && (
        <TriageView
          issues={issues}
          shops={shops}
          onRefreshIssues={fetchData}
          onSelectShop={(shopId) => {
            setSelectedShopId(shopId);
            setCurrentView('shop-detail');
          }}
        />
      )}
    </Layout>
  );
}

export default App;
