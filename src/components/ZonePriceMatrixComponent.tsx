import React, { useState, useMemo, useCallback } from "react";
import { ArrowLeft, FileSpreadsheet, Ban, AlertTriangle, X } from "lucide-react";
import DecimalInput from "./DecimalInput";

// Type definitions needed
export interface ZoneConfig {
    zoneCode: string;
    zoneName: string;
    region: string;
    selectedCities?: string[];
    isComplete: boolean;
}

export interface PriceMatrix {
    [from: string]: {
        [to: string]: number | string;
    };
}

export interface WizardData {
    zones: ZoneConfig[];
    priceMatrix: PriceMatrix;
}

interface ZonePriceMatrixComponentProps {
    wizardData: WizardData;
    onUpdatePriceMatrix: (matrix: PriceMatrix) => void;
    onBack: () => void;
    onSave: () => void;
}

const LOCKED_ZONE_ORDER = ['N1', 'N2', 'N3', 'N4', 'C1', 'C2', 'E1', 'E2', 'W1', 'W2', 'S1', 'S2', 'S3', 'S4', 'NE1', 'NE2', 'X1', 'X2', 'X3'];

const ZonePriceMatrixComponent: React.FC<ZonePriceMatrixComponentProps> = ({
    wizardData,
    onUpdatePriceMatrix,
    onBack,
    onSave
}) => {
    const [bulkPasteModal, setBulkPasteModal] = useState(false);
    const [bulkPasteText, setBulkPasteText] = useState("");

    // Helper to check if zone has cities
    const zoneHasCities = useCallback((zone: ZoneConfig | undefined | null): boolean => {
        if (!zone) return false;
        if (!zone.selectedCities) return false;
        if (!Array.isArray(zone.selectedCities)) return false;
        return zone.selectedCities.length > 0;
    }, []);

    // Filter active zones
    const activeZones = useMemo(
        () => (wizardData.zones || []).filter(z => zoneHasCities(z)),
        [wizardData.zones, zoneHasCities]
    );

    const inactiveZones = useMemo(
        () => (wizardData.zones || []).filter(z => !zoneHasCities(z)),
        [wizardData.zones, zoneHasCities]
    );

    const activeZoneCodes = useMemo(
        () => new Set(activeZones.map(z => z.zoneCode)),
        [activeZones]
    );

    // Sort zones for matrix display
    const zonesForMatrix = useMemo(
        () => [...activeZones].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode)),
        [activeZones]
    );

    const getPrice = useCallback((from: string, to: string): number | null => {
        const val = wizardData.priceMatrix?.[from]?.[to];
        if (val === undefined || val === null || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    }, [wizardData.priceMatrix]);

    const updatePrice = useCallback((from: string, to: string, val: number | string | null) => {
        if (!activeZoneCodes.has(from) || !activeZoneCodes.has(to)) {
            console.warn(`BLOCKED price update: ${from} → ${to} (empty zone)`);
            return;
        }
        const upd = { ...wizardData.priceMatrix };
        if (!upd[from]) upd[from] = {};
        upd[from][to] = val ?? 0;
        onUpdatePriceMatrix(upd);
    }, [wizardData.priceMatrix, onUpdatePriceMatrix, activeZoneCodes]);

    /* -------------------- Bulk Paste Handler -------------------- */
    const handleBulkPaste = useCallback(() => {
        try {
            const lines = bulkPasteText.trim().split('\n');
            const parsedData: number[][] = [];

            for (const line of lines) {
                const values = line.split(/[\t,]/).map(v => {
                    const num = parseFloat(v.trim());
                    return isNaN(num) ? 0 : num;
                });
                parsedData.push(values);
            }

            const expectedRows = zonesForMatrix.length;
            if (parsedData.length !== expectedRows) {
                alert(`Error: Expected ${expectedRows} rows, got ${parsedData.length}`);
                return;
            }

            for (let i = 0; i < parsedData.length; i++) {
                const expectedCols = zonesForMatrix.length;
                if (parsedData[i].length !== expectedCols) {
                    alert(`Error: Row ${i + 1} has ${parsedData[i].length} columns, expected ${expectedCols}`);
                    return;
                }
            }

            const newMatrix = { ...wizardData.priceMatrix };
            zonesForMatrix.forEach((fromZone, fromIdx) => {
                if (!newMatrix[fromZone.zoneCode]) newMatrix[fromZone.zoneCode] = {};
                zonesForMatrix.forEach((toZone, toIdx) => {
                    newMatrix[fromZone.zoneCode][toZone.zoneCode] = parsedData[fromIdx][toIdx];
                });
            });

            onUpdatePriceMatrix(newMatrix);
            setBulkPasteModal(false);
            setBulkPasteText("");
            alert(`Success! ${zonesForMatrix.length}x${zonesForMatrix.length} prices updated.`);
        } catch (error) {
            console.error('Bulk paste error:', error);
            alert('Error parsing pasted data. Please ensure you copied the correct format from Excel.');
        }
    }, [bulkPasteText, zonesForMatrix, wizardData.priceMatrix, onUpdatePriceMatrix]);

    /* -------------------- Bulk Paste Modal -------------------- */
    const BulkPasteModal = () => {
        if (!bulkPasteModal) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Bulk Paste from Excel</h3>
                                <p className="text-sm text-slate-600">Paste your price matrix data here</p>
                            </div>
                        </div>
                        <button onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }} className="p-2 hover:bg-slate-100 rounded-lg">
                            <X className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-900 font-semibold mb-2">Instructions:</p>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Open your Excel file with the price matrix</li>
                            <li>Select all price values (WITHOUT the From/To headers)</li>
                            <li>Copy (Ctrl+C or Cmd+C)</li>
                            <li>Paste in the box below</li>
                            <li>Click "Apply Prices"</li>
                        </ol>
                        <p className="text-xs text-blue-700 mt-2">Expected format: {zonesForMatrix.length} rows × {zonesForMatrix.length} columns (tab-separated values)</p>
                    </div>

                    <textarea
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={`Paste your ${zonesForMatrix.length}x${zonesForMatrix.length} price matrix here...\n\nExample:\n5.4\t6.5\t8.1\t9.5\n6.0\t5.85\t8.1\t9.5\n...`}
                        className="w-full h-64 p-4 border border-slate-300 rounded-xl font-mono text-sm resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        autoFocus
                    />

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }}
                            className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkPaste}
                            disabled={!bulkPasteText.trim()}
                            className={`flex-1 px-6 py-3 rounded-xl font-semibold ${bulkPasteText.trim()
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                }`}
                        >
                            Apply Prices
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /* -------------------- Render -------------------- */
    return (
        <div className="w-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">Zone Price Matrix</h1>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Smart Mode</span>
                    </div>
                    <p className="mt-1 text-slate-600 text-sm">Only zones WITH cities appear below. Empty zones excluded.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                        onClick={() => setBulkPasteModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 flex items-center gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Bulk Paste
                    </button>
                    <button onClick={onSave} className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600">Save & Continue</button>
                </div>
            </div>

            {/* Excluded zones badges */}
            {inactiveZones.length > 0 && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Ban className="h-4 w-4 text-orange-600" />
                        <p className="text-sm text-orange-700 font-semibold">Excluded from pricing ({inactiveZones.length} zones with no cities):</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {inactiveZones.map(z => (
                            <span key={z.zoneCode} className="px-3 py-1.5 text-sm bg-orange-200 text-orange-800 rounded-lg font-medium">
                                {z.zoneCode}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                        <span>Active zone</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                        <span>Special zone (X1/X2/X3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                        <span>Same zone (diagonal)</span>
                    </div>
                </div>
            </div>

            {/* Matrix - only active zones */}
            {zonesForMatrix.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Zones</h3>
                    <p className="text-slate-500">All selected zones have 0 cities. Go back and configure zones with cities.</p>
                </div>
            ) : (
                <div className="overflow-auto max-h-[60vh] border border-slate-200 rounded-lg shadow-inner bg-white">
                    <table className="w-full border-collapse relative table-fixed">
                        <thead>
                            <tr>
                                <th className="p-1 bg-slate-100 border border-slate-200 text-[10px] font-bold sticky top-0 z-30 shadow-sm text-center">To→</th>
                                {zonesForMatrix.map(zone => {
                                    const isSpec = zone.region === "Special";
                                    return (
                                        <th key={zone.zoneCode} className={`p-1 border border-slate-200 text-[9px] font-bold sticky top-0 z-20 shadow-sm text-center ${isSpec ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`} title={`${zone.zoneCode} (${zone.selectedCities?.length || 0} cities)`}>
                                            <div className="truncate">{zone.zoneCode}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {zonesForMatrix.map(fromZone => {
                                const fromSpec = fromZone.region === "Special";
                                return (
                                    <tr key={fromZone.zoneCode}>
                                        <td className={`p-1 border border-slate-200 text-[9px] font-bold sticky left-0 z-10 shadow-sm text-center ${fromSpec ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`} title={`${fromZone.zoneCode} (${fromZone.selectedCities?.length || 0} cities)`}>
                                            <div className="truncate">{fromZone.zoneCode}</div>
                                        </td>
                                        {zonesForMatrix.map(toZone => {
                                            const isDiagonal = fromZone.zoneCode === toZone.zoneCode;
                                            return (
                                                <td key={toZone.zoneCode} className={`p-1 border border-slate-200 ${isDiagonal ? "bg-green-50" : "bg-white"}`}>
                                                    <DecimalInput
                                                        value={getPrice(fromZone.zoneCode, toZone.zoneCode)}
                                                        onChange={val => updatePrice(fromZone.zoneCode, toZone.zoneCode, val)}
                                                        placeholder="-"
                                                        className="w-full text-center text-xs p-0 h-6 border-0 bg-transparent focus:ring-0 font-medium"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{(wizardData.zones || []).length}</div>
                        <div className="text-xs text-slate-500">Total Selected</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{activeZones.length}</div>
                        <div className="text-xs text-slate-500">In Price Matrix</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{inactiveZones.length}</div>
                        <div className="text-xs text-slate-500">Excluded (Empty)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{activeZones.reduce((s, z) => s + (z.selectedCities?.length || 0), 0)}</div>
                        <div className="text-xs text-slate-500">Total Cities</div>
                    </div>
                </div>
            </div>

            <BulkPasteModal />
        </div>
    );
};

export default ZonePriceMatrixComponent;
