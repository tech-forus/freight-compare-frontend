import React from 'react';
import { Truck, Package, Ruler, Weight, MapPin, Download, FileSpreadsheet } from 'lucide-react';

interface VehicleType {
  name: string;
  capacity: number; // Upper limit in kg
  maxDistance: number; // In kilometers
  icon: React.ReactNode;
}

const VehicleInfoPage: React.FC = () => {
  const vehicleTypes: VehicleType[] = [
    {
      name: "Tata Ace",
      capacity: 1000,
      maxDistance: 1000,
      icon: <Truck className="w-6 h-6 text-blue-600" />
    },
    {
      name: "Pickup",
      capacity: 1200,
      maxDistance: 1000,
      icon: <Truck className="w-6 h-6 text-green-600" />
    },
    {
      name: "10 ft Truck",
      capacity: 2000,
      maxDistance: 1500,
      icon: <Truck className="w-6 h-6 text-orange-600" />
    },
    {
      name: "Eicher 14 ft",
      capacity: 4000,
      maxDistance: 2200,
      icon: <Truck className="w-6 h-6 text-purple-600" />
    },
    {
      name: "Eicher 19 ft",
      capacity: 7000,
      maxDistance: 2700,
      icon: <Truck className="w-6 h-6 text-red-600" />
    },
    {
      name: "Eicher 20 ft",
      capacity: 10000,
      maxDistance: 3200,
      icon: <Truck className="w-6 h-6 text-indigo-600" />
    },
    {
      name: "Container 32 ft MXL",
      capacity: 18000,
      maxDistance: 3200,
      icon: <Package className="w-6 h-6 text-gray-600" />
    }
  ];

  const handleExportToCSV = () => {
    const headers = ['Vehicle Name', 'Capacity (kg)', 'Max Distance (km)'];
    const csvContent = [
      headers.join(','),
      ...vehicleTypes.map(vehicle => [
        vehicle.name,
        vehicle.capacity,
        vehicle.maxDistance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-information-sheet.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Vehicle Information Sheet</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Comprehensive data sheet of different vehicle types used in freight transportation
          </p>
          <button
            onClick={handleExportToCSV}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>

        {/* Vehicle Information Sheet */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Sheet Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Vehicle Specifications</h2>
              </div>
              <div className="text-sm text-gray-500">
                Total Vehicles: {vehicleTypes.length}
              </div>
            </div>
          </div>

          {/* Sheet Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity (kg)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Distance (km)
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicleTypes.map((vehicle, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {vehicle.icon}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {vehicle.capacity.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {vehicle.maxDistance.toLocaleString()} km
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guidelines */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Selection Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Considerations</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Choose vehicle capacity that exceeds your shipment weight by 10-15%</li>
                <li>• Consider volumetric weight for lightweight but bulky items</li>
                <li>• Factor in packaging weight when calculating total weight</li>
                <li>• Ensure compliance with vehicle weight limits and regulations</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distance & Route Factors</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Local deliveries (0-500 km): Tata Ace, Pickup, or 10 ft trucks</li>
                <li>• Regional shipments (500-2000 km): 14 ft or 19 ft trucks</li>
                <li>• National deliveries (2000+ km): 20 ft or Container trucks</li>
                <li>• Route complexity affects actual delivery times</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleInfoPage;
