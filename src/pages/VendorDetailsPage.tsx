// src/pages/VendorDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  Truck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { TemporaryTransporter } from '../utils/validators';
import { getTemporaryTransporterById, getTransporterById } from '../services/api';

const VendorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [vendor, setVendor] = useState<(TemporaryTransporter & { _id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackQuoteData, setFallbackQuoteData] = useState<any>(null);
  const [vendorSource, setVendorSource] = useState<'temporary' | 'public' | 'fallback' | null>(null);

  // Scroll to top when page loads - fixes issue where page opens scrolled down
  // when navigating from calculator page where user was scrolled to bottom
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      console.log("=== VENDOR DETAILS PAGE DEBUG ===");
      console.log("Vendor ID:", id);
      console.log("Location state:", location.state);

      if (!id) {
        setError('No vendor ID provided');
        setLoading(false);
        return;
      }

      // ============================================================
      // SPECIAL VENDORS: Wheelseye FTL and LOCAL FTL
      // These are client-side injected vendors with pre-filled contact info
      // ============================================================
      const stateData = location.state as any;
      if (id === 'special' && stateData?.isSpecialVendor && stateData?.vendorInfo) {
        console.log("[VendorDetails] ✓ Special vendor detected:", stateData.vendorInfo.companyName);
        const specialVendor = {
          _id: 'special',
          companyName: stateData.vendorInfo.companyName,
          transportMode: 'road',
          vendorPhoneNumber: stateData.vendorInfo.vendorPhoneNumber,
          vendorEmailAddress: stateData.vendorInfo.vendorEmail,
          contactPersonName: stateData.vendorInfo.contactPerson || '',
          address: '',
          state: '',
          city: '',
          pincode: '',
          rating: stateData.vendorInfo.rating ?? 4.6,
          approvalStatus: stateData.vendorInfo.approvalStatus || 'approved',
          description: stateData.vendorInfo.description,
        };
        setVendor(specialVendor as any);
        setVendorSource('fallback'); // Mark as fallback since it's client-side data
        setFallbackQuoteData(stateData.quoteData);
        setError(null);
        setLoading(false);
        return;
      }

      // Check if we have fallback quote data from navigation state
      if (stateData?.quoteData) {
        console.log("Found fallback quote data:", stateData.quoteData);
        setFallbackQuoteData(stateData.quoteData);
      }

      setLoading(true);

      // ========================================================
      // STRATEGY: Use unique _id with dual-collection fallback
      // 1. Try temporaryTransporters (customer's tied-up vendors)
      // 2. Try transporters (public vendors)
      // 3. Use navigation state data as display fallback
      // ========================================================

      // PRIORITY 1: Try fetching from temporaryTransporters by ID
      console.log("[VendorDetails] Trying temporaryTransporters collection...");
      const tempData = await getTemporaryTransporterById(id);

      if (tempData) {
        console.log("[VendorDetails] ✓ Found in temporaryTransporters:", tempData.companyName);
        setVendor(tempData);
        setVendorSource('temporary');
        setError(null);
        setLoading(false);
        return;
      }

      // PRIORITY 2: Try fetching from public transporters collection
      console.log("[VendorDetails] Not in temporaryTransporters, trying public transporters...");
      const publicData = await getTransporterById(id);

      if (publicData) {
        console.log("[VendorDetails] ✓ Found in transporters (public):", publicData.companyName);
        // Map public transporter fields to match our expected structure
        const mappedVendor = {
          _id: publicData._id,
          companyName: publicData.companyName,
          transportMode: publicData.transportMode || 'road',
          // Public transporters use different field names - map them
          vendorPhoneNumber: publicData.vendorPhoneNumber || publicData.vendorPhone || publicData.phone,
          vendorEmailAddress: publicData.vendorEmailAddress || publicData.vendorEmail || publicData.email,
          contactPersonName: publicData.contactPersonName || publicData.contactPerson || '',
          address: publicData.address || '',
          state: publicData.state || '',
          city: publicData.city || '',
          pincode: publicData.pincode || '',
          rating: publicData.rating ?? 3,
          approvalStatus: 'approved', // Public transporters are always approved
        };
        setVendor(mappedVendor as any);
        setVendorSource('public');
        setError(null);
        setLoading(false);
        return;
      }

      // PRIORITY 3: Use navigation state data as display fallback
      console.log("[VendorDetails] Not found in any collection, checking navigation state...");
      if (stateData) {
        console.log("[VendorDetails] Using fallback quote data for display");
        setVendorSource('fallback');
        setError(null);
        setVendor(null); // Keep vendor null to trigger fallback display using stateData
      } else {
        console.error("[VendorDetails] ✗ No vendor data available from any source");
        setError('Vendor not found or unable to fetch details');
      }

      setLoading(false);
    };

    fetchVendorDetails();
  }, [id, location.state]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">
              <FileText size={64} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {error || 'Vendor Not Found'}
            </h2>
            <p className="text-slate-600 mb-6">
              We couldn't retrieve the vendor details. Please try again later.
            </p>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Transport mode display mapping
  const transportModeDisplay: Record<string, string> = {
    road: 'Road',
    air: 'Air',
    rail: 'Rail',
    ship: 'Ship'
  };

  // If we don't have full vendor details but have fallback quote data, display that
  // This handles "Our Available Vendors" (public transporters) with contact info
  if (!vendor && fallbackQuoteData && !loading) {
    const quote = fallbackQuoteData;
    const companyName = quote.companyName || quote.transporterName || 'Vendor';
    const isSpecialVendor = companyName === 'LOCAL FTL' || companyName === 'Wheelseye FTL';

    // Get contact info - try multiple field names for compatibility
    const phone = quote.phone || quote.vendorPhone || quote.vendorPhoneNumber || null;
    const email = quote.email || quote.vendorEmail || quote.vendorEmailAddress || null;
    const hasContactInfo = phone || email;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Results
          </button>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className={`px-8 py-6 ${isSpecialVendor ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{companyName}</h1>
                  {quote.transportMode && (
                    <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                      <Truck size={16} />
                      {transportModeDisplay[quote.transportMode] || quote.transportMode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 space-y-6">
              {/* Contact Information Section - matches tied-up vendor design */}
              <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-indigo-500 pb-2">
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Building2 className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Company Name</p>
                      <p className="text-base text-slate-900 font-medium">{companyName}</p>
                    </div>
                  </div>

                  {/* Phone Number with WhatsApp */}
                  {phone && (
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <Phone className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-600 mb-1">Phone Number</p>
                        <div className="flex items-center gap-3">
                          <a
                            href={`tel:+91${phone}`}
                            className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
                          >
                            +91 {phone}
                          </a>
                          <a
                            href={`https://wa.me/91${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-full hover:bg-green-600 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={14} />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  {email && (
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <Mail className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-600">Email Address</p>
                        <a
                          href={`mailto:${email}`}
                          className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline break-all"
                        >
                          {email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* No contact info available message */}
                {!hasContactInfo && !isSpecialVendor && (
                  <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                          Contact Information Not Available
                        </h3>
                        <p className="text-sm text-yellow-700">
                          Contact details for this vendor are not available at the moment. Please reach out to our support team for assistance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Special vendor message */}
                {isSpecialVendor && (
                  <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm text-blue-700">
                          This is a special vendor service. For booking and inquiries, please contact our support team.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-8 py-6 border-t">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-sm text-slate-600">
                  Need to reach out? Use the contact information above.
                </p>
                <button
                  onClick={handleBack}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Back to Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Results
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {vendor.companyName}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                    <Truck size={16} />
                    {transportModeDisplay[vendor.transportMode] || vendor.transportMode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Contact Information - Only showing essential fields */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-indigo-500 pb-2">
                Contact Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Person */}
                {(vendor as any).contactPersonName && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <User className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Contact Person</p>
                      <p className="text-base text-slate-900 font-medium">
                        {(vendor as any).contactPersonName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Company Name */}
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Building2 className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Company Name</p>
                    <p className="text-base text-slate-900 font-medium">
                      {vendor.companyName}
                    </p>
                  </div>
                </div>

                {/* Phone Number */}
                {((vendor as any).vendorPhoneNumber || (vendor as any).vendorPhone) && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Phone className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-600 mb-1">Phone Number</p>
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:+91${(vendor as any).vendorPhoneNumber || (vendor as any).vendorPhone}`}
                          className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
                        >
                          +91 {(vendor as any).vendorPhoneNumber || (vendor as any).vendorPhone}
                        </a>
                        <a
                          href={`https://wa.me/91${(vendor as any).vendorPhoneNumber || (vendor as any).vendorPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-full hover:bg-green-600 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Address */}
                {((vendor as any).vendorEmailAddress || (vendor as any).vendorEmail) && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Mail className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Email Address</p>
                      <a
                        href={`mailto:${(vendor as any).vendorEmailAddress || (vendor as any).vendorEmail}`}
                        className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline break-all"
                      >
                        {(vendor as any).vendorEmailAddress || (vendor as any).vendorEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-8 py-6 border-t">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <p className="text-sm text-slate-600">
                Need to reach out? Use the contact information above.
              </p>
              <button
                onClick={handleBack}
                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Back to Results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetailsPage;
