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
      <div className="px-6 pt-4 pb-3 flex items-start justify-center">
        <div className="flex items-start w-full max-w-xl">
          {STEPS.map((step, i) => {
            const isDone = step.id < currentStep;
            const isActive = step.id === currentStep;
            const isClickable = step.id <= currentStep;

            return (
              <React.Fragment key={step.id}>
                {/* Step circle + label */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepChange(step.id)}
                    disabled={!isClickable}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                      isDone
                        ? 'bg-green-500 border-green-500 text-white cursor-pointer hover:bg-green-600 hover:border-green-600'
                        : isActive
                        ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                        : 'bg-white border-slate-300 text-slate-400 cursor-default'
                    }`}
                  >
                    {isDone ? <Check className="w-4.5 h-4.5" strokeWidth={3} /> : step.id}
                  </button>
                  <span
                    className={`mt-2 text-xs font-medium whitespace-nowrap ${
                      isDone || isActive ? 'text-green-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mt-[18px] px-1">
                    <div
                      className={`h-[3px] rounded-full transition-colors ${
                        step.id < currentStep ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={onReset}
          className="ml-6 mt-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
        >
          Reset
        </button>
      </div>

      {/* Context strip — visible after step 1 when vendor is known */}
      {currentStep > 1 && vendorName && (
        <div className="px-6 py-1.5 bg-green-50/60 border-t border-green-100 flex items-center gap-5 text-[11px] text-slate-600 overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{vendorName}</span>
          </span>
          {transportMode && (
            <span className="flex items-center gap-1">
              <span className="uppercase px-1.5 py-0.5 rounded bg-green-100 font-semibold text-green-800">{transportMode}</span>
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
