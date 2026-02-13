import React from 'react';
import { CheckCircle2, Search, DollarSign, Building2, FileText } from 'lucide-react';

interface StepDef {
  id: 1 | 2 | 3 | 4;
  label: string;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  { id: 1, label: 'Find Vendor', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 2, label: 'Pricing', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: 3, label: 'Details', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 4, label: 'Charges', icon: <FileText className="w-3.5 h-3.5" /> },
];

interface VendorStepBarProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  vendorName?: string;
  transportMode?: string;
  zonesCount?: number;
  pricingReady?: boolean;
  onReset: () => void;
}

export const VendorStepBar: React.FC<VendorStepBarProps> = ({
  currentStep,
  onStepChange,
  vendorName,
  transportMode,
  zonesCount = 0,
  pricingReady,
  onReset,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm select-none">
      {/* Step indicator row */}
      <div className="px-5 py-2 flex items-center gap-3">
        {/* Logo */}
        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm shrink-0">
          F
        </div>

        {/* Steps */}
        <div className="flex items-center gap-0.5 flex-1">
          {STEPS.map((step, i) => {
            const isActive = currentStep === step.id;
            const isDone = step.id < currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <React.Fragment key={step.id}>
                {i > 0 && (
                  <div className={`w-6 h-px mx-0.5 transition-colors ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && onStepChange(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : isDone
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                      : 'bg-slate-50 text-slate-400 cursor-default'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {step.id}
                    </span>
                  )}
                  {step.icon}
                  {step.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right actions */}
        <button
          type="button"
          onClick={onReset}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
        >
          Reset
        </button>
      </div>

      {/* Context header strip — visible after step 1 when vendor is known */}
      {currentStep > 1 && vendorName && (
        <div className="px-5 py-1.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-t border-slate-100 flex items-center gap-5 text-[11px] text-slate-600 overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{vendorName}</span>
          </span>
          {transportMode && (
            <span className="flex items-center gap-1">
              <span className="uppercase px-1.5 py-0.5 rounded bg-slate-200/80 font-semibold text-slate-700">{transportMode}</span>
            </span>
          )}
          <span className={`flex items-center gap-1 ${zonesCount > 0 ? 'text-green-700' : 'text-amber-600'}`}>
            {zonesCount > 0 ? `${zonesCount} zones` : 'No zones yet'}
          </span>
          {pricingReady !== undefined && (
            <span className={`flex items-center gap-1 ${pricingReady ? 'text-green-700' : 'text-amber-600'}`}>
              Pricing: {pricingReady ? 'Ready' : 'Incomplete'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorStepBar;
