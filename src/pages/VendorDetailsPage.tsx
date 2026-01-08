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
  MapPin,
  Star,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { TemporaryTransporter } from '../utils/validators';
import { getTemporaryTransporterById, getTemporaryTransporters } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const VendorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<(TemporaryTransporter & { _id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackQuoteData, setFallbackQuoteData] = useState<any>(null);

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

      // Check if we have fallback quote data from navigation state
      const stateData = (location.state as any)?.quoteData;
      if (stateData) {
        console.log("Found fallback quote data:", stateData);
        console.log("transporterData in quote:", stateData.transporterData);
        setFallbackQuoteData(stateData);
      }

      setLoading(true);

      // PRIORITY 1: Try fetching all vendors for the customer and match by company name
      const ownerId = (user as any)?.customer?._id || (user as any)?._id;
      console.log("Customer ID:", ownerId);

      if (ownerId && stateData) {
        console.log("Fetching all vendors for customer:", ownerId);
        const allVendors = await getTemporaryTransporters(ownerId);
        console.log("All vendors from DB:", allVendors);

        if (allVendors && allVendors.length > 0) {
          const companyName = stateData.companyName || stateData.transporterName;
          console.log("Looking for vendor with companyName:", companyName);

          // Find vendor by company name (case-insensitive match)
          const matchedVendor = allVendors.find(v =>
            v.companyName && companyName &&
            v.companyName.toLowerCase().trim() === companyName.toLowerCase().trim()
          );

          if (matchedVendor) {
            console.log("Found matching vendor by company name:", matchedVendor);
            setVendor(matchedVendor as any);
            setError(null);
            setLoading(false);
            return;
          } else {
            console.log("No vendor found matching company name:", companyName);
          }
        }
      }

      // Fallback: Try fetching by ID
      console.log("Fetching vendor details for ID:", id);
      const data = await getTemporaryTransporterById(id);
      console.log("API Response data:", data);

      if (data) {
        console.log("Successfully fetched vendor data by ID:", data);
        setVendor(data);
        setError(null);
      } else {
        console.log("API returned null, checking for fallback data");
        // If API fails but we have fallback data, use it
        if (stateData) {
          console.log("Using fallback data instead");
          setError(null);
          setVendor(null); // Keep vendor null to trigger fallback display
        } else {
          console.error("No vendor data available from API or fallback");
          setError('Vendor not found or unable to fetch details');
        }
      }

      setLoading(false);
    };

    fetchVendorDetails();
  }, [id, location.state, user]);

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
