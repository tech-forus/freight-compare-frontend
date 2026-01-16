import React from 'react';
import { Info } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface VendorRatingsData {
  priceSupport: number;
  deliveryTime: number;
  tracking: number;
  salesSupport: number;
  damageLoss: number;
}

export interface RatingBreakdownTooltipProps {
  vendorRatings?: VendorRatingsData;
  totalRatings?: number;
  overallRating?: number;
}

// =============================================================================
// RATING PARAMETERS CONFIG
// =============================================================================

const RATING_PARAMS: {
  key: keyof VendorRatingsData;
  label: string;
  icon: string;
}[] = [
  { key: 'priceSupport', label: 'Price Support', icon: '💰' },
  { key: 'deliveryTime', label: 'Delivery Time', icon: '🚚' },
  { key: 'tracking', label: 'Tracking', icon: '📍' },
  { key: 'salesSupport', label: 'Sales Support', icon: '🎧' },
  { key: 'damageLoss', label: 'Damage/Loss', icon: '📦' },
];

// =============================================================================
// COMPONENT
// =============================================================================

const RatingBreakdownTooltip: React.FC<RatingBreakdownTooltipProps> = ({
  vendorRatings,
  totalRatings = 0,
  overallRating = 0,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  // Check if vendor has any ratings
  const hasRatings = vendorRatings && Object.values(vendorRatings).some((v) => v > 0);

  return (
    <div className="relative inline-flex items-center">
      {/* Info Icon Trigger */}
      <button
        type="button"
        className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        aria-label="View rating breakdown"
      >
        <Info size={14} />
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-in fade-in-0 zoom-in-95 duration-200"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {/* Arrow */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45" />

          <h4 className="text-sm font-semibold text-slate-800 mb-3">
            Rating Breakdown
          </h4>

          {hasRatings ? (
            <>
              {/* Parameter Bars */}
              <div className="space-y-2.5">
                {RATING_PARAMS.map((param) => {
                  const value = vendorRatings?.[param.key] || 0;
                  const percentage = (value / 5) * 100;

                  return (
                    <div key={param.key} className="flex items-center gap-2">
                      <span className="text-sm w-5 flex-shrink-0">{param.icon}</span>
                      <span className="text-xs text-slate-600 w-24 truncate">
                        {param.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-6 text-right">
                        {value > 0 ? value.toFixed(1) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Based on {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Overall: {overallRating.toFixed(1)}★
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-slate-500">No detailed ratings yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Be the first to rate this vendor!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingBreakdownTooltip;
