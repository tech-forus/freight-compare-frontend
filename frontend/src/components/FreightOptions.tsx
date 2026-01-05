import React from 'react';

interface FreightOptionsProps {
  isExpressShipment: boolean;
  setIsExpressShipment: React.Dispatch<React.SetStateAction<boolean>>;
  isFragileShipment: boolean;
  setIsFragileShipment: React.Dispatch<React.SetStateAction<boolean>>;
}

const FreightOptions: React.FC<FreightOptionsProps> = ({
  isExpressShipment,
  setIsExpressShipment,
  isFragileShipment,
  setIsFragileShipment
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Freight Options</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center">
            <input
              id="expressShipment"
              type="checkbox"
              checked={isExpressShipment}
              onChange={(e) => setIsExpressShipment(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="expressShipment" className="ml-2 block text-sm text-gray-700">
              Express Shipment (20% surcharge)
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-6">Prioritized handling and faster delivery</p>
        </div>
        
        <div>
          <div className="flex items-center">
            <input
              id="fragileShipment"
              type="checkbox"
              checked={isFragileShipment}
              onChange={(e) => setIsFragileShipment(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="fragileShipment" className="ml-2 block text-sm text-gray-700">
              Fragile Shipment (₹10/kg surcharge)
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-6">Special handling for delicate items</p>
        </div>
      </div>
    </div>
  );
};

export default FreightOptions;