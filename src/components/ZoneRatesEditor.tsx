/**
 * ZoneRatesEditor component
 * Simplified zone rate matrix editor
 */

import React, { useState } from 'react';
import { UseZoneRatesReturn } from '../hooks/useZoneRates';
import { TableCellsIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// =============================================================================
// PROPS
// =============================================================================

interface ZoneRatesEditorProps {
  zoneRates: UseZoneRatesReturn;
}

// =============================================================================
// COMMON ZONES (can be customized)
// =============================================================================

const COMMON_ZONES = {
  North: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
  South: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  East: ['E1', 'E2', 'E3', 'E4'],
  West: ['W1', 'W2', 'W3', 'W4'],
  'North-East': ['NE1', 'NE2', 'NE3', 'NE4'],
  Central: ['C1', 'C2', 'C3', 'C4'],
};

const ALL_ZONES = Object.values(COMMON_ZONES).flat();

// =============================================================================
// COMPONENT
// =============================================================================

export const ZoneRatesEditor: React.FC<ZoneRatesEditorProps> = ({ zoneRates }) => {
  const {
    zoneRates: zoneRatesData,
    error,
    setZoneRate,
    getZoneRate,
    initializeZones,
    validateZoneRates,
    isEmpty,
  } = zoneRates;

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFromZones, setSelectedFromZones] = useState<string[]>([]);
  const [selectedToZones, setSelectedToZones] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(!isEmpty);

  // Handle initialization
  const handleInitialize = () => {
    if (selectedFromZones.length === 0 || selectedToZones.length === 0) {
      alert('Please select at least one FROM zone and one TO zone');
      return;
    }

    initializeZones(selectedFromZones, selectedToZones);
    setIsInitialized(true);
    setIsExpanded(true);
  };

  // Toggle zone selection
  const toggleZoneSelection = (zone: string, isFromZone: boolean) => {
    if (isFromZone) {
      setSelectedFromZones((prev) =>
        prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
      );
    } else {
      setSelectedToZones((prev) =>
        prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
      );
    }
  };

  // Select all zones in a region
  const selectRegion = (zones: string[], isFromZone: boolean) => {
    if (isFromZone) {
      setSelectedFromZones((prev) => [...new Set([...prev, ...zones])]);
    } else {
      setSelectedToZones((prev) => [...new Set([...prev, ...zones])]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5 text-blue-500" />
          Zone Rate Matrix
        </h2>
        {isInitialized && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {/* Zone Selection (if not initialized) */}
      {!isInitialized && (
        <div className="space-y-6">
          {/* FROM Zones */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Select FROM Zones <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(COMMON_ZONES).map(([region, zones]) => (
                <div key={region} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase">
                      {region}
                    </span>
                    <button
                      type="button"
                      onClick={() => selectRegion(zones, true)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => toggleZoneSelection(zone, true)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                                   ${
                                     selectedFromZones.includes(zone)
                                       ? 'bg-blue-500 text-white'
                                       : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                   }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TO Zones */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Select TO Zones <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(COMMON_ZONES).map(([region, zones]) => (
                <div key={region} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase">
                      {region}
                    </span>
                    <button
                      type="button"
                      onClick={() => selectRegion(zones, false)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => toggleZoneSelection(zone, false)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                                   ${
                                     selectedToZones.includes(zone)
                                       ? 'bg-green-500 text-white'
                                       : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                   }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Initialize Button */}
          <button
            type="button"
            onClick={handleInitialize}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold
                       rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Initialize Zone Matrix ({selectedFromZones.length} × {selectedToZones.length})
          </button>
        </div>
      )}

      {/* Zone Rate Table (if initialized) */}
      {isInitialized && isExpanded && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">
                    FROM \ TO
                  </th>
                  {selectedToZones.map((toZone) => (
                    <th
                      key={toZone}
                      className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700"
                    >
                      {toZone}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedFromZones.map((fromZone) => (
                  <tr key={fromZone}>
                    <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-700 bg-slate-50">
                      {fromZone}
                    </td>
                    {selectedToZones.map((toZone) => {
                      const rate = getZoneRate(fromZone, toZone) || 0;
                      return (
                        <td key={toZone} className="border border-slate-300 p-1">
                          <input
                            type="number"
                            value={rate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setZoneRate(fromZone, toZone, val);
                              }
                            }}
                            min={0}
                            step="0.01"
                            className="w-full px-2 py-1 text-center border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Validate Button */}
          <button
            type="button"
            onClick={() => {
              if (validateZoneRates()) {
                alert('Zone rates are valid!');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold
                       rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Validate Matrix
          </button>
        </div>
      )}

      {/* Collapsed Summary */}
      {isInitialized && !isExpanded && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <CheckCircleIcon className="w-4 h-4 inline mr-2" />
            Zone matrix initialized: {selectedFromZones.length} FROM zones × {selectedToZones.length} TO zones
            = {selectedFromZones.length * selectedToZones.length} rate cells
          </p>
        </div>
      )}
    </div>
  );
};
