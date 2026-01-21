import React from 'react';
import { BoxDetails as BoxDetailsType } from '../types';
import BoxDetailsRow from './BoxDetailsRow';
import { generateNewBox } from '../utils/calculations';
import { Plus } from 'lucide-react';

interface BoxDetailsProps {
  boxes: BoxDetailsType[];
  setBoxes: React.Dispatch<React.SetStateAction<BoxDetailsType[]>>;
  mode: string;
}

const BoxDetails: React.FC<BoxDetailsProps> = ({ boxes, setBoxes, mode }) => {
  const addNewBox = () => {
    setBoxes(prev => [...prev, generateNewBox(prev)]);
  };

  const updateBox = (id: string, updates: Partial<BoxDetailsType>) => {
    setBoxes(prev => prev.map(box => box.id === id ? { ...box, ...updates } : box));
  };

  const removeBox = (id: string) => {
    setBoxes(prev => prev.filter(box => box.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Box-wise Shipment Details</h2>
        <button
          type="button"
          onClick={addNewBox}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
        >
          <Plus size={16} /> Add Box
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 mb-2 bg-gray-50 p-2 rounded-md text-sm font-medium text-gray-700">
            <div className="col-span-1">S.No</div>
            <div className="col-span-1">Boxes</div>
            <div className="col-span-1">Qty/Box</div>
            <div className="col-span-1">Total Qty</div>
            <div className="col-span-1">Length</div>
            <div className="col-span-1">Width</div>
            <div className="col-span-1">Height</div>
            <div className="col-span-1">Weight/Box</div>
            <div className="col-span-1">Total Weight</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">UOM</div>
          </div>
          
          {/* Box rows */}
          {boxes.map(box => (
            <BoxDetailsRow 
              key={box.id}
              box={box}
              updateBox={updateBox}
              removeBox={removeBox}
              mode={mode}
            />
          ))}
          
          {boxes.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No boxes added yet. Click "Add Box\" to start.
            </div>
          )}
        </div>
      </div>

      {boxes.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Volumetric Weight</h3>
            <p className="text-lg font-semibold text-blue-600">
              {boxes.reduce((sum, box) => sum + box.volumetricWeight, 0).toFixed(2)} kg
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Actual Weight</h3>
            <p className="text-lg font-semibold text-blue-600">
              {boxes.reduce((sum, box) => sum + box.totalWeight, 0).toFixed(2)} kg
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Chargeable Weight</h3>
            <p className="text-lg font-semibold text-blue-600">
              {Math.max(
                boxes.reduce((sum, box) => sum + box.totalWeight, 0),
                boxes.reduce((sum, box) => sum + box.volumetricWeight, 0)
              ).toFixed(2)} kg
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxDetails;