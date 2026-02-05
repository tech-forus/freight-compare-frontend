// src/components/ShipmentOverview.tsx
import React, { useEffect } from 'react'; // Added useEffect
import { ShipmentOverviewType } from '../types';
import { CalendarDays, MapPin, MoveRight, PackageSearch, Weight, Navigation } from 'lucide-react';

interface ShipmentOverviewProps {
  shipment: ShipmentOverviewType;
  setShipment: React.Dispatch<React.SetStateAction<ShipmentOverviewType>>;
  totalBoxes: number; 
  totalWeight: number;
}

const ShipmentOverview: React.FC<ShipmentOverviewProps> = ({
  shipment,
  setShipment,
  totalBoxes,
  totalWeight,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "shipperLocation" || name === "destination") {
      // Pincode validation: allow only 6 digits (or empty)
      if (value === "" || (/^\d{0,6}$/.test(value))) {
        setShipment(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === "actualWeight") {
        setShipment(prev => ({ ...prev, [name]: value === "" ? 0 : parseFloat(value) || 0 }));
    } else {
      setShipment(prev => ({ ...prev, [name]: value }));
    }
  };

  // Automatically update actualWeight if it's zero/undefined OR less than totalWeight, 
  // but only if totalWeight is a positive number.
  useEffect(() => {
    if (totalWeight > 0 && (shipment.actualWeight === undefined || shipment.actualWeight === 0 || shipment.actualWeight < totalWeight)) {
      setShipment(prev => ({...prev, actualWeight: parseFloat(totalWeight.toFixed(2)) }));
    } else if (totalWeight === 0 && shipment.actualWeight !== 0) {
      // If boxes are removed and totalWeight becomes 0, reset actualWeight too
      setShipment(prev => ({...prev, actualWeight: 0 }));
    }
  }, [totalWeight, shipment.actualWeight, setShipment]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      {/* Invoice Number Field REMOVED */}
      
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Shipment Date
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarDays className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            name="date"
            id="date"
            value={shipment.date}
            onChange={handleChange}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="modeOfTransport" className="block text-sm font-medium text-gray-700 mb-1">
          Mode of Transport
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Navigation className="h-5 w-5 text-gray-400" />
          </div>
          <select
            name="modeOfTransport"
            id="modeOfTransport"
            value={shipment.modeOfTransport}
            onChange={handleChange}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
          >
            <option value="Road">Road</option>
            <option value="Rail">Rail</option>
            <option value="Air">Air</option>
            <option value="Ship">Ship</option>
          </select>
        </div>
      </div>
      
       <div>
        <label htmlFor="shipperLocation" className="block text-sm font-medium text-gray-700 mb-1">
          Origin Pincode (6 digits)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text" 
            name="shipperLocation"
            id="shipperLocation"
            value={shipment.shipperLocation}
            onChange={handleChange}
            placeholder="e.g., 400001"
            maxLength={6} 
            pattern="\d{6}" 
            title="Please enter a 6-digit pincode"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination Pincode (6 digits)
        </label>
        <div className="relative">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MoveRight className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            name="destination"
            id="destination"
            value={shipment.destination}
            onChange={handleChange}
            placeholder="e.g., 110001"
            maxLength={6}
            pattern="\d{6}"
            title="Please enter a 6-digit pincode"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
         <label htmlFor="totalBoxes" className="block text-sm font-medium text-gray-700 mb-1">
            Total Boxes (Auto)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <PackageSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="totalBoxes"
              id="totalBoxes"
              value={totalBoxes} 
              readOnly 
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-100"
            />
          </div>
      </div>
      
      <div>
        <label htmlFor="totalWeight" className="block text-sm font-medium text-gray-700 mb-1">
          Total Gross Weight (kg - Auto)
        </label>
         <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Weight className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="totalWeight"
              id="totalWeight"
              value={parseFloat(totalWeight.toFixed(2))}
              readOnly 
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-100"
            />
        </div>
      </div>

      <div className="md:col-span-2 lg:col-span-3"> {/* Allow actualWeight to take more space if needed */}
        <label htmlFor="actualWeight" className="block text-sm font-medium text-gray-700 mb-1">
          Chargeable Weight (kg) <span className="text-xs text-gray-500">(Override if needed)</span>
        </label>
        <input
          type="number"
          name="actualWeight"
          id="actualWeight"
          step="0.01"
          value={shipment.actualWeight || 0} // Ensure it defaults to 0 if undefined/null
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Calculated if empty"
        />
         <p className="mt-1 text-xs text-gray-500">Enter the weight that will be charged by vendors if different from calculated Gross/Volumetric. Defaults to the greater of calculated gross or total volumetric weight from boxes.</p>
      </div>
    </div>
  );
};

export default ShipmentOverview;