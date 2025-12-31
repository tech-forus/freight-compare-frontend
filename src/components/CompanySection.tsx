import React from 'react';
import { UseVendorBasicsReturn } from '../hooks/useVendorBasics';
import { UsePincodeLookupReturn } from '../hooks/usePincodeLookup';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// =============================================================================
// PROPS
// =============================================================================

interface CompanySectionProps {
  vendorBasics: UseVendorBasicsReturn;
  pincodeLookup: UsePincodeLookupReturn;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CompanySection: React.FC<CompanySectionProps> = ({
  vendorBasics,
  pincodeLookup,
}) => {
  const { basics, errors, setField, validateField } = vendorBasics;
  const {
    geo,
    isLoading,
    error: geoError,
    setPincode,
    setState,
    setCity,
    isManual,
  } = pincodeLookup;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <InformationCircleIcon className="w-5 h-5 text-blue-500" />
        Company & Contact Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

             {/* Company Name */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
          Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={basics.companyName}
            onChange={(e) => setField('companyName', e.target.value.slice(0, 60))}
            onBlur={() => validateField('companyName')}
            maxLength={60}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.companyName
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter company name"
            required
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
          )}
        </div>

        {/* Contact Person Name */}
        <div>
          <label
            htmlFor="contactPersonName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="contactPersonName"
            name="contactPersonName"
            value={basics.contactPersonName}
               onChange={(e) => {
      // Allow only alphabets, space, hyphen, apostrophe, then FORCE UPPERCASE
      const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 30);
      const value = raw.toUpperCase();
      setField('contactPersonName', value);
    }}

            onBlur={() => validateField('contactPersonName')}
            maxLength={30}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.contactPersonName
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter contact person name"
            required
          />
          {errors.contactPersonName && (
            <p className="mt-1 text-xs text-red-600">
              {errors.contactPersonName}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="vendorPhoneNumber"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="vendorPhoneNumber"
            name="vendorPhoneNumber"
            value={basics.vendorPhoneNumber}
            onChange={(e) => {
              // Only allow digits
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setField('vendorPhoneNumber', value);
            }}
            onBlur={() => validateField('vendorPhoneNumber')}
            inputMode="numeric"
            maxLength={10}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.vendorPhoneNumber
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="10-digit phone number"
            required
          />
          {errors.vendorPhoneNumber && (
            <p className="mt-1 text-xs text-red-600">
              {errors.vendorPhoneNumber}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="vendorEmailAddress"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="vendorEmailAddress"
            name="vendorEmailAddress"
            value={basics.vendorEmailAddress}
               onChange={(e) => {
      const value = e.target.value.toLowerCase();
      setField('vendorEmailAddress', value);
    }}

            onBlur={() => validateField('vendorEmailAddress')}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.vendorEmailAddress
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="email@example.com"
            required
          />
          {errors.vendorEmailAddress && (
            <p className="mt-1 text-xs text-red-600">
              {errors.vendorEmailAddress}
            </p>
          )}
        </div>

        {/* GST Number (Optional) */}
        <div>
          <label
            htmlFor="gstin"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            GST Number
          </label>
          <input
            type="text"
            id="gstin"
            name="gstin"
            value={basics.gstin || ''}
            onChange={(e) => {
              // Convert to uppercase and validate character set
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
              setField('gstin', value);
            }}
            onBlur={() => {
              if (basics.gstin) {
                validateField('gstin');
              }
            }}
            maxLength={15}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.gstin
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="15-character GST number"
          />
          {errors.gstin && (
            <p className="mt-1 text-xs text-red-600">{errors.gstin}</p>
          )}
        </div>

              {/* Sub Vendor */}
        <div>
          <label
            htmlFor="subVendor"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Sub Transporter
          </label>
          <input
            type="text"
            id="subVendor"
            name="subVendor"
            value={basics.subVendor}
            onChange={(e) => {
              // allow alphabets, spaces, hyphens, apostrophes — then FORCE UPPERCASE
              const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 20);
              const value = raw.toUpperCase();
              setField('subVendor', value);
            }}
            onBlur={() => validateField('subVendor')}
            maxLength={20}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.subVendor
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter sub vendor (optional)"
          />
          {errors.subVendor && (
            <p className="mt-1 text-xs text-red-600">{errors.subVendor}</p>
          )}
        </div>

        {/* Vendor Code */}
        <div>
          <label
            htmlFor="vendorCode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Transporter Code
          </label>
          <input
            type="text"
            id="vendorCode"
            name="vendorCode"
            value={basics.vendorCode}
            onChange={(e) => {
              // Auto-uppercase and allow only alphanumeric
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
              setField('vendorCode', value);
            }}
            onBlur={() => validateField('vendorCode')}
            maxLength={20}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.vendorCode
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter vendor code (optional)"
          />
          {errors.vendorCode && (
            <p className="mt-1 text-xs text-red-600">{errors.vendorCode}</p>
          )}
        </div>

        {/* Pincode */}
        <div>
          <label
            htmlFor="pincode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Pincode <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={geo.pincode || ''}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincode(value);
              }}
              maxLength={6}
              className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                         focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                         ${
                           geoError
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-slate-300 focus:ring-blue-500'
                         }`}
              placeholder="6-digit pincode"
              required
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {geoError && (
            <p className="mt-1 text-xs text-orange-600">{geoError}</p>
          )}
        </div>

        {/* Address - FULL WIDTH (md:col-span-2) */}
        <div className="md:col-span-2">
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            value={basics.address}
            onChange={(e) => setField('address', e.target.value.slice(0, 150))}
            onBlur={() => validateField('address')}
            maxLength={150}
            rows={2}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${
                         errors.address
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-slate-300 focus:ring-blue-500'
                       }`}
            placeholder="Enter complete address"
            required
          />
          {errors.address && (
            <p className="mt-1 text-xs text-red-600">{errors.address}</p>
          )}
        </div>

        {/* State (auto-filled or manual) */}
        <div>
          <label
            htmlFor="state"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            State <span className="text-red-500">*</span>
            {isManual && (
              <span className="text-xs text-orange-500 ml-2">(Manual)</span>
            )}
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={geo.state || ''}
            onChange={(e) => setState(e.target.value)}
            readOnly={!isManual && !geoError}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition
                       ${
                         !isManual && !geoError
                           ? 'bg-slate-100 cursor-not-allowed'
                           : 'bg-slate-50/70'
                       }
                       border-slate-300 focus:ring-blue-500`}
            placeholder="State (auto-filled)"
            required
          />
        </div>

        {/* City (auto-filled or manual) */}
        <div>
          <label
            htmlFor="city"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            City <span className="text-red-500">*</span>
            {isManual && (
              <span className="text-xs text-orange-500 ml-2">(Manual)</span>
            )}
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={geo.city || ''}
            onChange={(e) => setCity(e.target.value)}
            readOnly={!isManual && !geoError}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition
                       ${
                         !isManual && !geoError
                           ? 'bg-slate-100 cursor-not-allowed'
                           : 'bg-slate-50/70'
                       }
                       border-slate-300 focus:ring-blue-500`}
            placeholder="City (auto-filled)"
            required
          />
        </div>

        {/* Service Modes */}
