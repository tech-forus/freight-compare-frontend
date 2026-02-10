import React from 'react';
import { CalendarClock, Weight, DollarSign, Download, ArrowRight, MapPin, AlertCircle, Database, Layers } from 'lucide-react';
import VerificationBadge, { VerificationStatus } from './VerificationBadge';

// This component now expects a 'quotes' prop containing the real data from the backend.
// The hardcoded data has been removed.
const VendorComparison = ({ quotes = [] }) => {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-gray-500">No Quotes Available</h2>
        <p className="text-gray-400 mt-2">We couldn't find vendors for the details provided.</p>
      </div>
    );
  }

  // Utility functions remain the same
  const formatCurrency = (value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatWeight = (value) => `${value.toFixed(2)} kg`;

  // Find cheapest and fastest quotes from the real data
  const cheapestQuote = quotes.reduce((a, b) => a.totalCharges < b.totalCharges ? a : b);
  const fastestQuote = quotes.reduce((a, b) => a.estimatedTime < b.estimatedTime ? a : b);

  // Helper function to determine verification status
  // Logic:
  //   - isVerified === true -> verified (admin explicitly marked as verified)
  //   - isVerified === false/undefined + approved -> unverified (approved but not yet verified)
  //   - Otherwise -> unknown
  const getVerificationStatus = (quote): VerificationStatus => {
    if (quote.isVerified === true) {
      return 'verified';
    }
    if (quote.approvalStatus === 'approved') {
      return 'unverified';
    }
    return 'unknown';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Vendor Comparison</h2>

      {/* This is the CARD view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {quotes.map((quote) => (
          <div
            key={quote.companyId}
            className={`rounded-lg border p-4 transition-all ${
              quote.companyId === cheapestQuote.companyId
                ? 'border-green-300 bg-green-50 shadow-lg'
                : quote.companyId === fastestQuote.companyId
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            {/* ... Company name and logo part remains the same ... */}
            <div className="flex items-center gap-4 mb-3">
               <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center font-bold text-blue-600">
                 {quote.companyName.charAt(0)}
               </div>
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-bold text-lg">{quote.companyName}</h3>
                   <VerificationBadge status={getVerificationStatus(quote)} />
                   {quote.source === 'utsf' && (
                     <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                       <Database size={10} />
                       UTSF
                     </span>
                   )}
                   {quote.source !== 'utsf' && (
                     <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                       <Layers size={10} />
                       Demo
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                   {/* Best value badge */}
                   {quote.companyId === cheapestQuote.companyId && (
                     <span className="inline-block text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                       Best Value
                     </span>
                   )}
                   {quote.companyId === fastestQuote.companyId && quote.companyId !== cheapestQuote.companyId && (
                     <span className="inline-block text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                       Fastest
                     </span>
                   )}
                   {/* Zone info for UTSF quotes */}
                   {quote.zone && (
                     <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                       <MapPin size={10} />
                       {quote.zone}
                     </span>
                   )}
                   {/* ODA indicator */}
                   {quote.isOda && (
                     <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                       <AlertCircle size={10} />
                       ODA
                     </span>
                   )}
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Delivery Time & Total Cost */}
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <CalendarClock size={14} />
                  <span>Delivery Time</span>
                </div>
                <p className="font-semibold">{quote.estimatedTime} days</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <DollarSign size={14} />
                  <span>Total Cost</span>
                </div>
                <p className="font-semibold text-blue-700">{formatCurrency(quote.totalCharges)}</p>
              </div>

              {/* --- THIS IS THE UPDATED WEIGHT SECTION --- */}
              <div className="col-span-2 border-t pt-3 mt-2">
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <Weight size={14} />
                    <span>Weight Details</span>
                </div>
                <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                        <span>Actual Wt.</span>
                        <span className="font-medium">{formatWeight(quote.actualWeight || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Volumetric Wt.</span>
                        <span className="font-medium">{formatWeight(quote.volumetricWeight || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t mt-1 pt-1">
                        <span>Chargeable Wt.</span>
                        <span>{formatWeight(quote.chargeableWeight)}</span>
                    </div>
                </div>
              </div>

              {/* Charge Breakdown - Show for UTSF quotes */}
              {quote.breakdown && (
                <div className="col-span-2 border-t pt-3 mt-2">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      <span className="font-medium">Charge Breakdown</span>
                      <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="text-xs space-y-1 mt-2 pl-2">
                      {quote.breakdown.baseFreight > 0 && (
                        <div className="flex justify-between">
                          <span>Base Freight</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.baseFreight)}</span>
                        </div>
                      )}
                      {quote.breakdown.docketCharge > 0 && (
                        <div className="flex justify-between">
                          <span>Docket Charge</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.docketCharge)}</span>
                        </div>
                      )}
                      {quote.breakdown.fuelCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Fuel Surcharge</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.fuelCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.greenTax > 0 && (
                        <div className="flex justify-between">
                          <span>Green Tax</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.greenTax)}</span>
                        </div>
                      )}
                      {quote.breakdown.rovCharges > 0 && (
                        <div className="flex justify-between">
                          <span>ROV Charges</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.rovCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.handlingCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Handling Charges</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.handlingCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.odaCharges > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>ODA Charges</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.odaCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.insuaranceCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Insurance</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.insuaranceCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.fmCharges > 0 && (
                        <div className="flex justify-between">
                          <span>FM Charges</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.fmCharges)}</span>
                        </div>
                      )}
                      {quote.breakdown.appointmentCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Appointment</span>
                          <span className="font-medium">{formatCurrency(quote.breakdown.appointmentCharges)}</span>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <button className="text-sm text-gray-600 flex items-center gap-1 hover:text-gray-800 transition-colors">
                <Download size={16} /> Download Quote
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1 transition-colors">
                Book Now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* This is the TABLE view. It also needs to be updated. */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
              {/* --- UPDATED TABLE HEADERS --- */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Wt.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volumetric Wt.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chargeable Wt.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr
                key={quote.companyId}
                className={quote.companyId === cheapestQuote.companyId ? 'bg-green-50' : ''}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{quote.companyName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <VerificationBadge status={getVerificationStatus(quote)} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{quote.estimatedTime} days</td>
                {/* --- UPDATED TABLE DATA CELLS --- */}
                <td className="px-6 py-4 text-sm text-gray-500">{formatWeight(quote.actualWeight)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatWeight(quote.volumetricWeight)}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatWeight(quote.chargeableWeight)}</td>
                <td className="px-6 py-4 text-sm font-medium text-blue-700">{formatCurrency(quote.totalCharges)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorComparison;
