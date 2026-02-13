import React, { useState, useMemo, useCallback } from "react";
import { ArrowLeft, FileSpreadsheet, AlertTriangle, X } from "lucide-react";
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

    // Check if any zone has cities — if none do, show all zones (e.g. existing vendor auto-fill)
    const anyZoneHasCities = useMemo(
        () => (wizardData.zones || []).some(z => zoneHasCities(z)),
        [wizardData.zones, zoneHasCities]
    );

    // Filter active zones: show all zones if none have cities (auto-filled vendor), otherwise filter
    const activeZones = useMemo(
        () => anyZoneHasCities
            ? (wizardData.zones || []).filter(z => zoneHasCities(z))
            : (wizardData.zones || []),
        [wizardData.zones, zoneHasCities, anyZoneHasCities]
    );

    const inactiveZones = useMemo(
        () => anyZoneHasCities
            ? (wizardData.zones || []).filter(z => !zoneHasCities(z))
            : [],
        [wizardData.zones, zoneHasCities, anyZoneHasCities]
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
                        <button type="button" onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }} className="p-2 hover:bg-slate-100 rounded-lg">
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
                            type="button"
                            onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }}
                            className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
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
        <div className="w-full flex flex-col h-full min-h-[400px]">
            {/* Compact toolbar */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-900">Zone Price Matrix</h1>
                    <span className="text-xs text-slate-400">{activeZones.length}×{activeZones.length}</span>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onBack} className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button type="button" onClick={() => setBulkPasteModal(true)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk Paste
                    </button>
                    <button type="button" onClick={onSave} className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600">Save & Continue</button>
                </div>
            </div>

            {/* Legend — inline compact */}
            <div className="flex gap-4 text-[11px] text-slate-500 mb-2 shrink-0">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-100 border border-blue-300 rounded-sm inline-block"></span>Active</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-purple-100 border border-purple-300 rounded-sm inline-block"></span>Special</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-100 border border-green-300 rounded-sm inline-block"></span>Same zone</span>
                {inactiveZones.length > 0 && <span className="text-orange-500">{inactiveZones.length} zone{inactiveZones.length > 1 ? 's' : ''} excluded (no cities)</span>}
            </div>

            {/* Matrix — fills remaining space */}
            {zonesForMatrix.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Zones</h3>
                        <p className="text-slate-500">All selected zones have 0 cities. Go back and configure zones with cities.</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white relative">
                    <table className="border-collapse w-full">
                        <thead className="sticky top-0 z-20 bg-white">
                            <tr>
                                <th className="p-1 bg-slate-100 border border-slate-200 text-[10px] font-bold sticky left-0 z-30 shadow-sm text-center w-[44px] min-w-[44px]">To→</th>
                                {zonesForMatrix.map(zone => {
                                    const isSpec = zone.region === "Special";
                                    return (
                                        <th key={zone.zoneCode} className={`p-1 border border-slate-200 text-[10px] font-bold text-center min-w-[48px] ${isSpec ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`} title={`${zone.zoneCode} (${zone.selectedCities?.length || 0} cities)`}>
                                            {zone.zoneCode}
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
                                        <td className={`p-1 border border-slate-200 text-[10px] font-bold sticky left-0 z-10 shadow-sm text-center w-[44px] min-w-[44px] ${fromSpec ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                            {fromZone.zoneCode}
                                        </td>
                                        {zonesForMatrix.map(toZone => {
                                            const isDiagonal = fromZone.zoneCode === toZone.zoneCode;
                                            return (
                                                <td key={toZone.zoneCode} className={`p-0.5 border border-slate-200 min-w-[48px] ${isDiagonal ? "bg-green-50" : "bg-white"}`}>
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

            <BulkPasteModal />
        </div>
    );
};

export default ZonePriceMatrixComponent;
