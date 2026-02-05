import React from 'react';
import { BoxDetails } from '../types';
import { calculateVolumetricWeight } from '../utils/calculations';
import { Trash2 } from 'lucide-react';

interface BoxDetailsRowProps {
  box: BoxDetails;
  updateBox: (id: string, updates: Partial<BoxDetails>) => void;
  removeBox: (id: string) => void;
  mode: string;
}

const BoxDetailsRow: React.FC<BoxDetailsRowProps> = ({ box, updateBox, removeBox, mode }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let numValue: number | string;
    
    if (name === 'numberOfBoxes' || name === 'qtyPerBox') {
      // For numberOfBoxes and qtyPerBox, ensure they're integers >= 1
      const intValue = parseInt(value);
      if (isNaN(intValue) || intValue < 1) {
        return; // Don't update if invalid
      }
      numValue = intValue;
    } else if (name !== 'description' && name !== 'uom') {
      numValue = parseFloat(value) || 0;
    } else {
      numValue = value;
    }
    
    let updates: Partial<BoxDetails> = { [name]: numValue };
    
    // Recalculate dependent values
    if (['numberOfBoxes', 'qtyPerBox'].includes(name)) {
      const numberOfBoxes = name === 'numberOfBoxes' ? numValue as number : box.numberOfBoxes;
      const qtyPerBox = name === 'qtyPerBox' ? numValue as number : box.qtyPerBox;
      updates.totalQty = numberOfBoxes * qtyPerBox;
    }
    
    if (['numberOfBoxes', 'weightPerBox'].includes(name)) {
      const numberOfBoxes = name === 'numberOfBoxes' ? numValue as number : box.numberOfBoxes;
      const weightPerBox = name === 'weightPerBox' ? numValue as number : box.weightPerBox;
      updates.totalWeight = numberOfBoxes * weightPerBox;
    }
    
    if (['length', 'width', 'height'].includes(name)) {
      const length = name === 'length' ? numValue as number : box.length;
      const width = name === 'width' ? numValue as number : box.width;
      const height = name === 'height' ? numValue as number : box.height;
      
      updates.volumetricWeight = calculateVolumetricWeight(length, width, height, mode);
    }
    
    updateBox(box.id, updates);
  };

  return (
    <div className="grid grid-cols-12 gap-2 mb-2 items-center">
      <div className="col-span-1">
        <input
          type="number"
          name="serialNo"
          value={box.serialNo}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          readOnly
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="numberOfBoxes"
          value={box.numberOfBoxes || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="1"
          step="1"
          placeholder="Qty"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="qtyPerBox"
          value={box.qtyPerBox || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="1"
          step="1"
          placeholder="Per box"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          value={box.totalQty || ''}
          className="w-full px-2 py-1 text-sm border border-gray-200 bg-gray-50 rounded-md"
          readOnly
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="length"
          value={box.length || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="0"
          placeholder="L (cm)"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="width"
          value={box.width || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="0"
          placeholder="W (cm)"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="height"
          value={box.height || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="0"
          placeholder="H (cm)"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          name="weightPerBox"
          value={box.weightPerBox || ''}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          min="0"
          step="0.01"
          placeholder="Weight"
        />
      </div>
      
      <div className="col-span-1">
        <input
          type="number"
          value={box.totalWeight.toFixed(2) || ''}
          className="w-full px-2 py-1 text-sm border border-gray-200 bg-gray-50 rounded-md"
          readOnly
        />
      </div>
      
      <div className="col-span-2">
        <input
          type="text"
          name="description"
          value={box.description}
          onChange={handleChange}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
          placeholder="Item description"
        />
      </div>
      
      <div className="col-span-1 flex">
        <select
          name="uom"
          value={box.uom}
          onChange={handleChange}
          className="w-4/5 px-2 py-1 text-sm border border-gray-300 rounded-l-md"
        >
          <option value="pcs">pcs</option>
          <option value="kg">kg</option>
          <option value="ltr">ltr</option>
          <option value="box">box</option>
        </select>
        <button
          type="button"
          onClick={() => removeBox(box.id)}
          className="w-1/5 bg-red-50 hover:bg-red-100 text-red-500 rounded-r-md flex items-center justify-center transition-colors"
          aria-label="Remove box"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default BoxDetailsRow;