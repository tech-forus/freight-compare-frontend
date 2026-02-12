import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Building2, MapPin, DollarSign, FileText, Truck } from 'lucide-react';

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

interface CheckItemProps {
  label: string;
  done: boolean;
  active?: boolean;
}

const CheckItem: React.FC<CheckItemProps> = ({ label, done, active }) => (
  <div className={`flex items-center gap-2 py-1 text-[11px] ${active ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
    {done ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
    ) : (
      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
    )}
    <span className="truncate">{label}</span>
  </div>
);

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
  const totalChecks = 6;
  const doneChecks = [hasCompanyInfo, hasContactInfo, hasGST, hasPricing, hasCharges, zonesCount > 0].filter(Boolean).length;
  const completionPct = Math.round((doneChecks / totalChecks) * 100);

  return (
    <div className="w-full space-y-3 sticky top-[108px] self-start max-h-[calc(100vh-160px)] overflow-y-auto p-4">
      {/* Vendor Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 grid place-items-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {vendorName || 'No vendor selected'}
            </p>
            {vendorCode && (
              <p className="text-[10px] text-slate-500 font-mono">{vendorCode}</p>
            )}
          </div>
        </div>

        {isAutoFilled && autoFilledFrom && (
          <div className="text-[10px] px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 mb-2">
            Auto-filled: {autoFilledFrom}
          </div>
        )}

        {vendorMode && (
          <div className={`text-[10px] px-2 py-1 rounded-md mb-2 ${vendorMode === 'existing'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
            {vendorMode === 'existing' ? 'Existing Vendor' :
              vendorMode === 'new_with_pincodes' ? 'New + Pincodes' : 'New (Manual)'}
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {transportMode && (
            <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 rounded px-1.5 py-1">
              <Truck className="w-3 h-3" />
              <span className="capitalize">{transportMode}</span>
            </div>
          )}
          {serviceMode && (
            <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 rounded px-1.5 py-1">
              <FileText className="w-3 h-3" />
              {serviceMode}
            </div>
          )}
          <div className={`flex items-center gap-1 text-[10px] rounded px-1.5 py-1 ${zonesCount > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>
            <MapPin className="w-3 h-3" />
            {zonesCount} zones
          </div>
          {pincodeCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 rounded px-1.5 py-1">
              <DollarSign className="w-3 h-3" />
              {pincodeCount} pins
            </div>
          )}
        </div>
      </div>

      {/* Completeness */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-700">Completeness</span>
          <span className={`text-[11px] font-bold ${completionPct === 100 ? 'text-green-600' : 'text-slate-500'}`}>
            {completionPct}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-green-500' : completionPct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
              }`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="space-y-0.5">
          <CheckItem label="Company Info" done={hasCompanyInfo} active={currentStep === 3} />
          <CheckItem label="Contact Details" done={hasContactInfo} active={currentStep === 3} />
          <CheckItem label="GST Number" done={hasGST} active={currentStep === 3} />
          <CheckItem label="Zones Configured" done={zonesCount > 0} active={currentStep === 2} />
          <CheckItem label="Pricing Setup" done={hasPricing} active={currentStep === 2} />
          <CheckItem label="Charges Defined" done={hasCharges} active={currentStep === 4} />
        </div>
      </div>

      {/* Pricing coverage */}
      {(zonesCount > 0 || matrixSize.rows > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Pricing Coverage</span>
          <div className="text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Matrix</span>
              <span className="font-mono font-semibold">{matrixSize.rows}×{matrixSize.cols}</span>
            </div>
            {pincodeCount > 0 && (
              <div className="flex justify-between">
                <span>Pincodes</span>
                <span className="font-mono font-semibold">{pincodeCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-800">Warnings</span>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[10px] text-amber-700 flex gap-1">
                <span className="shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step help */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[11px] font-bold text-slate-600 block mb-1">
          Step {currentStep} of 4
        </span>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {currentStep === 1 && 'Search for an existing vendor or create a new one. This determines your pricing workflow.'}
          {currentStep === 2 && 'Configure zones and pricing. Upload pincodes, use the wizard, or import a CSV.'}
          {currentStep === 3 && 'Fill in company details, contact information, GST, address, and transport configuration.'}
          {currentStep === 4 && 'Set charges (docket, handling, ROV, COD, etc.) and save the vendor.'}
        </p>
      </div>
    </div>
  );
};

export default VendorSidePanel;
