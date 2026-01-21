import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Loader2 } from 'lucide-react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { VendorType } from '../constants/specialVendors';
import { API_BASE_URL } from '../config/api';

// =============================================================================
// TYPES
// =============================================================================

export interface VendorRatingsInput {
  priceSupport: number;
  deliveryTime: number;
  tracking: number;
  salesSupport: number;
  damageLoss: number;
}

export interface RatingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  isTemporaryVendor: boolean;
  vendorType?: VendorType;
  onRatingSubmitted?: (newRating: number, vendorRatings: VendorRatingsInput) => void;
}

// =============================================================================
// RATING PARAMETERS CONFIG
// =============================================================================

const RATING_PARAMS: {
  key: keyof VendorRatingsInput;
  label: string;
  description: string;
  icon: string;
}[] = [
    {
      key: 'priceSupport',
      label: 'Price Support',
      description: 'How fair and transparent was the pricing?',
      icon: '💰',
    },
    {
      key: 'deliveryTime',
      label: 'Delivery Time',
      description: 'Was the delivery on time as promised?',
      icon: '🚚',
    },
    {
      key: 'tracking',
      label: 'Tracking',
      description: 'How accurate and helpful was shipment tracking?',
      icon: '📍',
    },
    {
      key: 'salesSupport',
      label: 'Sales Support',
      description: 'How responsive and helpful was the support team?',
      icon: '🎧',
    },
    {
      key: 'damageLoss',
      label: 'Damage/Loss',
      description: 'Was your package delivered safely without damage?',
      icon: '📦',
    },
  ];

// =============================================================================
// STAR INPUT COMPONENT
// =============================================================================

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  error?: boolean;
}

const StarInput: React.FC<StarInputProps> = ({ value, onChange, error }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className={`p-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded transition-transform hover:scale-110 ${error && value === 0 ? 'ring-1 ring-red-300' : ''
            }`}
          aria-label={`Rate ${star} out of 5`}
        >
          {star <= displayValue ? (
            <StarIcon className="w-6 h-6 text-amber-400 drop-shadow-sm" />
          ) : (
            <StarOutlineIcon className="w-6 h-6 text-slate-300 hover:text-amber-200" />
          )}
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-slate-600 min-w-[2.5rem]">
        {value > 0 ? `${value}/5` : '—'}
      </span>
    </div>
  );
};

// =============================================================================
// CALCULATE OVERALL RATING
// =============================================================================

const calculateOverallRating = (ratings: VendorRatingsInput): number => {
  const values = Object.values(ratings);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / 5; // Always divide by 5 for consistent calculation
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const RatingFormModal: React.FC<RatingFormModalProps> = ({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  isTemporaryVendor,
  vendorType,
  onRatingSubmitted,
}) => {
  const [ratings, setRatings] = useState<VendorRatingsInput>({
    priceSupport: 0,
    deliveryTime: 0,
    tracking: 0,
    salesSupport: 0,
    damageLoss: 0,
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Determine if this is a special vendor (partner)
  const isSpecialVendor = vendorType === 'special';

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Check if all ratings are filled
  const allRated = Object.values(ratings).every((v) => v > 0);
  const overallRating = allRated ? calculateOverallRating(ratings) : 0;

  const handleRatingChange = (key: keyof VendorRatingsInput, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    setShowValidation(false);
    setError(null);
  };

  const handleSubmit = async () => {
    // Validate all ratings
    if (!allRated) {
      setShowValidation(true);
      setError('Please rate all 5 parameters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        vendorId,
        isTemporaryVendor,
        vendorType: vendorType || (isTemporaryVendor ? 'temporary' : 'regular'),
        ratings,
        comment: comment.trim() || null,
        overallRating: Math.round(overallRating * 10) / 10,
      };

      // Use centralized API configuration
      const response = await axios.post(`${API_BASE_URL}/api/ratings/submit`, payload);

      if (response.data.success) {
        // Notify parent of new rating and ratings breakdown
        if (onRatingSubmitted) {
          onRatingSubmitted(response.data.newOverallRating || overallRating, ratings);
        }

        // Reset form and close
        setRatings({
          priceSupport: 0,
          deliveryTime: 0,
          tracking: 0,
          salesSupport: 0,
          damageLoss: 0,
        });
        setComment('');
        setShowValidation(false);
        onClose();
      } else {
        setError(response.data.message || 'Failed to submit rating');
      }
    } catch (err: any) {
      console.error('Rating submission error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to submit rating. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRatings({
        priceSupport: 0,
        deliveryTime: 0,
        tracking: 0,
        salesSupport: 0,
        damageLoss: 0,
      });
      setComment('');
      setShowValidation(false);
      setError(null);
      onClose();
    }
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  // Modal content
  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        style={{ zIndex: 99999 }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden"
        style={{ zIndex: 100000 }}
      >
        {/* Header - different styling for special vendors (partners) */}
        <div className={`flex items-center justify-between p-4 border-b ${isSpecialVendor
          ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
          : 'border-slate-200'
          }`}>
          <div className="flex items-center gap-2">
            <Star className={`w-5 h-5 ${isSpecialVendor ? 'text-amber-500' : 'text-amber-400'}`} />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Rate {vendorName}
              </h2>
              {isSpecialVendor && (
                <span className="text-xs text-amber-600 font-medium">Our Partner</span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Rating Inputs */}
          <div className="space-y-4">
            {RATING_PARAMS.map((param) => {
              const value = ratings[param.key];
              const hasError = showValidation && value === 0;

              return (
                <div
                  key={param.key}
                  className={`p-3 rounded-lg transition-colors ${hasError
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{param.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {param.label}
                    </span>
                    <span className="text-red-500 text-sm">*</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {param.description}
                  </p>
                  <StarInput
                    value={value}
                    onChange={(val) => handleRatingChange(param.key, val)}
                    error={hasError}
                  />
                </div>
              );
            })}
          </div>

          {/* Comment */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Comment <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this vendor..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-400 text-right mt-1">
              {comment.length}/500
            </p>
          </div>

          {/* Overall Rating Preview */}
          {allRated && (
            <div className={`mt-4 p-3 rounded-lg border ${isSpecialVendor
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Overall Rating
                </span>
                <div className="flex items-center gap-1">
                  <StarIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-slate-800">
                    {overallRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-slate-500">/ 5</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t ${isSpecialVendor ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
          }`}>
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> All ratings required
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !allRated}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isSpecialVendor
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal at document body level
  // This prevents z-index and overflow issues from parent containers
  return createPortal(modalContent, document.body);
};

export default RatingFormModal;
