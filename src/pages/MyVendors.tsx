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
  selectedZones?: string[];
  prices?: {
    priceRate?: any;
    priceChart?: any;
  };
  createdAt?: string;
  updatedAt?: string;
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

      const data = await getTemporaryTransporters(ownerId);

      if (data === null) {
        console.warn('fetchVendorsInternal: server returned unauthorized (null).');
        toast.error('Authentication required. Please login.');
        setVendors([]);
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.debug('fetchVendorsInternal: no vendors returned', {
          length: Array.isArray(data) ? data.length : 'not-array',
        });
        setVendors([]);
        return;
      }

      console.debug('fetchVendorsInternal: got vendors count=', data.length);

      // ✅ SORT BY DATE - NEWEST FIRST
      const sortedVendors = [...data].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });

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
  const handleEditVendor = (vendor: Vendor) => {
    console.log('📝 Opening edit modal for vendor:', vendor);
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
    console.log('🗑️ ═══════ DELETE VENDOR FRONTEND ═══════');
    console.log('📋 Function called with:');
    console.log('  - vendorId:', vendorId);
    console.log('  - companyName:', companyName);
    console.log('👤 User data from useAuth():', user);

    const customerId =
      user?._id ||
      user?.id ||
      user?.customer?._id ||
      user?.customer?.id ||
      Cookies.get('customerId') ||
      Cookies.get('customerID') ||
      localStorage.getItem('customerId') ||
      localStorage.getItem('customerID');

    console.log('✅ Resolved customerId:', customerId);

    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) {
      console.log('❌ User cancelled deletion');
      return;
    }

    if (!customerId) {
      console.error('❌ CRITICAL: No customerID found!');
      console.error('   - user object is:', user);
      toast.error('Unable to identify user. Please log in again.');
      return;
    }

    try {
      const token =
        Cookies.get('authToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      console.log('🔐 Auth token:', token ? 'Found' : 'NOT FOUND');

      if (!token) {
        console.error('❌ No auth token found');
        toast.error('Authentication required to delete vendor');
        return;
      }

      const payload = {
        customerID: customerId,
        companyName,
        vendorId,
      };

      console.log('📦 Final payload to send:');
      console.log(JSON.stringify(payload, null, 2));

      const url = `${API_BASE}/api/transporter/remove-tied-up`;

      console.log('🌐 DELETE URL:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Status Text:', response.statusText);

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
          console.log('  - Parsed JSON data:', data);
        } catch (parseErr) {
          console.warn('⚠️ Failed to parse JSON response:', parseErr);
        }
      } else {
        const text = await response.text();
        console.log('  - Non-JSON response body:', text);
      }

      if (response.status === 401) {
        console.error('❌ Unauthorized (401)');
        toast.error('Not authorized. Please login again.');
        return;
      }

      if (!response.ok) {
        console.error('❌ Delete failed, non-OK status:', response.status);
        toast.error(
          (data && data.message) ||
          `Failed to delete vendor (status ${response.status})`
        );
        return;
      }

      if (data && data.success === false) {
        console.error('❌ Delete failed (API said false):', data);
        toast.error(data.message || 'Failed to delete vendor');
        return;
      }

      console.log('✅ Vendor deleted successfully');
      toast.success('Vendor deleted successfully');
      await fetchVendorsInternal();
    } catch (err) {
      console.error('💥 Error deleting vendor:', err);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Vendors</h1>
          <p className="mt-2 text-gray-600">
            Manage your added vendors and their details
          </p>
        </div>

        {vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No vendors found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first vendor.
            </p>
            <div className="mt-6">
              <a
                href="/addvendor"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Vendor
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <div key={vendor._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendor.companyName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Code: {vendor.vendorCode}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span>{' '}
                        {vendor.vendorPhone}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span>{' '}
                        {vendor.vendorEmail}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">GST:</span> {vendor.gstNo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Mode:</span> {vendor.mode}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span>{' '}
                        {vendor.city}, {vendor.state} - {vendor.pincode}
                      </p>
                      {vendor.rating && vendor.rating > 0 && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Rating:</span>{' '}
                          {vendor.rating}/5
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">
                        Added on {formatDate(vendor.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleEditVendor(vendor)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteVendor(vendor._id, vendor.companyName)
                    }
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
