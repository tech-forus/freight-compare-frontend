import React from 'react';
import {
  CheckCircle2,
  DollarSign,
  User,
  Building2,
  FileText,
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
  vendorMode?: 'existing' | 'new_with_pincodes' | 'new_without_pincodes' | null;
  warnings?: string[];
}

/* ── Circular progress ring ── */
const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number }> = ({
  pct,
  size = 64,
  stroke = 5,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    pct === 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#94a3b8';

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90 drop-shadow-sm">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
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
}) => {
  // ── Completion calc (based on 4 steps navigation state) ──
  const totalSteps = 4;
  let completedSteps: number = currentStep;

  if (!vendorName || vendorName.trim() === '') {
    completedSteps = 0;
  }

  const completionPct = (completedSteps / totalSteps) * 100;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] flex flex-col flex-1">
        {/* ── Section 1: Completion Ring ── */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 border-b border-slate-100/60 rounded-t-2xl relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative">
              <div className="bg-white rounded-full shadow-sm p-1">
                <ProgressRing pct={completionPct} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${completionPct === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {completionPct}%
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800 tracking-tight">
                {completionPct === 100
                  ? 'Ready to save!'
                  : completionPct >= 60
                    ? 'Almost there'
                    : 'Getting started'}
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {completedSteps} of {totalSteps} steps completed
              </p>

              {vendorName && (
                <div className="mt-2.5 flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg py-1 px-2 w-fit shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[110px]">{vendorName}</span>
                  {vendorCode && (
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100/80 px-1 py-0.5 rounded shrink-0">#{vendorCode}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Vendor Setup Process ── */}
        <div className="p-4 bg-white flex-1 rounded-b-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Setup Progress
          </p>
          <div className="relative isolate space-y-3">
            {/* Connecting Vertical Track */}
            <div className="absolute left-[13px] top-[14px] bottom-[14px] w-[2px] bg-slate-100 -z-10" />

            {[
              {
                step: 1,
                title: 'Vendor Profile',
                desc: 'Find or add new',
                icon: <Building2 className="w-3.5 h-3.5" />,
                isDone: !!vendorName,
                isActive: currentStep === 1
              },
              {
                step: 2,
                title: 'Pricing Matrix',
                desc: 'Zones & rates',
                icon: <DollarSign className="w-3.5 h-3.5" />,
                isDone: zonesCount > 0 && hasPricing,
                isActive: currentStep === 2
              },
              {
                step: 3,
                title: 'Company Data',
                desc: 'Contact & GST info',
                icon: <User className="w-3.5 h-3.5" />,
                isDone: hasCompanyInfo && hasContactInfo && hasGST,
                isActive: currentStep === 3
              },
              {
                step: 4,
                title: 'Other Charges',
                desc: 'Handling & DACC',
                icon: <FileText className="w-3.5 h-3.5" />,
                isDone: hasCharges,
                isActive: currentStep === 4
              }
            ].map((s) => {
              const isActive = s.isActive;

              const dotClass = isActive
                ? 'bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.1)] ring-1 ring-blue-600'
                : s.isDone
                  ? 'bg-emerald-500 text-white ring-1 ring-emerald-500'
                  : 'bg-white text-slate-300 border-[1.5px] border-slate-200';

              const cardClass = isActive
                ? 'bg-blue-50/50 border-blue-100 shadow-sm'
                : s.isDone
                  ? 'bg-transparent border-transparent'
                  : 'bg-transparent border-transparent opacity-60';

              return (
                <div key={s.step} className="group relative z-10 flex gap-3.5">
                  <div className={`mt-1 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${dotClass}`}>
                    {s.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                  </div>

                  <div className={`flex-1 min-w-0 p-2.5 rounded-xl border transition-all duration-200 ${cardClass}`}>
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className={`text-[12px] font-bold ${isActive ? 'text-blue-900' : s.isDone ? 'text-slate-700' : 'text-slate-600'}`}>
                        {s.title}
                      </h4>
                      <div className={`p-1 rounded-md shrink-0 flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-600' : s.isDone ? 'bg-slate-50 text-emerald-500' : 'text-slate-300'}`}>
                        {s.icon}
                      </div>
                    </div>
                    <p className={`text-[10px] mt-0.5 leading-snug ${isActive ? 'text-blue-700/80' : 'text-slate-500'}`}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── All done state ── */}
        {completionPct === 100 && (
          <div className="p-3 bg-emerald-50/80 border-t border-emerald-100/50 rounded-b-2xl">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-[14px] h-[14px] text-emerald-600" />
              </div>
              <span className="font-semibold text-xs tracking-tight">Ready to save vendor</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorSidePanel;
