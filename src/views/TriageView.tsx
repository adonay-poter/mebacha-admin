import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Copy,
  Check,
  Users,
  FileText,
  X,
} from 'lucide-react';
import { PilotIssue, IssueSeverity, IssueStatus, Shop } from '../types';
import { formatDate } from '../lib/engagement';
import { supabase } from '../lib/supabase';

interface TriageViewProps {
  issues: PilotIssue[];
  shops: Shop[];
  onRefreshIssues: () => Promise<void>;
  onSelectShop: (shopId: string) => void;
}

export const TriageView: React.FC<TriageViewProps> = ({
  issues,
  shops,
  onRefreshIssues,
  onSelectShop,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortByFrequency, setSortByFrequency] = useState<boolean>(true);

  // New Issue Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reproSteps, setReproSteps] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('minor');
  const [status, setStatus] = useState<IssueStatus>('open');
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Friday Digest Modal
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [copiedDigest, setCopiedDigest] = useState(false);

  // Filter & Sort
  const filteredIssues = issues
    .filter((issue) => {
      const matchSev = severityFilter === 'all' || issue.severity === severityFilter;
      const matchStat = statusFilter === 'all' || issue.status === statusFilter;
      return matchSev && matchStat;
    })
    .sort((a, b) => {
      if (sortByFrequency) {
        return (b.affected_shop_ids?.length || 0) - (a.affected_shop_ids?.length || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Handle Create Issue
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('pilot_issues').insert({
        title: title.trim(),
        description: description.trim() || null,
        reproduction_steps: reproSteps.trim() || null,
        severity,
        status,
        affected_shop_ids: selectedShopIds,
      });

      if (error) throw error;

      setShowNewModal(false);
      setTitle('');
      setDescription('');
      setReproSteps('');
      setSelectedShopIds([]);
      await onRefreshIssues();
    } catch (err: any) {
      alert(`Error creating issue: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      await supabase
        .from('pilot_issues')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      await onRefreshIssues();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Generate Friday Digest Text
  const blockers = issues.filter((i) => i.severity === 'blocker' && i.status !== 'resolved');
  const majors = issues.filter((i) => i.severity === 'major' && i.status !== 'resolved');
  const featureRequests = issues
    .filter((i) => i.severity === 'feature_request')
    .sort((a, b) => (b.affected_shop_ids?.length || 0) - (a.affected_shop_ids?.length || 0))
    .slice(0, 3);

  const greenCount = shops.filter((s) => s.computed_tier === 'green').length;
  const yellowCount = shops.filter((s) => s.computed_tier === 'yellow').length;
  const redCount = shops.filter((s) => s.computed_tier === 'red').length;

  const fridayDigestText = `🚀 *MEBACHA PILOT WEEKLY OPS DIGEST*
📅 Week Ending: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

📊 *MERCHANT ENGAGEMENT HEALTH*
🟢 Green (Active Habit): ${greenCount} shops
🟡 Yellow (Gap / At Risk): ${yellowCount} shops
🔴 Red (Inactive / Blocked): ${redCount} shops

🚨 *ACTIVE BLOCKERS (${blockers.length})*
${blockers.length === 0 ? '• None! All critical flows operating smoothly.' : blockers.map((b) => `• *${b.title}* (${b.affected_shop_ids?.length || 0} shops affected)`).join('\n')}

⚠️ *MAJOR OPERATIONAL ISSUES (${majors.length})*
${majors.length === 0 ? '• No major defects reported this week.' : majors.map((m) => `• ${m.title} (${m.affected_shop_ids?.length || 0} shops)`).join('\n')}

💡 *TOP 3 MERCHANT FEATURE REQUESTS (BY SHOP FREQUENCY)*
${featureRequests.map((f, idx) => `${idx + 1}. *${f.title}* — requested by ${f.affected_shop_ids?.length || 0} merchants`).join('\n')}

Cc: @mebacha_core_team`;

  const copyDigest = () => {
    navigator.clipboard.writeText(fridayDigestText);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2500);
  };

  const getShopName = (id: string) => {
    return shops.find((s) => s.id === id)?.name || id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Bauhaus Geometric Header) */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#1E88E5] text-white border border-[#14181D]">
              PILOT TRIAGE & ENGINEERING SYNC
            </span>
            <span className="px-2 py-0.5 bg-[#FDD835] text-[#14181D] border border-[#14181D] text-[10px] font-black uppercase">
              {filteredIssues.length} ISSUES
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14181D] tracking-tight uppercase leading-none">
            Bugs & Feedback Triage
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#5A6470] mt-2 max-w-2xl">
            Aggregated merchant friction points with multi-shop frequency tracking & weekly Friday engineering digests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDigestModal(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-[#FDD835] hover:bg-yellow-400 text-[#14181D] border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-[#14181D]" />
            <span>Friday Digest</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-[#006838] hover:bg-[#004D2A] text-white border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Bug / Feature</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort Toolbar (Bauhaus Flat Plane) */}
      <div className="bg-[#FFFFFF] border border-[#14181D] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-[#14181D] p-2 text-xs font-black uppercase text-[#14181D] focus:outline-none focus:border-[#006838] min-h-[40px]"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="blocker">🚨 1 - BLOCKER</option>
            <option value="major">⚠️ 2 - MAJOR</option>
            <option value="minor">🔧 3 - MINOR</option>
            <option value="feature_request">💡 4 - FEATURE REQUEST</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#14181D] p-2 text-xs font-black uppercase text-[#14181D] focus:outline-none focus:border-[#006838] min-h-[40px]"
          >
            <option value="all">ALL STATUSES</option>
            <option value="open">OPEN</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="resolved">RESOLVED</option>
          </select>
        </div>

        {/* Sort by Frequency */}
        <button
          onClick={() => setSortByFrequency(!sortByFrequency)}
          className={`flex items-center space-x-2 px-3 py-2 border border-[#14181D] text-xs font-black uppercase tracking-wider transition min-h-[40px] ${
            sortByFrequency
              ? 'bg-[#1E88E5] text-white'
              : 'bg-white text-[#14181D] hover:bg-[#F4F6F8]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Sort by Shop Count ({sortByFrequency ? 'Highest First' : 'Recent'})</span>
        </button>
      </div>

      {/* Issues Board */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#14181D] p-8">
            <CheckCircle2 className="w-10 h-10 text-[#2E7D32] mx-auto mb-2" />
            <p className="text-sm font-black text-[#14181D] uppercase tracking-wide">
              No issues found matching filters
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const shopCount = issue.affected_shop_ids?.length || 0;
            return (
              <div
                key={issue.id}
                className="bg-[#FFFFFF] border border-[#14181D] p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity Pill */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-[#14181D] ${
                          issue.severity === 'blocker'
                            ? 'bg-[#006838] text-white'
                            : issue.severity === 'major'
                            ? 'bg-[#FDD835] text-[#14181D]'
                            : issue.severity === 'feature_request'
                            ? 'bg-[#1E88E5] text-white'
                            : 'bg-[#E0E0E0] text-[#14181D]'
                        }`}
                      >
                        {issue.severity.replace(/_/g, ' ')}
                      </span>

                      {/* Frequency Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#14181D] text-white border border-[#14181D] text-[10px] font-black uppercase tracking-wider">
                        <Users className="w-3 h-3 mr-1" />
                        {shopCount} {shopCount === 1 ? 'Shop' : 'Shops'} Affected
                      </span>

                      <span className="text-[11px] font-bold text-[#5A6470] uppercase">
                        LOGGED {formatDate(issue.created_at)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[#14181D] uppercase tracking-tight">
                      {issue.title}
                    </h3>

                    {issue.description && (
                      <p className="text-xs text-[#5A6470] font-medium leading-relaxed">
                        {issue.description}
                      </p>
                    )}

                    {issue.reproduction_steps && (
                      <div className="p-3 bg-[#F4F6F8] border border-[#14181D] text-xs text-[#14181D] font-mono leading-relaxed">
                        <strong className="text-[#14181D] uppercase font-bold">Repro Steps:</strong> {issue.reproduction_steps}
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <select
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue.id, e.target.value as any)}
                      className={`px-3 py-1.5 text-xs font-black uppercase border border-[#14181D] min-h-[38px] ${
                        issue.status === 'resolved'
                          ? 'bg-[#2E7D32] text-white'
                          : issue.status === 'in_progress'
                          ? 'bg-[#FDD835] text-[#14181D]'
                          : 'bg-white text-[#14181D]'
                      }`}
                    >
                      <option value="open">OPEN</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                    </select>
                  </div>
                </div>

                {/* Attached Shops List */}
                {shopCount > 0 && (
                  <div className="pt-3 border-t border-[#14181D]/20 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-black text-[#5A6470] uppercase mr-1">
                      AFFECTED SHOPS:
                    </span>
                    {issue.affected_shop_ids.map((id) => (
                      <button
                        key={id}
                        onClick={() => onSelectShop(id)}
                        className="px-2 py-0.5 bg-[#F4F6F8] hover:bg-[#14181D] hover:text-white border border-[#14181D] text-[11px] font-bold text-[#14181D] uppercase transition-none"
                      >
                        {getShopName(id)} ➔
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* NEW ISSUE MODAL (Bauhaus High-Contrast Sharp Modal) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#14181D] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b-2 border-[#14181D] flex items-center justify-between bg-[#F4F6F8]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#006838]">
                  TRIAGE ENTRY
                </span>
                <h3 className="text-base font-black text-[#14181D] uppercase tracking-tight">
                  Log Bug or Feature Request
                </h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-9 h-9 bg-white hover:bg-[#006838] hover:text-white border border-[#14181D] font-black flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1">
                  Issue / Feature Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Telebirr SMS verification button unresponsive in Bole"
                  className="w-full bg-white border border-[#14181D] p-3 text-xs font-bold text-[#14181D] placeholder-[#5A6470]/60 focus:bg-[#FFFDE7] focus:outline-none focus:border-[#006838]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-white border border-[#14181D] p-2.5 text-xs font-black uppercase text-[#14181D]"
                  >
                    <option value="blocker">1 - BLOCKER (AUTO-RED)</option>
                    <option value="major">2 - MAJOR DEFECT</option>
                    <option value="minor">3 - MINOR POLISH</option>
                    <option value="feature_request">4 - FEATURE REQUEST</option>
                  </select>
                </div>

                <div>
                  <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#14181D] p-2.5 text-xs font-black uppercase text-[#14181D]"
                  >
                    <option value="open">OPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What specifically failed or what was requested by merchant?"
                  className="w-full bg-white border border-[#14181D] p-3 text-xs font-medium text-[#14181D] placeholder-[#5A6470]/60 focus:bg-[#FFFDE7] focus:outline-none focus:border-[#006838]"
                />
              </div>

              <div>
                <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1">
                  Reproduction Steps
                </label>
                <textarea
                  rows={2}
                  value={reproSteps}
                  onChange={(e) => setReproSteps(e.target.value)}
                  placeholder="1. Go to POS... 2. Tap checkout with Telebirr... 3. Error code 500..."
                  className="w-full bg-white border border-[#14181D] p-3 text-xs font-mono text-[#14181D] placeholder-[#5A6470]/60 focus:bg-[#FFFDE7] focus:outline-none focus:border-[#006838]"
                />
              </div>

              {/* Multi-Shop Tagging */}
              <div>
                <label className="font-black text-[#14181D] uppercase tracking-wider block mb-1.5">
                  Attach Affected Pilot Shops ({selectedShopIds.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-[#F4F6F8] p-2 border border-[#14181D]">
                  {shops.map((s) => {
                    const isSelected = selectedShopIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedShopIds(selectedShopIds.filter((id) => id !== s.id));
                          } else {
                            setSelectedShopIds([...selectedShopIds, s.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 text-left text-xs transition-none border ${
                          isSelected
                            ? 'bg-[#14181D] text-white font-black border-[#14181D]'
                            : 'bg-white text-[#14181D] hover:bg-[#FDD835] font-bold border-[#14181D]/30'
                        }`}
                      >
                        <span className="truncate">{s.name} ({s.city || 'Addis Ababa'})</span>
                        <span className="font-mono">{isSelected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-[#006838] hover:bg-[#004D2A] text-white font-black uppercase tracking-wider border border-[#14181D] transition disabled:opacity-50 min-h-[48px]"
                >
                  {submitting ? 'SAVING TICKET...' : 'SAVE ISSUE TICKET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FRIDAY DIGEST MODAL (Bauhaus High-Contrast Modal) */}
      {showDigestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#14181D] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b-2 border-[#14181D] flex items-center justify-between bg-[#F4F6F8]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1E88E5]">
                  WEEKLY SYNTHESIS
                </span>
                <h3 className="text-base font-black text-[#14181D] uppercase tracking-tight flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#14181D]" />
                  <span>Friday Ops & Engineering Digest</span>
                </h3>
              </div>
              <button
                onClick={() => setShowDigestModal(false)}
                className="w-9 h-9 bg-white hover:bg-[#006838] hover:text-white border border-[#14181D] font-black flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <pre className="p-4 bg-[#14181D] border border-[#14181D] text-xs text-[#F4F6F8] font-mono whitespace-pre-wrap leading-relaxed select-all">
                {fridayDigestText}
              </pre>
            </div>

            <div className="p-4 border-t-2 border-[#14181D] bg-[#F4F6F8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-[11px] font-bold text-[#5A6470] uppercase">
                Generated from live Supabase issues & engagement tiers.
              </span>
              <button
                onClick={copyDigest}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#1E88E5] hover:bg-blue-700 text-white font-black uppercase tracking-wider border border-[#14181D] transition min-h-[44px]"
              >
                {copiedDigest ? (
                  <>
                    <Check className="w-4 h-4 text-[#FDD835]" />
                    <span>COPIED TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPY TELEGRAM / SLACK</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
