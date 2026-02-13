import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronRight,
  Truck,
  MapPin,
  DollarSign,
  Shield,
  User,
  Building2,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface VendorSidePanelProps {
  currentStep: 1 | 2 | 3 | 4;
  vendorName?: string;
  vendorCode?: string;
  transportMode?: string;
  serviceMode?: string;
  zonesCount: number;
  pincodeCount: number;
  matrixSize: { rows: number; cols: number };
  hasCompanyInfo: boolean;
  hasContactInfo: boolean;
  hasGST: boolean;
  hasCharges: boolean;
  hasPricing: boolean;
  isAutoFilled: boolean;
  autoFilledFrom?: string | null;
  vendorMode: 'existing' | 'new_with_pincodes' | 'new_without_pincodes' | null;
  warnings?: string[];
}

/* ── Circular progress ring ── */
const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number }> = ({
  pct,
  size = 72,
  stroke = 6,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct === 100 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#94a3b8';

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
};

/* ── Step progress row ── */
interface StepRowProps {
  step: number;
  label: string;
  icon: React.ReactNode;
  done: boolean;
  active: boolean;
  items: { label: string; done: boolean }[];
}

const StepRow: React.FC<StepRowProps> = ({ step, label, icon, done, active, items }) => {
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  return (
    <div
      className={`rounded-lg transition-all ${
        active
          ? 'bg-green-50 border border-green-200 p-3'
          : 'px-3 py-2'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            allDone
              ? 'bg-green-500 text-white'
              : active
              ? 'bg-green-500 text-white'
              : 'bg-slate-200 text-slate-500'
          }`}
        >
          {allDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${active ? 'text-green-800' : allDone ? 'text-green-700' : 'text-slate-500'}`}>
              {label}
            </span>
            {active && (
              <ChevronRight className="w-3 h-3 text-green-500" />
            )}
          </div>
        </div>
        <span className={`text-[10px] font-medium ${allDone ? 'text-green-600' : active ? 'text-green-700' : 'text-slate-400'}`}>
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Expanded items for active step */}
      {active && (
        <div className="mt-2 ml-8 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              {item.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
              <span className={item.done ? 'text-green-700' : 'text-slate-500'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const VendorSidePanel: React.FC<VendorSidePanelProps> = ({
  currentStep,
  vendorName,
  vendorCode,
  transportMode,
  serviceMode,
  zonesCount,
  pincodeCount,
  matrixSize,
  hasCompanyInfo,
  hasContactInfo,
  hasGST,
  hasCharges,
  hasPricing,
  isAutoFilled,
  autoFilledFrom,
  vendorMode,
  warnings = [],
}) => {
  // ── Completion calc ──
  const allChecks = [hasCompanyInfo, hasContactInfo, hasGST, zonesCount > 0, hasPricing, hasCharges];
  const doneCount = allChecks.filter(Boolean).length;
  const completionPct = Math.round((doneCount / allChecks.length) * 100);

  // ── Per-step items ──
  const stepData: StepRowProps[] = [
    {
      step: 1,
      label: 'Find Vendor',
      icon: <Building2 className="w-3.5 h-3.5" />,
      done: !!vendorName,
      active: currentStep === 1,
      items: [
        { label: 'Vendor selected', done: !!vendorName },
      ],
    },
    {
      step: 2,
      label: 'Pricing',
      icon: <DollarSign className="w-3.5 h-3.5" />,
      done: zonesCount > 0 && hasPricing,
      active: currentStep === 2,
      items: [
        { label: `Zones configured${zonesCount > 0 ? ` (${zonesCount})` : ''}`, done: zonesCount > 0 },
        { label: `Price matrix${matrixSize.rows > 0 ? ` ${matrixSize.rows}×${matrixSize.cols}` : ''}`, done: hasPricing },
        ...(pincodeCount > 0 ? [{ label: `${pincodeCount.toLocaleString()} pincodes mapped`, done: true }] : []),
      ],
    },
    {
      step: 3,
      label: 'Details',
      icon: <User className="w-3.5 h-3.5" />,
      done: hasCompanyInfo && hasContactInfo && hasGST,
      active: currentStep === 3,
      items: [
        { label: 'Company info', done: hasCompanyInfo },
        { label: 'Contact details', done: hasContactInfo },
        { label: 'GST number', done: hasGST },
      ],
    },
    {
      step: 4,
      label: 'Charges',
      icon: <FileText className="w-3.5 h-3.5" />,
      done: hasCharges,
      active: currentStep === 4,
      items: [
        { label: 'Charges defined', done: hasCharges },
      ],
    },
  ];

  // ── Action items (blockers) ──
  const actionItems: string[] = [];
  if (!vendorName) actionItems.push('Select or create a vendor');
  if (zonesCount === 0) actionItems.push('Configure at least one zone');
  if (!hasPricing) actionItems.push('Set up pricing matrix');
  if (!hasCompanyInfo) actionItems.push('Add company name');
  if (!hasGST) actionItems.push('Provide GST number');
  if (!hasCharges) actionItems.push('Define charges');

  // ── Profile items (only show what's filled) ──
  const profileItems: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (transportMode) {
    profileItems.push({
      icon: <Truck className="w-3.5 h-3.5" />,
      label: 'Transport',
      value: transportMode.charAt(0).toUpperCase() + transportMode.slice(1),
    });
  }
  if (serviceMode) {
    profileItems.push({
      icon: <FileText className="w-3.5 h-3.5" />,
      label: 'Service',
      value: serviceMode,
    });
  }
  if (zonesCount > 0) {
    profileItems.push({
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: 'Zones',
      value: `${zonesCount} zone${zonesCount !== 1 ? 's' : ''}`,
    });
  }
  if (hasGST) {
    profileItems.push({
      icon: <Shield className="w-3.5 h-3.5" />,
      label: 'GST',
      value: 'Verified',
    });
  }

  return (
    <div className="w-full sticky top-0 self-start max-h-[calc(100vh-80px)] overflow-y-auto pt-0 px-3 pb-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-0">
        {/* ── Section 1: Completion Ring ── */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing pct={completionPct} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-base font-bold ${completionPct === 100 ? 'text-green-600' : 'text-slate-700'}`}>
                  {completionPct}%
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">
                {completionPct === 100
                  ? 'Ready to save!'
                  : completionPct >= 60
                  ? 'Almost there'
                  : 'Getting started'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {doneCount} of {allChecks.length} requirements met
              </p>
              {vendorName && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-green-100 text-green-600 grid place-items-center">
                    <Building2 className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 truncate">{vendorName}</span>
                  {vendorCode && (
                    <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">#{vendorCode}</span>
                  )}
                </div>
              )}
              {isAutoFilled && autoFilledFrom && (
                <p className="text-[10px] text-green-600 mt-1">Auto-filled from {autoFilledFrom}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Step-by-Step Progress ── */}
        <div className="p-4 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Step Progress
          </p>
          <div className="space-y-1">
            {stepData.map((s) => (
              <StepRow key={s.step} {...s} />
            ))}
          </div>
        </div>

        {/* ── Section 3: Vendor Profile (growing) ── */}
        {profileItems.length > 0 && (
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Configuration
            </p>
            <div className="space-y-2">
              {profileItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="text-xs font-semibold text-slate-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 4: Action Items ── */}
        {actionItems.length > 0 && completionPct < 100 && (
          <div className="p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              To Complete
            </p>
            <div className="space-y-1.5">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-amber-700">
                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All done state ── */}
        {completionPct === 100 && (
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className="font-medium">All requirements met. You can save this vendor.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorSidePanel;
