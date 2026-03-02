// frontend/src/pages/MyVendors.tsx
// debug: unique string to verify this file is bundled
console.debug('***MYVENDORS FILE LOADED***', new Date().toISOString());

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { getTemporaryTransporters } from '../services/api';
import Cookies from 'js-cookie';
import EditVendorModal from '../components/EditVendorModal';
import { API_BASE_URL } from '../config/api';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingOfficeIcon,
  TruckIcon,
  ArrowPathIcon,
  PlusIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Vendor {
  _id: string;
  companyName: string;
  vendorCode?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  gstNo?: string;
  mode?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  rating?: number;
  subVendor?: string;
  contactPersonName?: string;
  serviceMode?: string;
  selectedZones?: string[];
  prices?: {
    priceRate?: any;
    priceChart?: any;
  };
  createdAt?: string;
  updatedAt?: string;
  source?: 'MongoDB' | 'UTSF';
  integrityMode?: string;
  softExclusions?: number;
}

// Use centralized API configuration
const API_BASE = API_BASE_URL;

const MyVendors: React.FC = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // -------------------------
  // Debug / test helpers
  // -------------------------
  console.debug('MyVendors render — user from useAuth():', user);

  (window as any).fetchVendors = (window as any).fetchVendors || undefined;

  // -------------------------
  // fetch logic (internal)
  // -------------------------
  const fetchVendorsInternal = async () => {
    setLoading(true);
    try {
      console.debug('fetchVendorsInternal starting — user=', user);

      const ownerId =
        (user && (user._id ?? user.id)) ||
        (user && (user.customer && (user.customer._id ?? user.customer.id))) ||
        null;

      console.debug('fetchVendorsInternal: resolved ownerId=', ownerId);

      if (!ownerId) {
        console.debug('fetchVendorsInternal: no ownerId resolved — skipping fetch');
        setLoading(false);
        return;
      }

      // Fetch MongoDB vendors
      const mongoData = await getTemporaryTransporters(ownerId);
      let mongoVendors: Vendor[] = [];
      if (mongoData && Array.isArray(mongoData)) {
        mongoVendors = mongoData.map((v: any) => ({ ...v, source: 'MongoDB' as const }));
      }

      // Fetch UTSF vendors
      let utsfVendors: Vendor[] = [];
      try {
        const token = Cookies.get('authToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const utsfRes = await fetch(`${API_BASE}/api/utsf/my-vendors?customerId=${ownerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (utsfRes.ok) {
          const utsfJson = await utsfRes.json();
          if (utsfJson.success && Array.isArray(utsfJson.transporters)) {
            utsfVendors = utsfJson.transporters.map((t: any) => ({
              _id: t._id,
              companyName: t.companyName,
              vendorCode: t.vendorCode,
              vendorPhone: t.vendorPhone,
              vendorEmail: t.vendorEmail,
              gstNo: t.gstNo,
              address: t.address,
              city: t.city,
              state: t.state,
              pincode: t.pincode,
              mode: t.mode,
              serviceMode: t.serviceMode,
              contactPersonName: t.contactPersonName,
              subVendor: t.subVendor,
              rating: t.rating,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              source: 'UTSF' as const,
              integrityMode: t.integrityMode,
              softExclusions: t.softExclusions,
              prices: t.pricing ? {
                priceRate: t.pricing.priceRate || {},
                priceChart: t.pricing.priceChart || null,
              } : undefined,
            }));
          }
        }
      } catch (utsfErr) {
        console.warn('fetchVendorsInternal: UTSF fetch failed (non-fatal)', utsfErr);
      }

      // Merge and sort by date (newest first)
      const allVendors = [...mongoVendors, ...utsfVendors];
      const sortedVendors = allVendors.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      console.debug('fetchVendorsInternal: merged vendors count=', sortedVendors.length, `(MongoDB=${mongoVendors.length}, UTSF=${utsfVendors.length})`);
      setVendors(sortedVendors);

    } catch (err: any) {
      console.error('fetchVendorsInternal error', err);
      toast.error('Error fetching vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  (window as any).fetchVendors = async () => {
    return fetchVendorsInternal();
  };

  // -------------------------
  // Auto-run when user becomes available
  // -------------------------
  useEffect(() => {
    console.debug('MyVendors useEffect triggered — user =', user);
    const ownerId =
      (user && (user._id ?? user.id)) ||
      (user && (user.customer && (user.customer._id ?? user.customer.id))) ||
      null;

    if (ownerId) {
      fetchVendorsInternal();
    } else {
      console.debug('MyVendors useEffect: ownerId not present, fetch skipped');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -------------------------
  // Edit handlers
  // -------------------------
  const handleEditVendor = async (vendor: Vendor) => {
    console.log('📝 Opening edit modal for vendor:', vendor);

    if (vendor.source === 'UTSF') {
      // Fetch full UTSF data so EditVendorModal has meta + pricing fields
      try {
        const token =
          Cookies.get('authToken') ||
          localStorage.getItem('token') ||
          localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/api/utsf/transporters/${vendor._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          const t = json.transporter;
          const meta = t?.data?.meta || {};
          const pricing = t?.data?.pricing || {};
          // Build a vendor-shaped object that EditVendorModal can read
          const enriched: Vendor = {
            ...vendor,
            companyName: meta.companyName || vendor.companyName,
            vendorCode: meta.vendorCode,
            vendorPhone: meta.vendorPhone,
            vendorEmail: meta.vendorEmail,
            gstNo: meta.gstNo,
            address: meta.address,
            state: meta.state,
            city: meta.city,
            pincode: meta.pincode ? String(meta.pincode) : undefined,
            rating: meta.rating ?? vendor.rating,
            subVendor: meta.subVendor,
            mode: meta.transportMode || meta.mode,
            serviceMode: meta.serviceMode,
            contactPersonName: meta.contactPersonName,
            prices: {
              priceRate: pricing.priceRate || {},
              priceChart: pricing.priceChart || null,
            },
            source: 'UTSF',
          };
          setSelectedVendor(enriched);
          setShowEditModal(true);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch full UTSF data for editing:', err);
      }
    }

    setSelectedVendor(vendor);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    console.log('🚪 Closing edit modal');
    setShowEditModal(false);
    setSelectedVendor(null);
  };

  const handleSaveVendor = async (updatedVendor: any) => {
    console.log('💾 Vendor saved, refreshing list', updatedVendor);
    await fetchVendorsInternal();
  };

  // -------------------------
  // Delete handler (fixed)
  // -------------------------
  const handleDeleteVendor = async (vendorId: string, companyName: string) => {
    const customerId =
      user?._id ||
      user?.id ||
      user?.customer?._id ||
      user?.customer?.id ||
      Cookies.get('customerId') ||
      Cookies.get('customerID') ||
      localStorage.getItem('customerId') ||
      localStorage.getItem('customerID');

    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) return;
    if (!customerId) {
      toast.error('Unable to identify user. Please log in again.');
      return;
    }

    // Check if this is a UTSF vendor
    const vendor = vendors.find(v => v._id === vendorId);
    const isUtsf = vendor?.source === 'UTSF';

    try {
      const token =
        Cookies.get('authToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      if (!token) {
        toast.error('Authentication required to delete vendor');
        return;
      }

      let response;
      if (isUtsf) {
        // UTSF vendor: use the user-scoped endpoint
        response = await fetch(`${API_BASE}/api/utsf/my-vendors/${vendorId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ customerId }),
        });
      } else {
        // MongoDB vendor: use the legacy endpoint
        response = await fetch(`${API_BASE}/api/transporter/remove-tied-up`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customerID: customerId,
            companyName,
            vendorId,
          }),
        });
      }

      if (response.status === 401) {
        toast.error('Not authorized. Please login again.');
        return;
      }
      if (response.status === 403) {
        toast.error('You can only delete your own vendors.');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.message || `Failed to delete vendor (status ${response.status})`);
        return;
      }

      toast.success('Vendor deleted successfully');
      await fetchVendorsInternal();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      toast.error('Error deleting vendor');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // -------------------------
  // Render
  // -------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-500 text-sm font-medium">Loading vendors...</p>
        </div>
      </div>
    );
  }

  // Helper: render star rating
  const renderStars = (rating: number | undefined) => {
    if (!rating || rating <= 0) return null;
    const full = Math.floor(rating);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= full
          ? <StarSolidIcon key={i} className="w-3.5 h-3.5 text-amber-400" />
          : <StarIcon key={i} className="w-3.5 h-3.5 text-slate-300" />
      );
    }
    return (
      <div className="flex items-center gap-0.5">
        {stars}
        <span className="ml-1 text-xs text-slate-500 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BuildingOfficeIcon className="w-7 h-7 text-indigo-600 shrink-0" />
              My Vendors
              {vendors.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700">
                  {vendors.length}
                </span>
              )}
            </h1>
            <p className="mt-1 text-slate-500 text-sm">
              Manage your logistics partners and their pricing details
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchVendorsInternal()}
              title="Refresh vendors list"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              href="/addvendor"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add Vendor
            </a>
          </div>
        </div>

        {vendors.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 px-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              No vendors yet
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Start by adding your first logistics vendor to compare rates.
            </p>
            <a
              href="/addvendor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First Vendor
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => {
              const isUtsf = vendor.source === 'UTSF';
              const accentColor = isUtsf
                ? 'from-emerald-500 to-teal-600'
                : 'from-blue-500 to-indigo-600';
              const badgeBg = isUtsf
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800';
              const locationStr = [vendor.city, vendor.state].filter(Boolean).join(', ');
              const locationFull = locationStr
                ? (vendor.pincode ? `${locationStr} – ${vendor.pincode}` : locationStr)
                : null;

              return (
                <div
                  key={vendor._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* Color accent strip */}
                  <div className={`h-1 w-full bg-gradient-to-r ${accentColor}`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 leading-tight truncate" title={vendor.companyName}>
                          {vendor.companyName}
                        </h3>
                        {vendor.vendorCode && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">#{vendor.vendorCode}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeBg}`}>
                          {vendor.source || 'MongoDB'}
                        </span>
                        {vendor.rating && vendor.rating > 0 ? (
                          renderStars(vendor.rating)
                        ) : null}
                      </div>
                    </div>

                    {/* Transport mode badges */}
                    {(vendor.mode || vendor.serviceMode) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {vendor.mode && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            <TruckIcon className="w-3 h-3" />
                            {vendor.mode}
                          </span>
                        )}
                        {vendor.serviceMode && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-medium">
                            {vendor.serviceMode}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="space-y-1.5 text-sm flex-1">
                      {vendor.vendorPhone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{vendor.vendorPhone}</span>
                        </div>
                      )}
                      {vendor.vendorEmail && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-xs">{vendor.vendorEmail}</span>
                        </div>
                      )}
                      {locationFull && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPinIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-xs">{locationFull}</span>
                        </div>
                      )}
                      {vendor.gstNo && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="text-xs font-mono text-slate-400 shrink-0">GST</span>
                          <span className="text-xs font-mono truncate">{vendor.gstNo}</span>
                        </div>
                      )}
                    </div>

                    {/* UTSF integrity info */}
                    {isUtsf && vendor.integrityMode && vendor.integrityMode !== 'NONE' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Integrity:</span>
                        <span className={`text-xs font-semibold ${vendor.integrityMode === 'STRICT' ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {vendor.integrityMode}
                        </span>
                        {vendor.softExclusions != null && vendor.softExclusions > 0 && (
                          <span className="text-xs text-slate-400">({vendor.softExclusions} soft-blocked)</span>
                        )}
                      </div>
                    )}

                    {/* Date footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400">
                        Added {formatDate(vendor.createdAt)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEditVendor(vendor)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor._id, vendor.companyName)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-400 active:scale-95 transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showEditModal && selectedVendor && (
          <EditVendorModal
            vendor={selectedVendor}
            onClose={handleCloseEditModal}
            onSave={handleSaveVendor}
          />
        )}
      </div>
    </div>
  );
};

export default MyVendors;
