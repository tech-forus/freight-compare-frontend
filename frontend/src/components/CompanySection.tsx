import React from 'react';
import { UseVendorBasicsReturn } from '../hooks/useVendorBasics';
import { UsePincodeLookupReturn } from '../hooks/usePincodeLookup';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useFormConfig } from '../hooks/useFormConfig';

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

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM BUILDER CONFIG - Dynamic labels/placeholders from MongoDB
  // ═══════════════════════════════════════════════════════════════════════════
  const { getField, getConstraint } = useFormConfig('add-vendor');

  // Helper: Get label with fallback
  const getLabel = (fieldId: string, fallback: string) =>
    getField(fieldId)?.label ?? fallback;

  // Helper: Get placeholder with fallback
  const getPlaceholder = (fieldId: string, fallback: string) =>
    getField(fieldId)?.placeholder ?? fallback;

  // Helper: Check if required
  const isRequired = (fieldId: string) =>
    getField(fieldId)?.required ?? false;

  // Helper: Check if visible (defaults to true if field not found)
  const isVisible = (fieldId: string) =>
    getField(fieldId)?.visible ?? true;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <InformationCircleIcon className="w-5 h-5 text-blue-500" />
        Company & Contact Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Company Name */}
        {isVisible('companyName') && (
          <div>
            <label
              htmlFor="companyName"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
            >
              {getLabel('companyName', 'Company Name')}
              {isRequired('companyName') && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={basics.companyName}
              onChange={(e) => setField('companyName', e.target.value.slice(0, getConstraint('companyName', 'maxLength', 60) as number))}
              onBlur={() => validateField('companyName')}
              maxLength={getConstraint('companyName', 'maxLength', 60) as number}
              className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.companyName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
                }`}
              placeholder={getPlaceholder('companyName', 'Enter company name')}
              required
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
            )}
          </div>
        )}

        {/* Contact Person Name */}
        <div>
          <label
            htmlFor="contactPersonName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            {getLabel('contactPersonName', 'Contact Person')}
            {isRequired('contactPersonName') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            id="contactPersonName"
            name="contactPersonName"
            value={basics.contactPersonName}
            onChange={(e) => {
              // Allow only alphabets, space, hyphen, apostrophe, then FORCE UPPERCASE
              const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, getConstraint('contactPersonName', 'maxLength', 30) as number);
              const value = raw.toUpperCase();
              setField('contactPersonName', value);
            }}
            onBlur={() => validateField('contactPersonName')}
            maxLength={getConstraint('contactPersonName', 'maxLength', 30) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.contactPersonName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('contactPersonName', 'Enter contact person name')}
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
            {getLabel('vendorPhoneNumber', 'Phone Number')}
            {isRequired('vendorPhoneNumber') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            id="vendorPhoneNumber"
            name="vendorPhoneNumber"
            value={basics.vendorPhoneNumber}
            onChange={(e) => {
              // Only allow digits
              const value = e.target.value.replace(/\D/g, '').slice(0, getConstraint('vendorPhoneNumber', 'maxLength', 10) as number);
              setField('vendorPhoneNumber', value);
            }}
            onBlur={() => validateField('vendorPhoneNumber')}
            inputMode="numeric"
            maxLength={getConstraint('vendorPhoneNumber', 'maxLength', 10) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.vendorPhoneNumber
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('vendorPhoneNumber', '10-digit phone number')}
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
            {getLabel('vendorEmailAddress', 'Email Address')}
            {isRequired('vendorEmailAddress') && <span className="text-red-500"> *</span>}
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
                       ${errors.vendorEmailAddress
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('vendorEmailAddress', 'email@example.com')}
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
            {getLabel('gstin', 'GST Number')}
            {isRequired('gstin') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            id="gstin"
            name="gstin"
            value={basics.gstin || ''}
            onChange={(e) => {
              // Convert to uppercase and validate character set
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, getConstraint('gstin', 'maxLength', 15) as number);
              setField('gstin', value);
            }}
            onBlur={() => {
              if (basics.gstin) {
                validateField('gstin');
              }
            }}
            maxLength={getConstraint('gstin', 'maxLength', 15) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.gstin
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('gstin', '15-character GST number')}
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
            {getLabel('subVendor', 'Sub Transporter')}
            {isRequired('subVendor') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            id="subVendor"
            name="subVendor"
            value={basics.subVendor}
            onChange={(e) => {
              // allow alphabets, spaces, hyphens, apostrophes — then FORCE UPPERCASE
              const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, getConstraint('subVendor', 'maxLength', 20) as number);
              const value = raw.toUpperCase();
              setField('subVendor', value);
            }}
            onBlur={() => validateField('subVendor')}
            maxLength={getConstraint('subVendor', 'maxLength', 20) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.subVendor
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('subVendor', 'Enter sub vendor (optional)')}
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
            {getLabel('vendorCode', 'Transporter Code')}
            {isRequired('vendorCode') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            id="vendorCode"
            name="vendorCode"
            value={basics.vendorCode}
            onChange={(e) => {
              // Auto-uppercase and allow only alphanumeric
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, getConstraint('vendorCode', 'maxLength', 20) as number);
              setField('vendorCode', value);
            }}
            onBlur={() => validateField('vendorCode')}
            maxLength={getConstraint('vendorCode', 'maxLength', 20) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.vendorCode
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('vendorCode', 'Enter vendor code (optional)')}
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
            {getLabel('pincode', 'Pincode')}
            {isRequired('pincode') && <span className="text-red-500"> *</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={geo.pincode || ''}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '').slice(0, getConstraint('pincode', 'maxLength', 6) as number);
                setPincode(value);
              }}
              maxLength={getConstraint('pincode', 'maxLength', 6) as number}
              className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                         focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                         ${geoError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
                }`}
              placeholder={getPlaceholder('pincode', '6-digit pincode')}
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
            {getLabel('address', 'Address')}
            {isRequired('address') && <span className="text-red-500"> *</span>}
          </label>
          <textarea
            id="address"
            name="address"
            value={basics.address}
            onChange={(e) => setField('address', e.target.value.slice(0, getConstraint('address', 'maxLength', 150) as number))}
            onBlur={() => validateField('address')}
            maxLength={getConstraint('address', 'maxLength', 150) as number}
            rows={2}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.address
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('address', 'Enter complete address')}
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
            {getLabel('state', 'State')}
            {isRequired('state') && <span className="text-red-500"> *</span>}
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
                       ${!isManual && !geoError
                ? 'bg-slate-100 cursor-not-allowed'
                : 'bg-slate-50/70'
              }
                       border-slate-300 focus:ring-blue-500`}
            placeholder={getPlaceholder('state', 'State (auto-filled)')}
            required
          />
        </div>

        {/* City (auto-filled or manual) */}
        <div>
          <label
            htmlFor="city"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            {getLabel('city', 'City')}
            {isRequired('city') && <span className="text-red-500"> *</span>}
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
                       ${!isManual && !geoError
                ? 'bg-slate-100 cursor-not-allowed'
                : 'bg-slate-50/70'
              }
                       border-slate-300 focus:ring-blue-500`}
            placeholder={getPlaceholder('city', 'City (auto-filled)')}
            required
          />
        </div>

        {/* Service Modes */}
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            {getLabel('serviceMode', 'Service Modes')}
            {isRequired('serviceMode') && <span className="text-red-500"> *</span>}
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
                  ${basics.serviceMode === 'FTL'
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
                  ${basics.serviceMode === 'LTL'
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


      </div>
    </div>
  );
};