<div className="md:col-span-1">
  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
    Service Modes <span className="text-red-500">*</span>
  </label>

  <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
    <div className="inline-flex items-center gap-3">

      {/* FTL */}
      <button
        type="button"
        onClick={() => {
          setField('serviceMode', 'FTL');
          if (errors.serviceMode) validateField('serviceMode');
        }}
        onDoubleClick={() => {
          if (basics.serviceMode === 'FTL') {
            setField('serviceMode', null);
            validateField('serviceMode');
          }
        }}
        aria-pressed={basics.serviceMode === 'FTL'}
        className={`inline-flex items-center justify-center min-w-[76px] px-5 py-2 text-sm font-semibold rounded-lg transition-all outline-none
          focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
          ${
            basics.serviceMode === 'FTL'
              ? 'bg-blue-600 text-white border-2 border-blue-700 shadow'
              : 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md'
          }`}
      >
        FTL
      </button>

      {/* LTL */}
      <button
        type="button"
        onClick={() => {
          setField('serviceMode', 'LTL');
          if (errors.serviceMode) validateField('serviceMode');
        }}
        onDoubleClick={() => {
          if (basics.serviceMode === 'LTL') {
            setField('serviceMode', null);
            validateField('serviceMode');
          }
        }}
        aria-pressed={basics.serviceMode === 'LTL'}
        className={`inline-flex items-center justify-center min-w-[76px] px-5 py-2 text-sm font-semibold rounded-lg transition-all outline-none
          focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
          ${
            basics.serviceMode === 'LTL'
              ? 'bg-blue-600 text-white border-2 border-blue-700 shadow'
              : 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md'
          }`}
      >
        LTL
      </button>
    </div>

    {errors.serviceMode && (
      <p className="mt-2 text-xs text-red-600">{errors.serviceMode}</p>
    )}
  </div>
</div>


        {/* Company Rating (Slider) */}
        <div>
          <label
            htmlFor="companyRating"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Company Rating <span className="text-red-500">*</span>
          </label>

          <div className="mt-2">
            <input
              id="companyRating"
              name="companyRating"
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={
                Number(basics.companyRating) || 4 } 
              
              onChange={(e) => {
                const val = Number(e.target.value);
                setField('companyRating', val);
              }}
              onBlur={() => {
                if (
                  basics.companyRating === null ||
                  basics.companyRating === undefined
                ) {
                  setField('companyRating', 4);
                }
                validateField('companyRating');
              }}
              className="w-full accent-blue-600"
            />

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-500">1.0</span>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                {typeof basics.companyRating === 'number' 
                  ? basics.companyRating.toFixed(1)
                  : '4.0'} / 5.0
              </span>
              <span className="text-xs text-slate-500">5.0</span>
            </div>
          </div>

          {errors.companyRating && (
            <p className="mt-1 text-xs text-red-600">
              {errors.companyRating}
            </p>
          )}
        </div>
        
      </div>
    </div>
  );
};