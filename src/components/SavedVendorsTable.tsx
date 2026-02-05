/**
 * SavedVendorsTable component
 * Displays list of created temporary transporters
 */

import React, { useEffect, useState } from 'react';
import { getTemporaryTransporters, deleteTemporaryTransporter } from '../services/api';
import { TemporaryTransporter } from '../utils/validators';
import { TableCellsIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth'; // <<-- ADDED

// =============================================================================
// COMPONENT
// =============================================================================

export const SavedVendorsTable: React.FC<{ refreshTrigger?: number }> = ({
  refreshTrigger = 0,
}) => {
  const [vendors, setVendors] = useState<Array<TemporaryTransporter & { _id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<
    (TemporaryTransporter & { _id: string }) | null
  >(null);

  const { user } = useAuth(); // <<-- ADDED: get logged-in user

  /**
   * Load vendors from API
   */
  const loadVendors = async () => {
    setIsLoading(true);
    try {
      // Prefer user._id then user.id, else undefined (service will handle)
      const ownerId = user ? (user._id ?? user.id) : undefined;
      const data = await getTemporaryTransporters(ownerId); // <<-- PASS ownerId
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle vendor deletion
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    const success = await deleteTemporaryTransporter(id);
    if (success) {
      toast.success('Vendor deleted successfully');
      setVendors((prev) => prev.filter((v) => v._id !== id));
    } else {
      toast.error('Failed to delete vendor');
    }
  };

  /**
   * Load vendors on mount and when refresh trigger or user id changes
   */
  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, user?. _id]); // <<-- ADDED user._id to reload when auth ready

  /**
   * Format date
   */
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // ... rest unchanged (render)
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5 text-blue-500" />
          Saved Vendors ({vendors.length})
        </h2>
        <button
          type="button"
          onClick={loadVendors}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && vendors.length === 0 && (
        <div className="text-center py-12">
          <TableCellsIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">No vendors saved yet</p>
          <p className="text-sm text-slate-500 mt-2">
            Create your first vendor using the form above
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && vendors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Company Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Mode
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Created
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr
                  key={vendor._id}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">
                        {vendor.companyName}
                      </p>
                      <p className="text-xs text-slate-500">{vendor.gstin || 'No GST'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-slate-800">{vendor.contactPersonName}</p>
                      <p className="text-xs text-slate-500">
                        {vendor.vendorPhoneNumber}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {vendor.transportMode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize
                                 ${
                                   vendor.status === 'submitted'
                                     ? 'bg-green-100 text-green-800'
                                     : 'bg-yellow-100 text-yellow-800'
                                 }`}
                    >
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(vendor.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedVendor(vendor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(vendor._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete vendor"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      {selectedVendor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVendor(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Vendor Details</h3>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Company Info */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Company Information</h4>
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-slate-600">Company Name:</dt>
                  <dd className="font-medium">{selectedVendor.companyName}</dd>
                  <dt className="text-slate-600">Contact Person:</dt>
                  <dd className="font-medium">{selectedVendor.contactPersonName}</dd>
                  <dt className="text-slate-600">Phone:</dt>
                  <dd className="font-medium">{selectedVendor.vendorPhoneNumber}</dd>
                  <dt className="text-slate-600">Email:</dt>
                  <dd className="font-medium">{selectedVendor.vendorEmailAddress}</dd>
                  {selectedVendor.gstin && (
                    <>
                      <dt className="text-slate-600">GST:</dt>
                      <dd className="font-medium">{selectedVendor.gstin}</dd>
                    </>
                  )}
                </dl>
              </div>

              {/* Geo */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Location</h4>
                <p className="text-slate-600">
                  {selectedVendor.geo.city}, {selectedVendor.geo.state} - {selectedVendor.geo.pincode}
                </p>
              </div>

              {/* Charges */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Charges</h4>
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-slate-600">Docket:</dt>
                  <dd>₹{selectedVendor.charges.docketCharges}</dd>
                  <dt className="text-slate-600">Min Charges:</dt>
                  <dd>₹{selectedVendor.charges.minCharges}</dd>
                  <dt className="text-slate-600">Fuel Surcharge:</dt>
                  <dd>{selectedVendor.charges.fuelSurchargePct}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
