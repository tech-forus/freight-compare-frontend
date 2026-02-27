import React from 'react';
import { Check } from 'lucide-react';

interface StepDef {
  id: 1 | 2 | 3 | 4;
  label: string;
}

const STEPS: StepDef[] = [
  { id: 1, label: 'Find Vendor' },
  { id: 2, label: 'Pricing' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Charges' },
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
    <div className="select-none">
      {/* Stepper row */}
      <div className="px-6 pt-6 pb-12 flex flex-col items-center justify-center relative">
        <div className="flex items-start w-full max-w-3xl justify-between relative z-10">
          {STEPS.map((step, i) => {
            const isDone = step.id < currentStep;
            const isActive = step.id === currentStep;
            // A step is clickable if it's the current step, a past step, or an upcoming step that has already been populated
            let isClickable = step.id <= currentStep;

            // Allow clicking forward to steps we've already "unlocked"
            if (vendorName) {
              if (step.id === 2) isClickable = true; // Can always go to pricing if vendor is selected
              if (step.id === 3 && (zonesCount > 0 || pricingReady)) isClickable = true; // Can go to details if pricing is done
              if (step.id === 4 && (zonesCount > 0 || pricingReady)) isClickable = true; // Can go to charges if pricing is done
            }

            return (
              <React.Fragment key={step.id}>
                {/* Step circle + label */}
                <div className="flex flex-col items-center z-20 relative px-2">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepChange(step.id)}
                    disabled={!isClickable}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${isDone
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer hover:shadow-lg hover:scale-105'
                      : isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 scale-110 ring-4 ring-blue-100'
                        : 'bg-white border-2 border-slate-200 text-slate-400 cursor-default'
                      }`}
                  >
                    {isDone ? <Check className="w-6 h-6" strokeWidth={3} /> : <span className="text-lg font-bold">{step.id}</span>}
                  </button>
                  <span
                    className={`absolute -bottom-8 whitespace-nowrap text-sm font-bold transition-colors ${isDone || isActive ? 'text-indigo-900' : 'text-slate-400'
                      }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mt-[22px] px-2 z-0 relative">
                    <div className="h-[4px] rounded-full bg-slate-200 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out flex-1 w-full"
                        style={{ transform: `translateX(${step.id < currentStep ? '0%' : '-100%'})` }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Reset button - ABSOLUTE to prevent layout shift */}
        <button
          type="button"
          onClick={onReset}
          className="absolute right-6 top-6 px-4 py-2 text-sm font-bold rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
        >
          Reset Setup
        </button>
      </div>

      {/* Context strip — visible after step 1 when vendor is known */}
      {currentStep > 1 && vendorName && (
        <div className="px-6 py-2.5 bg-blue-50/80 border-t border-blue-100 flex items-center gap-6 text-[13px] text-slate-700 overflow-x-auto">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-bold text-blue-900 truncate max-w-[200px]">{vendorName}</span>
          </span>
          {transportMode && (
            <span className="flex items-center gap-1">
              <span className="uppercase px-2 py-0.5 rounded-md bg-white border border-blue-200 shadow-sm font-bold text-blue-800 tracking-wider text-xs">{transportMode}</span>
            </span>
          )}
          <span className={`flex items-center gap-1.5 font-semibold ${zonesCount > 0 ? 'text-indigo-700' : 'text-amber-600'}`}>
            {zonesCount > 0 ? `${zonesCount} zones active` : 'No zones yet'}
          </span>
          {pricingReady !== undefined && (
            <span className={`flex items-center gap-1.5 font-semibold ${pricingReady ? 'text-indigo-700' : 'text-amber-600'}`}>
              Pricing: {pricingReady ? 'Ready' : 'Incomplete'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorStepBar;
