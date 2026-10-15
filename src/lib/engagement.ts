import { Shop, EngagementTier, Sale } from '../types';

export function computeEngagementTier(
  shop: Shop,
  sales: Sale[] = [],
  hasBlocker: boolean = false
): EngagementTier {
  // 1. Check manual override
  if (shop.engagement_tier_override) {
    return shop.engagement_tier_override;
  }

  // 2. Open blocker automatically marks shop as RED
  if (hasBlocker) {
    return 'red';
  }

  // Days since pilot started
  const pilotStart = shop.pilot_started_at ? new Date(shop.pilot_started_at) : new Date(shop.created_at);
  const now = new Date();
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - pilotStart.getTime()) / (1000 * 60 * 60 * 24)));

  const shopSales = sales.filter(s => s.shop_id === shop.id && s.status !== 'cancelled');

  // If no sales after 3 days of onboarding -> RED
  if (daysSinceStart >= 3 && shopSales.length === 0) {
    return 'red';
  }

  // Days with sales in the last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentSales = shopSales.filter(s => new Date(s.created_at) >= sevenDaysAgo);
  const distinctDaysWithSales = new Set(
    recentSales.map(s => new Date(s.created_at).toISOString().split('T')[0])
  ).size;

  // Features tried count: products, sales, debt, catalog
  let featuresCount = 0;
  if ((shop.product_count || 0) > 0) featuresCount++;
  if ((shop.sale_count || 0) > 0) featuresCount++;
  if ((shop.debt_count || 0) > 0) featuresCount++;
  if (shop.catalog_status === 'active' || shop.has_catalog) featuresCount++;

  // Inactive for 5+ days -> RED
  if (shopSales.length > 0) {
    const latestSale = shopSales.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    }, shopSales[0]);

    const daysSinceLatest = Math.floor((now.getTime() - new Date(latestSale.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLatest >= 5) {
      return 'red';
    }
  }

  // GREEN: >= 4 sales days in last 7 days + tried >= 3 features
  if (distinctDaysWithSales >= 4 && featuresCount >= 3) {
    return 'green';
  }

  // YELLOW: Gaps or fewer than 3 active days
  if (distinctDaysWithSales < 3 || daysSinceStart <= 7) {
    return 'yellow';
  }

  return 'yellow';
}

export function formatETB(amount: number | undefined | null): string {
  if (amount === null || amount === undefined) return 'ETB 0';
  return `ETB ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDaysRemaining(expiresAt: string | undefined | null): number | null {
  if (!expiresAt) return null;
  const now = new Date().getTime();
  const exp = new Date(expiresAt).getTime();
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
}
