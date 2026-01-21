import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { VendorType, isSpecialVendorId } from '../constants/specialVendors';
import { API_BASE_URL } from '../config/api';

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

interface ReviewComment {
  _id: string;
  comment: string | null;
  overallRating: number;
  createdAt: string;
}

export interface RatingBreakdownTooltipProps {
  vendorRatings?: VendorRatingsData;
  totalRatings?: number;
  overallRating?: number;
  vendorId?: string;
  isTemporaryVendor?: boolean;
  vendorType?: VendorType;
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
  vendorId,
  isTemporaryVendor = false,
  vendorType,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<ReviewComment[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if vendor has any ratings
  const hasRatings = vendorRatings && Object.values(vendorRatings).some((v) => v > 0);

  // Determine if this is a special vendor
  const isSpecialVendor = vendorType === 'special' || (vendorId ? isSpecialVendorId(vendorId) : false);

  // Determine the resolved vendor type for API calls
  const resolvedVendorType = vendorType || (isSpecialVendor ? 'special' : (isTemporaryVendor ? 'temporary' : 'regular'));

  // Fetch reviews when expanded
  const fetchReviews = useCallback(async () => {
    if (!vendorId || reviews.length > 0) return;

    setLoadingReviews(true);
    try {
      // Get API base URL from environment or use default
      const apiBase = API_BASE_URL;

      // Use vendorType query param for special vendors, fallback to isTemporary for backward compatibility
      const queryParams = new URLSearchParams({
        limit: '5',
      });

      if (resolvedVendorType === 'special') {
        queryParams.set('vendorType', 'special');
      } else {
        queryParams.set('isTemporary', String(isTemporaryVendor));
      }

      const response = await fetch(
        `${apiBase}/api/ratings/vendor/${vendorId}?${queryParams.toString()}`
      );
      const data = await response.json();
      if (data.success && data.ratings) {
        setReviews(data.ratings);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  }, [vendorId, isTemporaryVendor, resolvedVendorType, reviews.length]);

  // Handle toggle reviews
  const handleToggleReviews = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newShowReviews = !showReviews;
    setShowReviews(newShowReviews);
    if (newShowReviews) {
      fetchReviews();
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate tooltip position when visible
  const updatePosition = useCallback(() => {
    if (buttonRef.current && isVisible) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px

      // Position below the button, centered
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      const top = rect.bottom + 8; // 8px gap

      // Keep tooltip within viewport
      if (left < 8) left = 8;
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isVisible &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      className={`fixed w-64 bg-white rounded-lg shadow-xl border p-4 animate-in fade-in-0 zoom-in-95 duration-200 ${isSpecialVendor ? 'border-amber-200' : 'border-slate-200'
        }`}
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        zIndex: 99999,
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {/* Arrow */}
      <div
        className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t rotate-45 ${isSpecialVendor ? 'border-amber-200' : 'border-slate-200'
          }`}
        style={{ zIndex: -1 }}
      />

      <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        Rating Breakdown
        {isSpecialVendor && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
            Partner
          </span>
        )}
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

          {/* View Reviews Section */}
          {vendorId && totalRatings > 0 && (
            <div className="mt-2">
              <button
                onClick={handleToggleReviews}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded transition-colors ${isSpecialVendor
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
              >
                <MessageSquare size={12} />
                <span>{showReviews ? 'Hide Reviews' : 'View Reviews'}</span>
                {showReviews ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {/* Reviews List */}
              {showReviews && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {loadingReviews ? (
                    <div className="text-center py-2">
                      <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mx-auto ${isSpecialVendor ? 'border-amber-500' : 'border-blue-500'
                        }`} />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div
                        key={review._id}
                        className="p-2 bg-slate-50 rounded-md border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-xs">
                                {i < Math.round(review.overallRating) ? '★' : '☆'}
                              </span>
                            ))}
                            <span className="text-xs text-slate-600 ml-1">
                              {review.overallRating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        {review.comment ? (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            "{review.comment}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No comment</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">
                      No reviews with comments yet
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-slate-500">No detailed ratings yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Be the first to rate this {isSpecialVendor ? 'partner' : 'vendor'}!
          </p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Info Icon Trigger */}
      <button
        ref={buttonRef}
        type="button"
        className={`p-0.5 transition-colors focus:outline-none ${isSpecialVendor
          ? 'text-amber-400 hover:text-amber-600'
          : 'text-slate-400 hover:text-slate-600'
          }`}
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

      {/* Render tooltip at document body via Portal */}
      {createPortal(tooltipContent, document.body)}
    </>
  );
};

export default RatingBreakdownTooltip;
