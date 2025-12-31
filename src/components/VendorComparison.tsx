import React from 'react';
import { CalendarClock, Weight, DollarSign, Download, ArrowRight } from 'lucide-react';

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
               <div>
                 <h3 className="font-bold text-lg">{quote.companyName}</h3>
                 {/* ... Tag logic remains the same ... */}
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
                        <span className="font-medium">{formatWeight(quote.actualWeight)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Volumetric Wt.</span>
                        <span className="font-medium">{formatWeight(quote.volumetricWeight)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t mt-1 pt-1">
                        <span>Chargeable Wt.</span>
                        <span>{formatWeight(quote.chargeableWeight)}</span>
                    </div>
                </div>
              </div>
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