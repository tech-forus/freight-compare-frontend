/**
 * ZoneSelectionWizard Component
 * 
 * A comprehensive wizard for selecting zones and auto-filling cities/states.
 * 
 * Flow:
 * 1. User selects which zones they want to configure
 * 2. System validates selection and shows warnings
 * 3. User confirms selection
 * 4. System auto-fills cities/states based on zone rules
 * 5. User can proceed to price matrix
 * 
 * Rules:
 * - Limited zones (X1) only include specific cities
 * - Full zones (X2, X3, etc.) include all cities in their states
 * - Siliguri (West Bengal) can be in both NE1 and E1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  CheckCircle,
  XCircle,
  Globe,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { zoneAssignmentService, type ZoneInfo } from '../services/ZoneAssignmentService';
import type { ZoneConfig, RegionGroup } from '../types/wizard.types';

// ============================================================================
// TYPES
// ============================================================================

interface ZoneSelectionWizardProps {
  onComplete: (config: {
    zones: ZoneConfig[];
    priceMatrix: Record<string, Record<string, string | number>>;
  }) => void;
  initialSelectedZones?: string[];
  blankCellValue?: string | number;
}

interface RegionSelection {
  region: string;
  zones: string[];
  selectedZones: Set<string>;
  expanded: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ZoneSelectionWizard: React.FC<ZoneSelectionWizardProps> = ({
  onComplete,
  initialSelectedZones = [],
  blankCellValue = '',
}) => {
  // Service state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [regionSelections, setRegionSelections] = useState<RegionSelection[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set(initialSelectedZones));

  // Validation state
  const [validation, setValidation] = useState<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }>({ isValid: true, warnings: [], errors: [] });

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfigs, setPreviewConfigs] = useState<ZoneConfig[]>([]);

  // Stable ref to prevent infinite re-init when initialSelectedZones is a new [] each render
  const initRanRef = React.useRef(false);
  const initialZonesKey = JSON.stringify(initialSelectedZones);

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  useEffect(() => {
    // Guard: only run once per unique set of initial zones
    if (initRanRef.current) return;
    initRanRef.current = true;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await zoneAssignmentService.initialize();

        const regions = zoneAssignmentService.getRegions();
        const selections: RegionSelection[] = [];

        for (const [region, zones] of Object.entries(regions)) {
          selections.push({
            region,
            zones,
            selectedZones: new Set(
              initialSelectedZones.filter(z => zones.includes(z))
            ),
            expanded: true, // Start expanded
          });
        }

        setRegionSelections(selections);

        // Initialize selected zones from initial props
        if (initialSelectedZones.length > 0) {
          setSelectedZones(new Set(initialSelectedZones));
        }

      } catch (err) {
        console.error('[ZoneSelectionWizard] Init error:', err);
        setError('Failed to load zone data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZonesKey]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleZoneToggle = useCallback((zoneCode: string) => {
    setSelectedZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneCode)) {
        next.delete(zoneCode);
      } else {
        next.add(zoneCode);
      }
      return next;
    });

    // Update region selections
    setRegionSelections(prev => prev.map(rs => ({
      ...rs,
      selectedZones: new Set(
        Array.from(selectedZones).filter(z => rs.zones.includes(z))
      ),
    })));
  }, [selectedZones]);

  const handleRegionToggle = useCallback((region: string, selectAll: boolean) => {
    const regionData = regionSelections.find(r => r.region === region);
    if (!regionData) return;

    setSelectedZones(prev => {
      const next = new Set(prev);
      regionData.zones.forEach(zone => {
        if (selectAll) {
          next.add(zone);
        } else {
          next.delete(zone);
        }
      });
      return next;
    });
  }, [regionSelections]);

  const handleExpandToggle = useCallback((region: string) => {
    setRegionSelections(prev => prev.map(rs => ({
      ...rs,
      expanded: rs.region === region ? !rs.expanded : rs.expanded,
    })));
  }, []);

  // =========================================================================
  // VALIDATION
  // =========================================================================

  useEffect(() => {
    if (selectedZones.size > 0) {
      const result = zoneAssignmentService.validateZoneSelection(
        Array.from(selectedZones)
      );
      setValidation(result);
    } else {
      setValidation({ isValid: true, warnings: [], errors: [] });
    }
  }, [selectedZones]);

  // =========================================================================
  // PREVIEW & CONFIRM
  // =========================================================================

  const handlePreview = useCallback(() => {
    if (selectedZones.size === 0) {
      toast.error('Please select at least one zone');
      return;
    }

    const configs = zoneAssignmentService.buildZoneConfig(
      Array.from(selectedZones)
    );
    setPreviewConfigs(configs);
    setShowPreview(true);
  }, [selectedZones]);

  const handleConfirm = useCallback(() => {
    if (previewConfigs.length === 0) {
      toast.error('No zones configured');
      return;
    }

    // Build empty price matrix
    const zoneCodes = previewConfigs.map(c => c.zoneCode);
    const priceMatrix: Record<string, Record<string, string | number>> = {};

    for (const fromZone of zoneCodes) {
      priceMatrix[fromZone] = {};
      for (const toZone of zoneCodes) {
        priceMatrix[fromZone][toZone] = blankCellValue;
      }
    }

    onComplete({
      zones: previewConfigs,
      priceMatrix,
    });

    toast.success(`Configured ${previewConfigs.length} zones with auto-filled cities!`);
  }, [previewConfigs, blankCellValue, onComplete]);

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================

  const selectedZoneCount = selectedZones.size;
  const totalCityCount = useMemo(() => {
    return previewConfigs.reduce((sum, c) => sum + c.selectedCities.length, 0);
  }, [previewConfigs]);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  const renderZoneCard = (zoneCode: string) => {
    const zoneInfo = zoneAssignmentService.getZoneInfo(zoneCode);
    if (!zoneInfo) return null;

    const isSelected = selectedZones.has(zoneCode);
    const isLimited = zoneInfo.type === 'limited';

    return (
      <button
        key={zoneCode}
        type="button"
        onClick={() => handleZoneToggle(zoneCode)}
        className={`
          relative p-3 rounded-lg border-2 transition-all text-left w-full
          ${isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-slate-200 bg-white hover:border-slate-300'
          }
        `}
      >
        {/* Selection indicator */}
        <div className={`
          absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
          ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200'}
        `}>
          {isSelected && <Check size={12} />}
        </div>

        {/* Zone code and type */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-900">{zoneCode}</span>
          {isLimited ? (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
              Limited
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
              Full
            </span>
          )}
        </div>

        {/* States */}
        <p className="text-xs text-slate-600 truncate">
          {zoneInfo.states.slice(0, 3).join(', ')}
          {zoneInfo.states.length > 3 && ` +${zoneInfo.states.length - 3} more`}
        </p>

        {/* Limited cities info */}
        {isLimited && (
          <div className="mt-2 text-xs text-amber-700">
            <span className="font-medium">Cities: </span>
            {Object.entries(zoneInfo.limitedCities)
              .flatMap(([_, cities]) => cities)
              .slice(0, 3)
              .join(', ')}
            {Object.values(zoneInfo.limitedCities).flat().length > 3 && ' ...'}
          </div>
        )}
      </button>
    );
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-slate-600">Loading zone data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Zone Selection
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Select zones to configure. Cities and states will be auto-filled based on zone rules.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{selectedZoneCount}</div>
          <div className="text-xs text-slate-500">zones selected</div>
        </div>
      </div>

      {/* Region sections */}
      <div className="space-y-4">
        {regionSelections.map(rs => (
          <div
            key={rs.region}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
          >
            {/* Region header */}
            <button
              type="button"
              onClick={() => handleExpandToggle(rs.region)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-600" />
                <span className="font-semibold text-slate-900">{rs.region}</span>
                <span className="text-sm text-slate-500">
                  ({rs.zones.length} zones)
                </span>
                {/* Selected count */}
                {Array.from(selectedZones).filter(z => rs.zones.includes(z)).length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {Array.from(selectedZones).filter(z => rs.zones.includes(z)).length} selected
                  </span>
                )}
              </div>
              {rs.expanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Region content */}
            {rs.expanded && (
              <div className="p-4">
                {/* Select all / none */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleRegionToggle(rs.region, true)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegionToggle(rs.region, false)}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                  >
                    Clear
                  </button>
                </div>

                {/* Zone cards grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {rs.zones.map(zone => renderZoneCard(zone))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Validation warnings */}
      {validation.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Warnings:</p>
              <ul className="space-y-0.5">
                {validation.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">Errors:</p>
              <ul className="space-y-0.5">
                {validation.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview button */}
      {selectedZones.size > 0 && !showPreview && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={!validation.isValid}
          className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Building2 className="w-5 h-5" />
          Preview Zone Configuration ({selectedZoneCount} zones)
        </button>
      )}

      {/* Preview section */}
      {showPreview && previewConfigs.length > 0 && (
        <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-blue-50/50">
          <div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Preview: {previewConfigs.length} Zones, {totalCityCount} Cities Auto-Filled
            </h4>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {previewConfigs.map(config => (
              <div
                key={config.zoneCode}
                className="p-3 bg-white rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">{config.zoneCode}</span>
                  <span className="text-xs text-slate-500">
                    {config.selectedStates.length} states, {config.selectedCities.length} cities
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-medium">States: </span>
                  {config.selectedStates.slice(0, 5).join(', ')}
                  {config.selectedStates.length > 5 && ` +${config.selectedStates.length - 5} more`}
                </div>

                {config.selectedCities.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="font-medium">Sample cities: </span>
                    {config.selectedCities.slice(0, 5).map(c => c.split('||')[0]).join(', ')}
                    {config.selectedCities.length > 5 && ` +${config.selectedCities.length - 5} more`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Confirm buttons */}
          <div className="px-4 py-3 bg-white border-t border-blue-200 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back to Selection
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Confirm & Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneSelectionWizard;
