import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  MessageSquare,
  Send,
  Copy,
  Check,
  CreditCard,
  Plus,
  ExternalLink,
  Save,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  Shop,
  Sale,
  Product,
  CustomerDebt,
  PilotTouchpoint,
  TouchpointDay,
  EngagementTier,
} from '../types';
import { formatETB, formatDate } from '../lib/engagement';
import { supabase } from '../lib/supabase';

interface ShopDetailViewProps {
  shopId: string;
  onBack: () => void;
  onRefreshShop: () => Promise<void>;
}

export const ShopDetailView: React.FC<ShopDetailViewProps> = ({
  shopId,
  onBack,
  onRefreshShop,
}) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [touchpoints, setTouchpoints] = useState<PilotTouchpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Touchpoint Drawer Form state
  const [showTouchpointDrawer, setShowTouchpointDrawer] = useState(false);
  const [touchpointDay, setTouchpointDay] = useState<TouchpointDay>('Day 1');
  const [usageSignals, setUsageSignals] = useState<string[]>([]);
  const [confusionPoint, setConfusionPoint] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const [sentimentScore, setSentimentScore] = useState<number>(4);
  const [wouldTheyPaySignal, setWouldTheyPaySignal] = useState<'yes' | 'maybe' | 'no'>('yes');
  const [tierSet, setTierSet] = useState<EngagementTier>('green');
  const [savingTouchpoint, setSavingTouchpoint] = useState(false);
  const [copiedTemplateKey, setCopiedTemplateKey] = useState<string | null>(null);

  // Exit conversion state
  const [savingConversion, setSavingConversion] = useState(false);
  const [conversionOutcome, setConversionOutcome] = useState<'pro' | 'starter' | 'no_convert' | ''>('');
  const [churnReason, setChurnReason] = useState<'price' | 'missing_feature' | 'reverted_to_habit' | ''>('');
  const [churnNotes, setChurnNotes] = useState('');
  const [conversionFeedback, setConversionFeedback] = useState<string | null>(null);

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopData) {
        setShop(shopData);
        if (shopData.churn_or_no_reason) setChurnReason(shopData.churn_or_no_reason);
        if (shopData.churn_notes) setChurnNotes(shopData.churn_notes);
        if (shopData.plan_tier === 'pro' && !shopData.is_pilot) setConversionOutcome('pro');
        else if (shopData.plan_tier === 'starter' && !shopData.is_pilot) setConversionOutcome('starter');
      }

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);

      const { data: saleData } = await supabase
        .from('sales')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (saleData) setSales(saleData);

      const { data: debtData } = await supabase
        .from('customer_ledger')
        .select('*, customers(name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (debtData) {
        setDebts(
          debtData.map((d: any) => ({
            ...d,
            customer_name: d.customers?.name || 'Customer',
          }))
        );
      }

      const { data: touchData } = await supabase
        .from('pilot_touchpoints')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (touchData) setTouchpoints(touchData);
    } catch (err) {
      console.error('Error fetching shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  if (loading || !shop) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#006838] mx-auto" />
          <p className="text-xs font-black uppercase text-[#5A6470]">Loading shop counter telemetry...</p>
        </div>
      </div>
    );
  }

  // Day 0 Onboarding Live Checklist Evaluation
  const checklist = [
    {
      id: 'pilot_state',
      title: 'Pilot End Date & Pro Status Set',
      description: 'Shop marked as Pro Pilot with expiration timestamp',
      isComplete: shop.is_pilot && shop.plan_tier === 'pro' && !!shop.plan_expires_at,
    },
    {
      id: 'products',
      title: '≥ 3 Real Products Added in DB',
      description: `Current: ${products.length} product${products.length === 1 ? '' : 's'} recorded`,
      isComplete: products.length >= 3,
    },
    {
      id: 'sale',
      title: '≥ 1 Real Sale Recorded in DB',
      description: `Current: ${sales.length} sale${sales.length === 1 ? '' : 's'} completed`,
      isComplete: sales.length >= 1,
    },
    {
      id: 'debt',
      title: '≥ 1 Customer Debt Entry Added',
      description: `Current: ${debts.length} ledger entry recorded`,
      isComplete: debts.length >= 1,
    },
    {
      id: 'catalog',
      title: 'Catalog Link Shared / Active',
      description: `Status: ${shop.catalog_status} (slug: /s/${shop.catalog_slug || 'draft'})`,
      isComplete: shop.catalog_status === 'active' || !!shop.catalog_slug,
    },
    {
      id: 'touchpoint',
      title: 'Day 1 Follow-up Scheduled in Tracker',
      description: `Logged touchpoints: ${touchpoints.length} entries`,
      isComplete: touchpoints.length >= 1,
    },
  ];

  const completedCount = checklist.filter((c) => c.isComplete).length;
  const completionPercentage = Math.round((completedCount / checklist.length) * 100);

  const handleChecklistCelebration = () => {
    if (completionPercentage === 100) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const totalSalesVolume = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalDebtVolume = debts.reduce((sum, d) => sum + Number(d.debit || 0), 0);

  // Messaging templates
  const merchantName = shop.name.split(' ')[0] || 'ባልደረባ';
  const messageTemplates = [
    {
      key: 'day1',
      title: 'Day 1 Quick Pulse',
      amharic: `እንደምን ነዎት፣ ${merchantName}? ትናንት ከጀመሩ ወዲህ አንድ ሽያጭ መዝግበው ነበር? የገጠመዎት ነገር ካለ እዚህ ይንገሩን፣ አብረን እናየዋለን።`,
      english: `Hello ${merchantName}, how is it going? Have you recorded any sales since starting yesterday? Let us know if you ran into any issues and we will resolve it together.`,
    },
    {
      key: 'day7',
      title: 'Day 7 Weekly Review',
      amharic: `${merchantName}፣ አንድ ሳምንት ሆነ። ዛሬ ወይም ነገ ለ10 ደቂቃ በስልክ እናውራ? የሚሰራውን እና የማይሰራውን በትክክል መስማት እንፈልጋለን።`,
      english: `${merchantName}, it has been one week! Can we do a quick 10-minute phone call today or tomorrow? We want to hear exactly what is working well and what isn't.`,
    },
    {
      key: 'redflag',
      title: 'Red-Flag Re-engagement',
      amharic: `${merchantName}፣ ይህን ሳምንት Mebachaን ብዙ ሲጠቀሙ አላየንም — ይህም ለእኛ ጠቃሚ መረጃ ነው። የሚያግድዎት ነገር አለ? ወይስ ጊዜው ስራ የበዛበት ነው? ብንመጣ ደስ ይለናል።`,
      english: `${merchantName}, we noticed you haven't used Mebacha much this week — this is helpful feedback for us. Is something blocking you or is it just a busy period? We can stop by anytime.`,
    },
    {
      key: 'day30',
      title: 'Day 30 Exit Interview',
      amharic: `${merchantName}፣ የሙከራ ወርዎ ተጠናቀቀ — Mebachaን ከእኛ ጋር ስለተጠቀሙ እናመሰግናለን። የመጨረሻ ለ30 ደቂቃ በስልክ አስተያየትዎን እንስማ እና ስለሚቀጥለው እናውራ?`,
      english: `${merchantName}, your 30-day pilot month is completed — thank you for using Mebacha! Can we schedule a 30-minute debrief call to hear your final thoughts and discuss next steps?`,
    },
  ];

  const copyOrOpenMessage = (templateText: string, platform: 'whatsapp' | 'telegram', key: string) => {
    navigator.clipboard.writeText(templateText);
    setCopiedTemplateKey(key);
    setTimeout(() => setCopiedTemplateKey(null), 2500);

    const cleanPhone = (shop.phone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(templateText);

    if (platform === 'whatsapp' && cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent('https://mebacha.et')}&text=${encoded}`, '_blank');
    }
  };

  const handleSaveTouchpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTouchpoint(true);

    try {
      const { error } = await supabase.from('pilot_touchpoints').insert({
        shop_id: shop.id,
        touchpoint_day: touchpointDay,
        usage_signals: usageSignals,
        confusion_point: confusionPoint.trim() || null,
        feature_request: featureRequest.trim() || null,
        sentiment_score: sentimentScore,
        would_they_pay_signal: wouldTheyPaySignal,
        tier_set: tierSet,
      });

      if (error) throw error;

      await supabase
        .from('shops')
        .update({
          would_they_pay: wouldTheyPaySignal,
          engagement_tier_override: tierSet,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      setShowTouchpointDrawer(false);
      setConfusionPoint('');
      setFeatureRequest('');
      await fetchShopData();
      await onRefreshShop();
    } catch (err: any) {
      alert(`Error saving touchpoint: ${err.message}`);
    } finally {
      setSavingTouchpoint(false);
    }
  };

  const handleSaveConversion = async () => {
    setSavingConversion(true);
    setConversionFeedback(null);

    try {
      let newPlan: 'pro' | 'starter' | 'free' = 'free';
      let newStatus: 'active' | 'expired' = 'expired';
      let isPilot = false;

      if (conversionOutcome === 'pro') {
        newPlan = 'pro';
        newStatus = 'active';
      } else if (conversionOutcome === 'starter') {
        newPlan = 'starter';
        newStatus = 'active';
      } else {
        newPlan = 'free';
        newStatus = 'expired';
      }

      const { error } = await supabase.rpc('admin_update_shop_subscription', {
        target_shop_id: shop.id,
        p_plan: newPlan,
        p_status: newStatus,
        p_is_pilot: isPilot,
        p_expires_at:
          conversionOutcome === 'pro' || conversionOutcome === 'starter'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        p_reason: `Exit Conversion: ${conversionOutcome}. Churn reason: ${churnReason || 'N/A'}. Notes: ${churnNotes || 'None'}`,
      });

      if (error) throw error;

      await supabase
        .from('shops')
        .update({
          churn_or_no_reason: conversionOutcome === 'no_convert' ? churnReason : null,
          churn_notes: churnNotes || null,
          would_they_pay: conversionOutcome === 'no_convert' ? 'no' : 'yes',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      setConversionFeedback('Conversion outcome recorded successfully!');
      await fetchShopData();
      await onRefreshShop();
    } catch (err: any) {
      setConversionFeedback(`Error: ${err.message}`);
    } finally {
      setSavingConversion(false);
    }
  };

  const postHogUrl = `https://eu.i.posthog.com/project/recordings?filter=${encodeURIComponent(shop.id)}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Bar (Bauhaus) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-3 border-[#14181D] pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-[#FFFFFF] hover:bg-[#F4F6F8] border border-[#14181D] flex items-center justify-center text-[#14181D] transition shrink-0 min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#14181D] uppercase tracking-tight">{shop.name}</h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#14181D] text-white">
                {shop.plan_tier} {shop.is_pilot ? 'Pilot' : ''}
              </span>
            </div>
            <p className="text-xs font-bold text-[#5A6470] uppercase mt-0.5">
              {shop.city || 'Addis Ababa'} • {shop.category || 'Retail'} • Phone: {shop.phone || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* PostHog Replay */}
          <a
            href={postHogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#FFFFFF] hover:bg-[#F4F6F8] border border-[#14181D] text-[#14181D] text-xs font-black uppercase transition min-h-[44px]"
          >
            <span>PostHog Replay</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#5A6470]" />
          </a>

          {/* Log Touchpoint */}
          <button
            onClick={() => setShowTouchpointDrawer(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#006838] hover:bg-[#004D2A] text-white text-xs font-black uppercase tracking-wider border border-[#14181D] transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Check-in</span>
          </button>
        </div>
      </div>

      {/* 1. Day 0 Onboarding Live Checklist */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#14181D] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#006838]" />
              <h2 className="text-base font-black text-[#14181D] uppercase tracking-wider">
                Day 0 Onboarding Live Checklist
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#F4F6F8] border border-[#14181D]">
                {completedCount}/{checklist.length} ({completionPercentage}%)
              </span>
            </div>
            <p className="text-xs font-medium text-[#5A6470] mt-0.5">
              Field rep counter verification auto-evaluated from Supabase database.
            </p>
          </div>

          {completionPercentage === 100 && (
            <button
              onClick={handleChecklistCelebration}
              className="text-xs font-black uppercase px-3 py-1.5 bg-[#2E7D32] text-white border border-[#14181D]"
            >
              🎉 Onboarded! Celebrate
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F4F6F8] h-3 border border-[#14181D] overflow-hidden">
          <div
            className={`h-full ${completionPercentage === 100 ? 'bg-[#2E7D32]' : 'bg-[#006838]'}`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Checklist Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`p-3 border border-[#14181D] flex items-start space-x-3 transition ${
                item.isComplete ? 'bg-[#E8F5E9]' : 'bg-[#FFFFFF]'
              }`}
            >
              {item.isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-[#5A6470] shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-[#14181D]">{item.title}</p>
                <p className="text-[11px] font-medium text-[#5A6470] mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. One-Click Amharic & English Messaging Launcher */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-5 space-y-4">
        <div className="border-b-2 border-[#14181D] pb-3">
          <h2 className="text-base font-black text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#006838]" />
            <span>One-Click WhatsApp & Telegram Launcher</span>
          </h2>
          <p className="text-xs font-medium text-[#5A6470] mt-0.5">
            Personalized scripts customized with merchant name <strong className="text-[#14181D]">{merchantName}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {messageTemplates.map((template) => {
            const isCopied = copiedTemplateKey === template.key;
            return (
              <div
                key={template.key}
                className="bg-[#F4F6F8] border border-[#14181D] p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-[#14181D]">{template.title}</span>
                    {isCopied && (
                      <span className="text-[10px] text-[#2E7D32] font-black uppercase flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </span>
                    )}
                  </div>
                  {/* Amharic Text Box */}
                  <div className="p-3 bg-[#FFFFFF] border border-[#14181D] text-xs text-[#14181D] leading-relaxed font-bold mb-2">
                    {template.amharic}
                  </div>
                  {/* English subtext */}
                  <p className="text-[11px] font-medium text-[#5A6470] italic">"{template.english}"</p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t-2 border-[#14181D]">
                  <button
                    onClick={() => copyOrOpenMessage(template.amharic, 'whatsapp', template.key)}
                    className="flex-1 py-2 px-3 bg-[#FFFFFF] hover:bg-[#14181D] hover:text-white text-[#14181D] border border-[#14181D] text-xs font-black uppercase flex items-center justify-center space-x-1.5 transition min-h-[40px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => copyOrOpenMessage(template.amharic, 'telegram', template.key)}
                    className="flex-1 py-2 px-3 bg-[#FFFFFF] hover:bg-[#14181D] hover:text-white text-[#14181D] border border-[#14181D] text-xs font-black uppercase flex items-center justify-center space-x-1.5 transition min-h-[40px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(template.amharic);
                      setCopiedTemplateKey(template.key);
                      setTimeout(() => setCopiedTemplateKey(null), 2500);
                    }}
                    title="Copy text"
                    className="w-10 h-10 bg-[#FFFFFF] hover:bg-[#14181D] hover:text-white text-[#14181D] border border-[#14181D] flex items-center justify-center shrink-0 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Day 30 Exit Interview & Conversion Card */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-5 space-y-4">
        <div className="border-b-2 border-[#14181D] pb-3">
          <h2 className="text-base font-black text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-[#006838]" />
            <span>Day 30 Exit Interview & Conversion Closer</span>
          </h2>
          <p className="text-xs font-medium text-[#5A6470] mt-0.5">
            Auto-synthesizes live DB metrics to pitch the tangible value delivered.
          </p>
        </div>

        {/* Live Pitch Script */}
        <div className="p-4 bg-[#F4F6F8] border border-[#14181D] space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#5A6470]">
            Verbatim Script for Field Rep:
          </div>
          <p className="text-sm font-black text-[#14181D] leading-relaxed">
            "Over the past month you recorded{' '}
            <span className="text-[#006838]">{sales.length} sales ({formatETB(totalSalesVolume)})</span> and
            tracked <span className="text-[#14181D] underline">{formatETB(totalDebtVolume)}</span> in customer debt
            through Mebacha."
          </p>
        </div>

        {conversionFeedback && (
          <div
            className={`p-3 text-xs font-black uppercase border border-[#14181D] ${
              conversionFeedback.startsWith('Error')
                ? 'bg-[#006838] text-white'
                : 'bg-[#2E7D32] text-white'
            }`}
          >
            {conversionFeedback}
          </div>
        )}

        {/* Outcome Selector */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-black text-[#14181D] uppercase block">
            Final Day 30 Conversion Decision:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setConversionOutcome('pro')}
              className={`p-3 border border-[#14181D] text-xs font-black uppercase flex flex-col items-center justify-center space-y-1 transition min-h-[50px] ${
                conversionOutcome === 'pro'
                  ? 'bg-[#2E7D32] text-white'
                  : 'bg-[#FFFFFF] text-[#14181D] hover:bg-[#F4F6F8]'
              }`}
            >
              <span>Converted to Pro</span>
              <span className="text-[10px] font-normal opacity-90">Annual / Monthly</span>
            </button>

            <button
              type="button"
              onClick={() => setConversionOutcome('starter')}
              className={`p-3 border border-[#14181D] text-xs font-black uppercase flex flex-col items-center justify-center space-y-1 transition min-h-[50px] ${
                conversionOutcome === 'starter'
                  ? 'bg-[#1E88E5] text-white'
                  : 'bg-[#FFFFFF] text-[#14181D] hover:bg-[#F4F6F8]'
              }`}
            >
              <span>Converted to Starter</span>
              <span className="text-[10px] font-normal opacity-90">Budget Tier</span>
            </button>

            <button
              type="button"
              onClick={() => setConversionOutcome('no_convert')}
              className={`p-3 border border-[#14181D] text-xs font-black uppercase flex flex-col items-center justify-center space-y-1 transition min-h-[50px] ${
                conversionOutcome === 'no_convert'
                  ? 'bg-[#006838] text-white'
                  : 'bg-[#FFFFFF] text-[#14181D] hover:bg-[#F4F6F8]'
              }`}
            >
              <span>Did Not Convert</span>
              <span className="text-[10px] font-normal opacity-90">Categorize Reason</span>
            </button>
          </div>

          {/* Churn Reason */}
          {conversionOutcome === 'no_convert' && (
            <div className="p-4 bg-[#FBE9E7] border border-[#14181D] space-y-3">
              <label className="text-xs font-black uppercase text-[#006838] block">
                Required: Why did they not convert?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'price', label: 'Price (Too High)' },
                  { id: 'missing_feature', label: 'Missing Feature' },
                  { id: 'reverted_to_habit', label: 'Paper Habit Reversion' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChurnReason(item.id as any)}
                    className={`p-2.5 border border-[#14181D] text-xs font-black uppercase transition ${
                      churnReason === item.id
                        ? 'bg-[#006838] text-white'
                        : 'bg-[#FFFFFF] text-[#14181D] hover:bg-[#F4F6F8]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#14181D] block mb-1">
                  Specific merchant feedback:
                </label>
                <textarea
                  rows={2}
                  value={churnNotes}
                  onChange={(e) => setChurnNotes(e.target.value)}
                  placeholder="Verbatim feedback on why they did not subscribe..."
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-xs text-[#14181D] placeholder-[#5A6470] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveConversion}
              disabled={savingConversion || !conversionOutcome || (conversionOutcome === 'no_convert' && !churnReason)}
              className="flex items-center space-x-1.5 px-5 py-3 bg-[#006838] hover:bg-[#004D2A] text-white text-xs font-black uppercase tracking-wider border border-[#14181D] transition disabled:opacity-50 min-h-[44px]"
            >
              {savingConversion ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Conversion Outcome</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Touchpoint History */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-5 space-y-4">
        <h2 className="text-base font-black text-[#14181D] uppercase tracking-wider flex items-center space-x-2">
          <Clock className="w-5 h-5 text-[#5A6470]" />
          <span>Touchpoint History ({touchpoints.length})</span>
        </h2>

        {touchpoints.length === 0 ? (
          <p className="text-xs text-[#5A6470] font-bold uppercase italic py-2">No touchpoints logged yet.</p>
        ) : (
          <div className="space-y-2.5">
            {touchpoints.map((tp) => (
              <div
                key={tp.id}
                className="bg-[#F4F6F8] border border-[#14181D] p-4 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center text-[#5A6470] font-mono">
                  <span className="font-black text-[#14181D] uppercase">{tp.touchpoint_day} Check-in</span>
                  <span>{formatDate(tp.created_at)}</span>
                </div>

                <div className="flex items-center space-x-3 font-bold uppercase text-[11px] text-[#14181D]">
                  <span>Sentiment: {'★'.repeat(tp.sentiment_score || 0)}</span>
                  <span>•</span>
                  <span>Would pay: {tp.would_they_pay_signal || 'N/A'}</span>
                  <span>•</span>
                  <span>Tier set: {tp.tier_set || 'N/A'}</span>
                </div>

                {tp.confusion_point && (
                  <p className="text-[#14181D]">
                    <strong className="text-[#5A6470] uppercase">Confusion:</strong> "{tp.confusion_point}"
                  </p>
                )}

                {tp.feature_request && (
                  <p className="text-[#14181D]">
                    <strong className="text-[#5A6470] uppercase">Requested Feature:</strong> "{tp.feature_request}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOUCHPOINT DRAWER / MODAL */}
      {showTouchpointDrawer && (
        <div className="fixed inset-0 z-50 bg-[#14181D]/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border border-[#14181D] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b-2 border-[#14181D] flex items-center justify-between bg-[#F4F6F8]">
              <div>
                <h3 className="text-base font-black text-[#14181D] uppercase">Log Field Touchpoint</h3>
                <p className="text-xs font-bold text-[#5A6470] uppercase">Feedback for {shop.name}</p>
              </div>
              <button
                onClick={() => setShowTouchpointDrawer(false)}
                className="w-8 h-8 bg-[#FFFFFF] border border-[#14181D] text-[#14181D] hover:bg-[#006838] hover:text-white flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTouchpoint} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs font-bold uppercase">
              <div>
                <label className="text-[#14181D] block mb-1">Check-in Milestone</label>
                <select
                  value={touchpointDay}
                  onChange={(e) => setTouchpointDay(e.target.value as any)}
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-[#14181D] focus:outline-none min-h-[44px]"
                >
                  <option value="Day 0">Day 0 (Onboarding)</option>
                  <option value="Day 1">Day 1 (Quick Pulse)</option>
                  <option value="Day 3">Day 3 (Habit Check)</option>
                  <option value="Day 7">Day 7 (Weekly Review)</option>
                  <option value="Day 14">Day 14 (Feature Depth)</option>
                  <option value="Day 21">Day 21 (Pre-Conversion)</option>
                  <option value="Day 30">Day 30 (Exit Interview)</option>
                  <option value="Extra Check-in">Extra Check-in</option>
                </select>
              </div>

              {/* Sentiment */}
              <div>
                <label className="text-[#14181D] block mb-1.5">
                  Merchant Sentiment (1 = Frustrated, 5 = Enthusiastic)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSentimentScore(score)}
                      className={`py-3 border border-[#14181D] font-black transition min-h-[44px] ${
                        sentimentScore === score
                          ? 'bg-[#14181D] text-white'
                          : 'bg-[#F4F6F8] text-[#14181D] hover:bg-[#FFFFFF]'
                      }`}
                    >
                      {score} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage Signals */}
              <div>
                <label className="text-[#14181D] block mb-1.5">Observed Usage Signals</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'added_product', label: 'Added Product' },
                    { id: 'recorded_sale', label: 'Recorded Sale' },
                    { id: 'added_debt', label: 'Tracked Debt' },
                    { id: 'collected_debt', label: 'Collected Debt' },
                    { id: 'shared_catalog', label: 'Shared Catalog' },
                    { id: 'added_staff', label: 'Added Staff' },
                  ].map((signal) => {
                    const checked = usageSignals.includes(signal.id);
                    return (
                      <button
                        key={signal.id}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setUsageSignals(usageSignals.filter((s) => s !== signal.id));
                          } else {
                            setUsageSignals([...usageSignals, signal.id]);
                          }
                        }}
                        className={`p-2.5 border border-[#14181D] text-left transition flex items-center space-x-2 ${
                          checked
                            ? 'bg-[#14181D] text-white'
                            : 'bg-[#F4F6F8] text-[#14181D]'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 border border-[#14181D] flex items-center justify-center ${checked ? 'bg-[#006838] text-white' : 'bg-[#FFFFFF]'}`}>
                          {checked && '✓'}
                        </span>
                        <span className="truncate">{signal.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confusion Point */}
              <div>
                <label className="text-[#14181D] block mb-1">Verbatim Confusion Point</label>
                <textarea
                  rows={2}
                  value={confusionPoint}
                  onChange={(e) => setConfusionPoint(e.target.value)}
                  placeholder="What specifically confused the merchant?"
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-[#14181D] placeholder-[#5A6470] focus:outline-none"
                />
              </div>

              {/* Feature Request */}
              <div>
                <label className="text-[#14181D] block mb-1">Feature Request</label>
                <input
                  type="text"
                  value={featureRequest}
                  onChange={(e) => setFeatureRequest(e.target.value)}
                  placeholder="e.g. Bluetooth thermal printer 58mm..."
                  className="w-full bg-[#FFFFFF] border border-[#14181D] p-2.5 text-[#14181D] placeholder-[#5A6470] focus:outline-none"
                />
              </div>

              {/* Would They Pay Signal */}
              <div>
                <label className="text-[#14181D] block mb-1.5">Would They Pay Signal</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'maybe', 'no'] as const).map((sig) => (
                    <button
                      key={sig}
                      type="button"
                      onClick={() => setWouldTheyPaySignal(sig)}
                      className={`py-2.5 border border-[#14181D] text-xs font-black uppercase transition ${
                        wouldTheyPaySignal === sig
                          ? sig === 'yes'
                            ? 'bg-[#2E7D32] text-white'
                            : sig === 'maybe'
                            ? 'bg-[#FDD835] text-[#14181D]'
                            : 'bg-[#006838] text-white'
                          : 'bg-[#F4F6F8] text-[#14181D]'
                      }`}
                    >
                      {sig}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Set */}
              <div>
                <label className="text-[#14181D] block mb-1.5">Set Engagement Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['green', 'yellow', 'red'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setTierSet(tier)}
                      className={`py-2.5 border border-[#14181D] text-xs font-black uppercase transition ${
                        tierSet === tier
                          ? tier === 'green'
                            ? 'bg-[#2E7D32] text-white'
                            : tier === 'yellow'
                            ? 'bg-[#FDD835] text-[#14181D]'
                            : 'bg-[#006838] text-white'
                          : 'bg-[#F4F6F8] text-[#14181D]'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingTouchpoint}
                  className="w-full py-3.5 px-4 bg-[#006838] hover:bg-[#004D2A] text-white font-black uppercase tracking-wider border border-[#14181D] transition disabled:opacity-50 min-h-[48px]"
                >
                  {savingTouchpoint ? 'Saving...' : 'Save Touchpoint Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
