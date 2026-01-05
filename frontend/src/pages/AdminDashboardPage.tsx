// src/pages/AdminDashboardPage.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect for potential future API calls
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assuming path is correct from src/pages/
import { Truck, LogOut, Plus, Trash2, Save } from 'lucide-react';

// It's generally better to move interfaces to a central types file (e.g., src/types/index.ts)
// and import them. But for now, keeping it here is fine to match your original.
// Ensure this VendorConfig matches what your backend will expect and what CalculatorPage will use.
interface VendorConfig {
  id: string;
  name: string;
  // Consider making these rate objects match your more detailed VendorRateConfig from types.ts
  baseFare: { 
    Road: number;
    Rail: number;
    Air: number;
    Ship: number;
  };
  perKmCharge: {
    Road: number;
    Rail: number;
    Air: number;
    Ship: number;
  };
  perKgCharge: {
    Road: number;
    Rail: number;
    Air: number;
    Ship: number;
  };
  // Add other fields from your full VendorRateConfig like volumetricWeightDivisor, surcharges, etc.
  // And the new fields: serviceablePincodes, odaOffered, odaDetails
  serviceablePincodes?: string[];
  odaOffered?: boolean;
  odaDetails?: string;
}

const AdminDashboardPage: React.FC = () => { // Renamed component
  const { user, logout } = useAuth(); // Assuming useAuth provides user if needed, and logout
  const navigate = useNavigate();
  
  // TODO: Replace this with data fetched from your backend API
  const [vendors, setVendors] = useState<VendorConfig[]>([]); 
  const [editingVendor, setEditingVendor] = useState<VendorConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For API call loading state

  // TODO: useEffect to fetch vendors from API when component mounts
  useEffect(() => {
    const fetchAdminVendors = async () => {
      setIsLoading(true);
      console.log("AdminDashboardPage: Fetching vendors (mock for now)...");
      // Replace with: const response = await fetch('/api/admin/vendors');
      // const data = await response.json();
      // setVendors(data);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      const mockVendors: VendorConfig[] = [
        // Add some mock vendors with the full structure including rateConfig details for testing
        { id: 'v1', name: 'Existing Vendor 1', baseFare: { Road: 50, Rail: 0, Air: 0, Ship: 0 }, perKmCharge: { Road: 1, Rail: 0, Air: 0, Ship: 0 }, perKgCharge: { Road: 0.1, Rail: 0, Air: 0, Ship: 0 }, odaOffered: true, serviceablePincodes: ["110001"]},
        { id: 'v2', name: 'Existing Vendor 2', baseFare: { Road: 60, Rail: 0, Air: 0, Ship: 0 }, perKmCharge: { Road: 1.2, Rail: 0, Air: 0, Ship: 0 }, perKgCharge: { Road: 0.15, Rail: 0, Air: 0, Ship: 0 } },
      ];
      setVendors(mockVendors);
      setIsLoading(false);
    };
    fetchAdminVendors();
  }, []);


  const handleLogout = () => {
    logout();
    navigate('/signin'); // Changed to navigate to /signin
  };

  const addNewVendor = () => {
    // Initialize with all fields from the detailed VendorRateConfig and new fields
    const newVendor: VendorConfig = {
      id: '', // ID will be set by backend or generated before save if staying client-side for now
      name: '',
      baseFare: { Road: 0, Rail: 0, Air: 0, Ship: 0 },
      perKmCharge: { Road: 0, Rail: 0, Air: 0, Ship: 0 },
      perKgCharge: { Road: 0, Rail: 0, Air: 0, Ship: 0 },
      // TODO: Add initializers for volumetricWeightDivisor, expressSurchargePercent, fragileSurchargeAbsolute
      // volumetricWeightDivisor: { Road: 5000, Rail: 5000, Air: 6000, Ship: 4000 },
      // expressSurchargePercent: 0,
      // fragileSurchargeAbsolute: 0,
      serviceablePincodes: [],
      odaOffered: false,
      odaDetails: ''
    };
    setEditingVendor(newVendor);
  };

  const handleSaveVendor = async () => { // Made async for future API call
    if (!editingVendor || !editingVendor.name.trim()) {
      alert("Vendor name cannot be empty.");
      return;
    }
    setIsLoading(true);
    // TODO: Implement API call to save/update vendor
    if (editingVendor.id && editingVendor.id !== '') { // Existing vendor (has a real ID from backend or previously generated)
      console.log("AdminDashboardPage: Updating vendor (mock):", editingVendor);
      // await fetch(`/api/admin/vendors/${editingVendor.id}`, { method: 'PUT', body: JSON.stringify(editingVendor), headers: {'Content-Type': 'application/json'} });
      setVendors(prev => prev.map(v => v.id === editingVendor.id ? editingVendor : v));
    } else { // New vendor
      const vendorToSave = { ...editingVendor, id: Date.now().toString() }; // Mock ID generation
      console.log("AdminDashboardPage: Adding new vendor (mock):", vendorToSave);
      // const response = await fetch('/api/admin/vendors', { method: 'POST', body: JSON.stringify(vendorToSave), headers: {'Content-Type': 'application/json'} });
      // const savedVendor = await response.json(); // Assuming backend returns the saved vendor with its new ID
      // setVendors(prev => [...prev, savedVendor]);
      setVendors(prev => [...prev, vendorToSave]);
    }
    setEditingVendor(null);
    setIsLoading(false);
  };

  const handleDeleteVendor = async (id: string) => { // Made async for future API call
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      setIsLoading(true);
      console.log("AdminDashboardPage: Deleting vendor (mock):", id);
      // TODO: Implement API call to delete vendor: await fetch(`/api/admin/vendors/${id}`, { method: 'DELETE' });
      setVendors(prev => prev.filter(v => v.id !== id));
      setIsLoading(false);
    }
  };
  
  // Helper to handle input changes for nested rateConfig objects
  const handleRateConfigChange = (mode: string, field: keyof VendorConfig['baseFare'], value: string, configKey: 'baseFare' | 'perKmCharge' | 'perKgCharge') => {
    if (editingVendor) {
      setEditingVendor(prev => {
        if (!prev) return null;
        const newConfig = { ...prev[configKey] };
        (newConfig as any)[mode] = parseFloat(value) || 0; // Type assertion needed here
        return { ...prev, [configKey]: newConfig };
      });
    }
  };

  // TODO: Add fields for volumetricWeightDivisor, expressSurchargePercent, fragileSurchargeAbsolute,
  // serviceablePincodes (e.g., comma-separated string then split to array), odaOffered (checkbox), odaDetails (textarea)
  // in the editingVendor form.

  return (
    <div className="pb-12"> {/* Removed min-h-screen as MainLayout handles it, added pb for footer spacing */}
      {/* Header is now part of MainLayout, so we remove the <header> block from here */}
      {/* The MainLayout used in App.tsx will provide the consistent site header */}

      <div className="flex justify-between items-center mb-6 pt-4"> {/* Added pt-4 if no header here */}
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        {/* Logout button could also be in the main site Header, accessible via useAuth */}
        <button
            onClick={handleLogout}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
        >
            <LogOut size={16} className="mr-2" />
            Sign Out
        </button>
      </div>
        
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Vendor Management</h2>
          <button
            onClick={addNewVendor}
            disabled={isLoading}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            <Plus className="h-5 w-5" />
            Add New Vendor
          </button>
        </div>

        {editingVendor && (
          <div className="mb-8 border rounded-md p-6 bg-gray-50"> {/* Styled the editing form area */}
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {editingVendor.id && editingVendor.id !== '' ? 'Edit Vendor' : 'Add New Vendor'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name
                </label>
                <input
                  id="vendorName"
                  type="text"
                  value={editingVendor.name}
                  onChange={(e) => setEditingVendor({
                    ...editingVendor,
                    name: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter vendor name"
                />
              </div>
            </div>

            {['Road', 'Rail', 'Air', 'Ship'].map((mode) => (
              <div key={mode} className="mb-6 border-t pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-600 mb-3">{mode} Transport Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare</label>
                    <input type="number" step="0.01" value={editingVendor.baseFare[mode as keyof typeof editingVendor.baseFare]}
                      onChange={(e) => handleRateConfigChange(mode, 'Road', e.target.value, 'baseFare')} // Key 'Road' is arbitrary here, type assertion makes it okay
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per KM Charge</label>
                    <input type="number" step="0.01" value={editingVendor.perKmCharge[mode as keyof typeof editingVendor.perKmCharge]}
                      onChange={(e) => handleRateConfigChange(mode, 'Road', e.target.value, 'perKmCharge')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per KG Charge</label>
                    <input type="number" step="0.01" value={editingVendor.perKgCharge[mode as keyof typeof editingVendor.perKgCharge]}
                      onChange={(e) => handleRateConfigChange(mode, 'Road', e.target.value, 'perKgCharge')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                </div>
              </div>
            ))}
            
            {/* TODO: Add fields for other rateConfig properties (volumetric divisors, surcharges) */}
            {/* TODO: Add fields for serviceablePincodes (textarea for comma separated), odaOffered (checkbox), odaDetails (textarea) */}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setEditingVendor(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSaveVendor} disabled={isLoading}
                className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400">
                <Save size={16} />
                {isLoading ? 'Saving...' : 'Save Vendor'}
              </button>
            </div>
          </div>
        )}

        {isLoading && vendors.length === 0 && <p className="text-center py-4">Loading vendors...</p>}
        {!isLoading && vendors.length === 0 && !editingVendor && <p className="text-center py-4 text-gray-500">No vendors found. Click "Add New Vendor" to get started.</p>}
        
        {vendors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configured Modes</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(vendor.baseFare || {}) // Use empty object if baseFare is undefined
                          .filter(([currentModeKey, baseFareValue]) => {
                            const baseFareIsConfigured = typeof baseFareValue === 'number' && baseFareValue >= 0; // Check if baseFare is a valid number
                            
                            const kmChargeIsConfigured = 
                              vendor.perKmCharge && 
                              typeof vendor.perKmCharge === 'object' &&
                              typeof (vendor.perKmCharge as any)[currentModeKey] === 'number' &&
                              (vendor.perKmCharge as any)[currentModeKey] >= 0;

                            const kgChargeIsConfigured = 
                              vendor.perKgCharge &&
                              typeof vendor.perKgCharge === 'object' &&
                              typeof (vendor.perKgCharge as any)[currentModeKey] === 'number' &&
                              (vendor.perKgCharge as any)[currentModeKey] >= 0;

                            return baseFareIsConfigured || kmChargeIsConfigured || kgChargeIsConfigured;
                          })
                          .map(([currentModeKey, _]) => (
                            <span key={currentModeKey} className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                              {currentModeKey}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setEditingVendor(vendor)} disabled={isLoading}
                        className="text-blue-600 hover:text-blue-800 mr-3 disabled:text-gray-400">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteVendor(vendor.id)} disabled={isLoading}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-400">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage; // Renamed export