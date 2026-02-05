import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Truck, LogOut, Plus, Trash2, Save } from 'lucide-react';

interface VendorConfig {
  id: string;
  name: string;
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
}

const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorConfig[]>([]);
  const [editingVendor, setEditingVendor] = useState<VendorConfig | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const addNewVendor = () => {
    const newVendor: VendorConfig = {
      id: Date.now().toString(),
      name: '',
      baseFare: { Road: 0, Rail: 0, Air: 0, Ship: 0 },
      perKmCharge: { Road: 0, Rail: 0, Air: 0, Ship: 0 },
      perKgCharge: { Road: 0, Rail: 0, Air: 0, Ship: 0 }
    };
    setEditingVendor(newVendor);
  };

  const saveVendor = () => {
    if (editingVendor) {
      setVendors(prev => {
        const existing = prev.findIndex(v => v.id === editingVendor.id);
        if (existing >= 0) {
          return prev.map(v => v.id === editingVendor.id ? editingVendor : v);
        }
        return [...prev, editingVendor];
      });
      setEditingVendor(null);
    }
  };

  const deleteVendor = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Truck className="text-blue-700 h-8 w-8" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Vendor Management</h2>
            <button
              onClick={addNewVendor}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add New Vendor
            </button>
          </div>

          {editingVendor && (
            <div className="mb-8 border-b pb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingVendor.id ? 'Edit Vendor' : 'New Vendor'}
              </h3>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    value={editingVendor.name}
                    onChange={(e) => setEditingVendor({
                      ...editingVendor,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {['Road', 'Rail', 'Air', 'Ship'].map((mode) => (
                <div key={mode} className="mb-6">
                  <h4 className="text-md font-medium mb-2">{mode} Transport</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Fare
                      </label>
                      <input
                        type="number"
                        value={editingVendor.baseFare[mode as keyof typeof editingVendor.baseFare]}
                        onChange={(e) => setEditingVendor({
                          ...editingVendor,
                          baseFare: {
                            ...editingVendor.baseFare,
                            [mode]: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Per KM Charge
                      </label>
                      <input
                        type="number"
                        value={editingVendor.perKmCharge[mode as keyof typeof editingVendor.perKmCharge]}
                        onChange={(e) => setEditingVendor({
                          ...editingVendor,
                          perKmCharge: {
                            ...editingVendor.perKmCharge,
                            [mode]: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Per KG Charge
                      </label>
                      <input
                        type="number"
                        value={editingVendor.perKgCharge[mode as keyof typeof editingVendor.perKgCharge]}
                        onChange={(e) => setEditingVendor({
                          ...editingVendor,
                          perKgCharge: {
                            ...editingVendor.perKgCharge,
                            [mode]: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingVendor(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={saveVendor}
                  className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  <Save className="h-5 w-5" />
                  Save Vendor
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transport Modes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {Object.keys(vendor.baseFare).map((mode) => (
                          <span
                            key={mode}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {mode}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingVendor(vendor)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteVendor(vendor.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;