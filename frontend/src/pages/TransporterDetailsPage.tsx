// src/pages/TransporterDetailsPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Phone,
  Mail,
  Truck,
  ArrowLeft,
  Loader2,
  FileText,
  MessageCircle
} from 'lucide-react';
import { getTransporterById } from '../services/api';

interface Transporter {
  _id: string;
  companyName: string;
  phone: number;
  email: string;
  deliveryMode?: string;
  address?: string;
  state?: string;
  pincode?: number;
}

const TransporterDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transporter, setTransporter] = useState<Transporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransporterDetails = async () => {
      console.log("=== TRANSPORTER DETAILS PAGE ===");
      console.log("Transporter ID:", id);

      if (!id) {
        setError('No transporter ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await getTransporterById(id);

        if (data) {
          console.log("Successfully fetched transporter:", data);
          setTransporter(data);
          setError(null);
        } else {
          console.error("No transporter data found");
          setError('Transporter not found');
        }
      } catch (err) {
        console.error("Error fetching transporter:", err);
        setError('Failed to fetch transporter details');
      }

      setLoading(false);
    };

    fetchTransporterDetails();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading transporter details...</p>
        </div>
      </div>
    );
  }

  if (error || !transporter) {
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
              Vendor Not Found
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
    Road: 'Road',
    air: 'Air',
    Air: 'Air',
    rail: 'Rail',
    Rail: 'Rail',
    ship: 'Ship',
    Ship: 'Ship'
  };

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
                  {transporter.companyName}
                </h1>
                {transporter.deliveryMode && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                      <Truck size={16} />
                      {transportModeDisplay[transporter.deliveryMode] || transporter.deliveryMode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Contact Information */}
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
                    <p className="text-base text-slate-900 font-medium">
                      {transporter.companyName}
                    </p>
                  </div>
                </div>

                {/* Phone Number */}
                {transporter.phone && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Phone className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-600 mb-1">Phone Number</p>
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:+91${transporter.phone}`}
                          className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
                        >
                          +91 {transporter.phone}
                        </a>
                        <a
                          href={`https://wa.me/91${transporter.phone}`}
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
                {transporter.email && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Mail className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Email Address</p>
                      <a
                        href={`mailto:${transporter.email}`}
                        className="text-base text-indigo-600 font-medium hover:text-indigo-800 hover:underline break-all"
                      >
                        {transporter.email}
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

export default TransporterDetailsPage;
