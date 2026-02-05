import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import type { VendorRatings } from '../store/draftStore';

// Re-export VendorRatings for convenience
export type { VendorRatings } from '../store/draftStore';

interface VendorRatingProps {
  ratings: VendorRatings;
  onChange: (field: keyof VendorRatings, value: number) => void;
  errors?: Partial<Record<keyof VendorRatings, string>>;
}

// =============================================================================
// RATING PARAMETERS CONFIG
// =============================================================================

const RATING_PARAMS: {
  key: keyof VendorRatings;
  label: string;
  lowLabel: string;
  highLabel: string;
}[] = [
  {
    key: 'priceSupport',
    label: 'Price Support',
    lowLabel: 'Poor',
    highLabel: 'Excellent',
  },
  {
    key: 'deliveryTime',
    label: 'Delivery Time',
    lowLabel: 'Slow',
    highLabel: 'Fast',
  },
  {
    key: 'tracking',
    label: 'Tracking',
    lowLabel: 'None',
    highLabel: 'Real-time',
  },
  {
    key: 'salesSupport',
    label: 'Sales Support',
    lowLabel: 'Poor',
    highLabel: 'Excellent',
  },
  {
    key: 'damageLoss',
    label: 'Damage & Loss',
    lowLabel: 'High Risk',
    highLabel: 'Very Safe',
  },
];

// =============================================================================
// STAR RATING COMPONENT
// =============================================================================

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  lowLabel: string;
  highLabel: string;
  error?: string;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  label,
  lowLabel,
  highLabel,
  error,
}) => {
  const [hoverValue, setHoverValue] = React.useState<number>(0);

  const displayValue = hoverValue || value;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
        <span className="text-red-500"> *</span>
      </label>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded transition-transform hover:scale-110"
            aria-label={`Rate ${star} out of 5`}
          >
            {star <= displayValue ? (
              <StarIcon className="w-7 h-7 text-amber-400 drop-shadow-sm" />
            ) : (
              <StarOutlineIcon className="w-7 h-7 text-slate-300 hover:text-amber-200" />
            )}
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-slate-600">
          {value > 0 ? `${value}/5` : '—'}
        </span>
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

// =============================================================================
// CALCULATE OVERALL RATING
// =============================================================================

export const calculateOverallRating = (ratings: VendorRatings): number => {
  const values = Object.values(ratings);
  const validValues = values.filter((v) => v > 0);

  if (validValues.length === 0) return 0;

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  const average = sum / 5; // Always divide by 5 for consistent calculation

  // Round to 1 decimal place and clamp between 1-5
  return Math.min(5, Math.max(1, Math.round(average * 10) / 10));
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const VendorRating: React.FC<VendorRatingProps> = ({
  ratings,
  onChange,
  errors = {},
}) => {
  const overallRating = calculateOverallRating(ratings);
  const allRated = Object.values(ratings).every((v) => v > 0);

  // Calculate progress percentage for the visual bar
  const progressPercent = allRated ? (overallRating / 5) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <StarIcon className="w-5 h-5 text-amber-400" />
        Vendor Rating
      </h2>

      {/* Rating Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
        {RATING_PARAMS.map((param) => (
          <StarRatingInput
            key={param.key}
            value={ratings[param.key]}
            onChange={(value) => onChange(param.key, value)}
            label={param.label}
            lowLabel={param.lowLabel}
            highLabel={param.highLabel}
            error={errors[param.key]}
          />
        ))}
      </div>

      {/* Overall Rating Card */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Overall Rating
          </span>
          <div className="flex items-center gap-1">
            <StarIcon className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-bold text-slate-800">
              {allRated ? overallRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-slate-500">/ 5</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Individual Ratings Summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            <strong>Price:</strong> {ratings.priceSupport || '—'}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <strong>Delivery:</strong> {ratings.deliveryTime || '—'}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <strong>Tracking:</strong> {ratings.tracking || '—'}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <strong>Sales:</strong> {ratings.salesSupport || '—'}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <strong>D&L:</strong> {ratings.damageLoss || '—'}
          </span>
        </div>

        {!allRated && (
          <p className="mt-2 text-xs text-amber-600">
            Please rate all 5 parameters to see the overall rating
          </p>
        )}
      </div>
    </div>
  );
};

export default VendorRating;
