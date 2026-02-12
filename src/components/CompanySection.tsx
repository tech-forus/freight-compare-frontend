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
    loading: isLoading,
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

      {/* 5-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

        {/* ROW 1: Company, Contact, Phone, Email, GST */}

        {/* Company Name */}
        {isVisible('companyName') && (
          <div className="col-span-1">
            <label
              htmlFor="companyName"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
              title={getLabel('companyName', 'Company Name')}
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
              placeholder={getPlaceholder('companyName', 'Company Name')}
              required
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600 truncate">{errors.companyName}</p>
            )}
          </div>
        )}

        {/* Contact Person */}
        <div className="col-span-1">
          <label
            htmlFor="contactPersonName"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('contactPersonName', 'Contact Person')}
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
              const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, getConstraint('contactPersonName', 'maxLength', 30) as number);
              setField('contactPersonName', raw.toUpperCase());
            }}
            onBlur={() => validateField('contactPersonName')}
            maxLength={getConstraint('contactPersonName', 'maxLength', 30) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.contactPersonName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('contactPersonName', 'Contact Person')}
            required
          />
          {errors.contactPersonName && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.contactPersonName}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="col-span-1">
          <label
            htmlFor="vendorPhoneNumber"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('vendorPhoneNumber', 'Phone Number')}
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
            placeholder={getPlaceholder('vendorPhoneNumber', 'Phone Number')}
            required
          />
          {errors.vendorPhoneNumber && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.vendorPhoneNumber}</p>
          )}
        </div>

        {/* Email Address */}
        <div className="col-span-1">
          <label
            htmlFor="vendorEmailAddress"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('vendorEmailAddress', 'Email Address')}
          >
            {getLabel('vendorEmailAddress', 'Email Address')}
            {isRequired('vendorEmailAddress') && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="email"
            id="vendorEmailAddress"
            name="vendorEmailAddress"
            value={basics.vendorEmailAddress}
            onChange={(e) => setField('vendorEmailAddress', e.target.value.toLowerCase())}
            onBlur={() => validateField('vendorEmailAddress')}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.vendorEmailAddress
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('vendorEmailAddress', 'Email Address')}
            required
          />
          {errors.vendorEmailAddress && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.vendorEmailAddress}</p>
          )}
        </div>

        {/* GST Number */}
        <div className="col-span-1">
          <label
            htmlFor="gstin"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('gstin', 'GST Number')}
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
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, getConstraint('gstin', 'maxLength', 15) as number);
              setField('gstin', value);
            }}
            onBlur={() => basics.gstin && validateField('gstin')}
            maxLength={getConstraint('gstin', 'maxLength', 15) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.gstin
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('gstin', 'GST Number')}
          />
          {errors.gstin && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.gstin}</p>
          )}
        </div>

        {/* ROW 2: Pincode, State, City, Sub Vendor, Vendor Code */}

        {/* Pincode */}
        <div className="col-span-1">
          <label
            htmlFor="pincode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('pincode', 'Pincode')}
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
              placeholder={getPlaceholder('pincode', 'Pincode')}
              required
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {geoError && (
            <p className="mt-1 text-xs text-orange-600 truncate">{geoError}</p>
          )}
        </div>

        {/* State */}
        <div className="col-span-1">
          <label
            htmlFor="state"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('state', 'State')}
          >
            {getLabel('state', 'State')}
            {isRequired('state') && <span className="text-red-500"> *</span>}
            {isManual && <span className="text-xs text-orange-500 ml-1">(M)</span>}
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
            placeholder={getPlaceholder('state', 'State')}
            required
          />
        </div>

        {/* City */}
        <div className="col-span-1">
          <label
            htmlFor="city"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('city', 'City')}
          >
            {getLabel('city', 'City')}
            {isRequired('city') && <span className="text-red-500"> *</span>}
            {isManual && <span className="text-xs text-orange-500 ml-1">(M)</span>}
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
            placeholder={getPlaceholder('city', 'City')}
            required
          />
        </div>

        {/* Sub Vendor */}
        <div className="col-span-1">
          <label
            htmlFor="subVendor"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('subVendor', 'Sub Transporter')}
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
              const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, getConstraint('subVendor', 'maxLength', 20) as number);
              setField('subVendor', raw.toUpperCase());
            }}
            onBlur={() => validateField('subVendor')}
            maxLength={getConstraint('subVendor', 'maxLength', 20) as number}
            className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       ${errors.subVendor
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('subVendor', 'Sub Transporter')}
          />
          {errors.subVendor && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.subVendor}</p>
          )}
        </div>

        {/* Vendor Code */}
        <div className="col-span-1">
          <label
            htmlFor="vendorCode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('vendorCode', 'Transporter Code')}
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
            placeholder={getPlaceholder('vendorCode', 'Code')}
          />
          {errors.vendorCode && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.vendorCode}</p>
          )}
        </div>

        {/* ROW 3: Address (3 cols) + Service Modes (2 cols) */}

        {/* Address */}
        <div className="col-span-1 md:col-span-3">
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider truncate"
            title={getLabel('address', 'Address')}
          >
            {getLabel('address', 'Address')}
            {isRequired('address') && <span className="text-red-500"> *</span>}
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
                       ${errors.address
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
              }`}
            placeholder={getPlaceholder('address', 'Enter complete address')}
            required
          />
          {errors.address && (
            <p className="mt-1 text-xs text-red-600 truncate">{errors.address}</p>
          )}
        </div>

        {/* Service Modes */}
        <div className="col-span-1 md:col-span-2 flex flex-col justify-end">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 truncate">
            {getLabel('serviceMode', 'Service Modes')}
            {isRequired('serviceMode') && <span className="text-red-500"> *</span>}
          </label>
          <div className="mt-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm inline-block w-1/2 ml-auto">
            <div className="flex w-full gap-2">
              {/* Full Truck Load */}
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
                className={`flex-1 items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all outline-none whitespace-nowrap
                  focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                  ${basics.serviceMode === 'FTL'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md transform scale-[1.02]'
                    : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-blue-600'
                  }`}
              >
                Full Truck Load
              </button>

              {/* Part Truck Load */}
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
                className={`flex-1 items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all outline-none whitespace-nowrap
                  focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                  ${basics.serviceMode === 'LTL'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md transform scale-[1.02]'
                    : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-blue-600'
                  }`}
              >
                Part Truck Load
              </button>
            </div>
          </div>
          {errors.serviceMode && (
            <p className="mt-2 text-xs text-red-600 truncate">{errors.serviceMode}</p>
          )}
        </div>
      </div>
    </div>
  );
};