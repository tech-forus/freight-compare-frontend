/**
 * ServiceabilityUpload Component - PINCODE-AUTHORITATIVE VERSION
 * 
 * According to the spec: "Pincode = truth, Zone = derived attribute"
 * 
 * This component handles Excel/CSV uploads where:
 * 1. User provides ONLY pincodes (and optional isODA flag)
 * 2. System looks up each pincode in the zone_blueprint (pincodes.json)
 * 3. System auto-assigns: zone, state, city from the blueprint
 * 4. If pincode NOT found in blueprint → reject (exclude from serviceability)
 * 5. Build a clean, canonical serviceability array
 * 
 * KEY RULES:
 * - Zones are NEVER taken from user Excel
 * - Zones are ALWAYS looked up from pincodes.json
 * - If a pincode isn't in pincodes.json, it's INVALID
 * - Pricing is separate (handled later)
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload, Download, AlertCircle, CheckCircle, Loader2, Trash2,
  FileSpreadsheet, ChevronDown, ChevronUp, MapPin, Info, AlertTriangle, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ServiceabilityEntry {
  pincode: string;
  zone: string;
  state: string;
  city: string;
  isODA: boolean;
  active: boolean;
}

export interface ZoneSummary {
  zoneCode: string;
  region: string;
  pincodeCount: number;
  states: string[];
  cities: string[];
  odaCount: number;
}

export interface ParseResult {
  valid: ServiceabilityEntry[];
  invalid: Array<{
    row: number;
    pincode: string;
    reason: string;
  }>;
  duplicates: Array<{
    row: number;
    pincode: string;
  }>;
  zoneSummary: ZoneSummary[];
  checksum: string;
}

export interface BlueprintEntry {
  pincode: string;
  zone: string;
  state: string;
  city: string;
}

export interface ServiceabilityUploadProps {
  onServiceabilityReady: (data: {
    serviceability: ServiceabilityEntry[];
    zoneSummary: ZoneSummary[];
    checksum: string;
    source: 'excel' | 'manual';
  }) => void;
  onError?: (errors: string[]) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize pincode - handles Excel numeric formats
 * - Numbers: 110001 → "110001"
 * - Floats: 110001.0 → "110001"
 * - Scientific notation: 1.10001e+5 → "110001"
 */
const normalizePincode = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;

  let str = String(value).trim();

  // Handle scientific notation
  if (str.includes('e') || str.includes('E')) {
    try {
      const num = parseFloat(str);
      if (!isNaN(num) && isFinite(num)) {
        str = Math.round(num).toString();
      }
    } catch {
      // Continue with original
    }
  }

  // Handle floats
  if (str.includes('.')) {
    const num = parseFloat(str);
    if (!isNaN(num) && isFinite(num)) {
      str = Math.round(num).toString();
    }
  }

  // Extract digits only
  const digits = str.replace(/[^0-9]/g, '');

  // Must be exactly 6 digits and start with valid digit (1-8)
  if (digits.length === 6 && /^[1-8]/.test(digits)) {
    return digits;
  }

  // Try to extract first 6 valid digits
  if (digits.length > 6) {
    const first6 = digits.slice(0, 6);
    if (/^[1-8]/.test(first6)) {
      return first6;
    }
  }

  return null;
};

/**
 * Parse ODA value from various formats
 */
const parseODAValue = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  const str = String(value).toLowerCase().trim();
  return ['true', 'yes', '1', 'y', 'oda', 'remote'].includes(str);
};

/**
 * Generate a deterministic checksum for serviceability array
 */
const generateChecksum = (entries: ServiceabilityEntry[]): string => {
  const sorted = [...entries].sort((a, b) => a.pincode.localeCompare(b.pincode));
  const str = sorted.map(e => `${e.pincode}:${e.zone}:${e.isODA}`).join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/**
 * Detect which column contains pincodes
 */
const detectPincodeColumn = (rows: any[][]): number => {
  const columnScores: number[] = [];
  const numCols = rows[0]?.length || 0;
  
  for (let col = 0; col < numCols; col++) {
    let pincodeCount = 0;
    const sampleSize = Math.min(100, rows.length);
    
    for (let row = 0; row < sampleSize; row++) {
      const value = rows[row]?.[col];
      if (normalizePincode(value) !== null) {
        pincodeCount++;
      }
    }
    
    columnScores[col] = pincodeCount / sampleSize;
  }
  
  // Return column with highest pincode ratio
  let bestCol = 0;
  let bestScore = 0;
  for (let i = 0; i < columnScores.length; i++) {
    if (columnScores[i] > bestScore) {
      bestScore = columnScores[i];
      bestCol = i;
    }
  }
  
  return bestScore > 0.3 ? bestCol : -1;
};

/**
 * Detect ODA column
 */
const detectODAColumn = (headers: string[], rows: any[][]): number => {
  // First check headers
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toLowerCase();
    if (h.includes('oda') || h.includes('remote') || h.includes('isoda')) {
      return i;
    }
  }
  
  // Check column content for boolean-like values
  const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];
  const numCols = rows[0]?.length || 0;
  
  for (let col = 0; col < numCols; col++) {
    let boolCount = 0;
    const sampleSize = Math.min(50, rows.length);
    
    for (let row = 0; row < sampleSize; row++) {
      const value = String(rows[row]?.[col] || '').toLowerCase().trim();
      if (booleanValues.includes(value)) {
        boolCount++;
      }
    }
    
    if (boolCount / sampleSize > 0.7) {
      return col;
    }
  }
  
  return -1;
};

/**
 * Check if first row looks like a header
 */
const looksLikeHeader = (row: any[]): boolean => {
  if (!row || row.length === 0) return false;
  
  const keywords = ['pincode', 'pin', 'postal', 'zip', 'code', 'oda', 'remote', 'zone', 'state', 'city'];
  let matchCount = 0;
  
  for (const cell of row) {
    const str = String(cell || '').toLowerCase();
    if (keywords.some(k => str.includes(k)) || /^[a-z\s]+$/i.test(str)) {
      matchCount++;
    }
  }
  
  return matchCount / row.length > 0.3;
};

/**
 * Get region from zone code
 */
const getRegionFromZone = (zone: string): string => {
  if (zone.startsWith('NE')) return 'Northeast';
  if (zone.startsWith('N')) return 'North';
  if (zone.startsWith('S')) return 'South';
  if (zone.startsWith('E')) return 'East';
  if (zone.startsWith('W')) return 'West';
  if (zone.startsWith('C')) return 'Central';
  if (zone.startsWith('X')) return 'Special';
  return 'Other';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ServiceabilityUpload: React.FC<ServiceabilityUploadProps> = ({
  onServiceabilityReady,
  onError
}) => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBlueprint, setIsLoadingBlueprint] = useState(true);
  const [blueprintMap, setBlueprintMap] = useState<Map<string, BlueprintEntry>>(new Map());
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // LOAD BLUEPRINT (pincodes.json)
  // ============================================================================
  useEffect(() => {
    const loadBlueprint = async () => {
      try {
        const url = `${import.meta.env.BASE_URL || '/'}pincodes.json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load blueprint: ${response.status}`);
        }
        
        const data: BlueprintEntry[] = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid blueprint format');
        }
        
        // Build lookup map
        const map = new Map<string, BlueprintEntry>();
        for (const entry of data) {
          if (entry.pincode && entry.zone) {
            map.set(String(entry.pincode), entry);
          }
        }
        
        setBlueprintMap(map);
        console.log(`[ServiceabilityUpload] Loaded ${map.size} pincodes from blueprint`);
        
      } catch (error: any) {
        console.error('[ServiceabilityUpload] Failed to load blueprint:', error);
        toast.error('Failed to load pincode database. Please refresh the page.');
        onError?.(['Failed to load pincode database']);
      } finally {
        setIsLoadingBlueprint(false);
      }
    };
    
    loadBlueprint();
  }, [onError]);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // ============================================================================
  // FILE PROCESSING (THE CORE LOGIC)
  // ============================================================================
  
  const processFile = async (uploadedFile: File) => {
    if (blueprintMap.size === 0) {
      toast.error('Pincode database not loaded. Please wait and try again.');
      return;
    }
    
    const validExtensions = ['.csv', '.xlsx', '.xls', '.xlsm', '.txt', '.tsv'];
    const ext = '.' + uploadedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    
    setFile(uploadedFile);
    setIsProcessing(true);
    setParseResult(null);
    
    try {
      // Read file
      const data = await readFile(uploadedFile);
      
      // Parse and validate
      const result = parseExcelData(data);
      
      setParseResult(result);
      
      // Show results
      if (result.valid.length === 0) {
        toast.error('No valid pincodes found in file');
        onError?.(['No valid pincodes found']);
      } else {
        const msg = `Processed ${result.valid.length} valid pincodes across ${result.zoneSummary.length} zones`;
        if (result.invalid.length > 0) {
          toast(`${msg}. ${result.invalid.length} invalid entries excluded.`, {
            icon: '⚠️',
            duration: 5000
          });
        } else {
          toast.success(msg, { duration: 4000 });
        }
        
        // Notify parent
        onServiceabilityReady({
          serviceability: result.valid,
          zoneSummary: result.zoneSummary,
          checksum: result.checksum,
          source: 'excel'
        });
      }
      
    } catch (error: any) {
      console.error('[ServiceabilityUpload] Processing error:', error);
      toast.error(error.message || 'Failed to process file');
      onError?.([error.message || 'Processing failed']);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Read file contents using XLSX library
   */
  const readFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellText: false, cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            header: 1, 
            raw: true,
            defval: ''
          });
          resolve(jsonData as any[][]);
        } catch (error) {
          reject(new Error('Failed to parse file. Please check the format.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  /**
   * THE CORE PARSING LOGIC
   * 
   * According to spec:
   * 1. Extract pincodes from Excel (mandatory)
   * 2. Extract isODA from Excel (optional)
   * 3. Look up EACH pincode in blueprint
   * 4. If NOT found → reject
   * 5. If found → auto-assign zone, state, city from blueprint
   * 6. Build normalized serviceability array
   */
  const parseExcelData = (rawData: any[][]): ParseResult => {
    const valid: ServiceabilityEntry[] = [];
    const invalid: Array<{ row: number; pincode: string; reason: string }> = [];
    const duplicates: Array<{ row: number; pincode: string }> = [];
    const seenPincodes = new Set<string>();
    
    if (!rawData || rawData.length === 0) {
      throw new Error('File is empty');
    }
    
    // Filter out empty rows
    const nonEmptyRows = rawData.filter(row => 
      row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim())
    );
    
    if (nonEmptyRows.length === 0) {
      throw new Error('No data found in file');
    }
    
    // Detect header
    const hasHeader = looksLikeHeader(nonEmptyRows[0]);
    const headers = hasHeader 
      ? nonEmptyRows[0].map((h, i) => String(h || `Col${i + 1}`))
      : nonEmptyRows[0].map((_, i) => `Col${i + 1}`);
    const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
    
    if (dataRows.length === 0) {
      throw new Error('No data rows found (only header?)');
    }
    
    // Detect pincode column
    const pincodeCol = detectPincodeColumn(dataRows);
    if (pincodeCol === -1) {
      throw new Error(
        'Could not detect pincode column.\n' +
        'Ensure your file contains a column with 6-digit Indian pincodes.\n' +
        'Example: 110001, 400001, 560001'
      );
    }
    
    // Detect ODA column (optional)
    const odaCol = detectODAColumn(headers, dataRows);
    
    console.log('[ServiceabilityUpload] Column detection:', {
      pincodeCol,
      odaCol,
      hasHeader,
      totalRows: dataRows.length
    });
    
    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = hasHeader ? i + 2 : i + 1;
      
      // Skip empty rows
      if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
        continue;
      }
      
      // Extract raw values
      const rawPincode = row[pincodeCol];
      const rawOda = odaCol >= 0 ? row[odaCol] : undefined;
      
      // Normalize pincode
      const pincode = normalizePincode(rawPincode);
      
      if (!pincode) {
        invalid.push({
          row: lineNum,
          pincode: String(rawPincode || ''),
          reason: 'Invalid pincode format (must be 6 digits)'
        });
        continue;
      }
      
      // Check for duplicates
      if (seenPincodes.has(pincode)) {
        duplicates.push({ row: lineNum, pincode });
        continue;
      }
      seenPincodes.add(pincode);
      
      // ============================================================
      // THE CRITICAL LOOKUP: Check pincode in blueprint
      // ============================================================
      const blueprintEntry = blueprintMap.get(pincode);
      
      if (!blueprintEntry) {
        // NOT in blueprint → REJECT
        invalid.push({
          row: lineNum,
          pincode,
          reason: 'Pincode not found in database (not serviceable)'
        });
        continue;
      }
      
      // ============================================================
      // AUTO-ASSIGN from blueprint
      // ============================================================
      const entry: ServiceabilityEntry = {
        pincode,
        zone: blueprintEntry.zone,        // AUTO-ASSIGNED
        state: blueprintEntry.state,      // AUTO-ASSIGNED
        city: blueprintEntry.city,        // AUTO-ASSIGNED
        isODA: parseODAValue(rawOda),     // From Excel (optional)
        active: true
      };
      
      valid.push(entry);
    }
    
    // Build zone summary
    const zoneMap = new Map<string, { entries: ServiceabilityEntry[] }>();
    
    for (const entry of valid) {
      if (!zoneMap.has(entry.zone)) {
        zoneMap.set(entry.zone, { entries: [] });
      }
      zoneMap.get(entry.zone)!.entries.push(entry);
    }
    
    const zoneSummary: ZoneSummary[] = [];
    for (const [zoneCode, data] of zoneMap.entries()) {
      const states = [...new Set(data.entries.map(e => e.state))];
      const cities = [...new Set(data.entries.map(e => e.city))];
      const odaCount = data.entries.filter(e => e.isODA).length;
      
      zoneSummary.push({
        zoneCode,
        region: getRegionFromZone(zoneCode),
        pincodeCount: data.entries.length,
        states,
        cities,
        odaCount
      });
    }
    
    // Sort by zone code
    zoneSummary.sort((a, b) => a.zoneCode.localeCompare(b.zoneCode));
    
    // Generate checksum
    const checksum = generateChecksum(valid);
    
    return {
      valid,
      invalid,
      duplicates,
      zoneSummary,
      checksum
    };
  };

  // ============================================================================
  // TEMPLATE DOWNLOAD
  // ============================================================================
  
  const downloadTemplate = () => {
    const csv = `pincode,isOda
110001,false
110002,false
110003,false
400001,false
400002,true
560001,false
700001,false
226001,false
302001,false

Notes:
- Only "pincode" column is required
- isOda is optional (true/false, yes/no, 1/0)
- Zone, state, city are auto-assigned from our database
- Pincodes not in our database will be rejected`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'serviceability_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Template downloaded');
  };

  // ============================================================================
  // CLEAR
  // ============================================================================
  
  const handleClear = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoadingBlueprint) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-slate-600">Loading pincode database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Upload Serviceability
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload your pincode list. Zones are auto-assigned from our database.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download Sample Template
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative rounded-xl border-2 border-dashed p-8 text-center transition-all
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : file 
              ? 'border-green-300 bg-green-50' 
              : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.xlsm,.txt,.tsv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-600 font-medium">Processing file...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet className="w-10 h-10 text-green-600" />
            <div>
              <p className="font-medium text-green-900">{file.name}</p>
              <p className="text-sm text-green-600">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-slate-500 mt-1">
                CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box with Sample Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Instructions */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">How it works:</p>
            <ul className="mt-1 space-y-0.5 text-blue-700">
              <li>• Your file should contain a column with 6-digit pincodes</li>
              <li>• Optional: Include an "isOda" column (true/false)</li>
              <li>• Zones, states, and cities are auto-assigned from our database</li>
              <li>• Pincodes not in our database will be rejected</li>
            </ul>
          </div>
        </div>

        {/* Right: Sample Table Preview */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 border border-green-200">
          <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Sample Format
          </p>
          <div className="bg-white rounded-lg border border-green-200 overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold text-slate-700">pincode</th>
                  <th className="px-3 py-1.5 text-left font-semibold text-slate-700">isOda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">110001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">110002</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">110003</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">400001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">400002</td>
                  <td className="px-3 py-1.5 text-slate-600 font-medium">TRUE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">560001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">700001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">226001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">302001</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-900">110020</td>
                  <td className="px-3 py-1.5 text-slate-600">FALSE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Results */}
      {parseResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`
            rounded-xl border-2 p-4
            ${parseResult.valid.length > 0 
              ? 'border-green-300 bg-green-50' 
              : 'border-red-300 bg-red-50'
            }
          `}>
            <div className="flex items-center gap-3">
              {parseResult.valid.length > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${parseResult.valid.length > 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {parseResult.valid.length > 0 
                    ? `${parseResult.valid.length} valid pincodes processed`
                    : 'No valid pincodes found'
                  }
                </p>
                <p className={`text-sm ${parseResult.valid.length > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {parseResult.zoneSummary.length} zones • 
                  {parseResult.invalid.length > 0 && ` ${parseResult.invalid.length} invalid • `}
                  {parseResult.duplicates.length > 0 && ` ${parseResult.duplicates.length} duplicates`}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* Details (Collapsible) */}
          {showDetails && (
            <div className="space-y-4">
              {/* Zone Summary */}
              {parseResult.zoneSummary.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-medium text-slate-900">Zone Summary</h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {parseResult.zoneSummary.map((zone) => (
                      <div key={zone.zoneCode} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-semibold">
                            {zone.zoneCode}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{zone.region}</p>
                            <p className="text-sm text-slate-500">
                              {zone.states.slice(0, 3).join(', ')}
                              {zone.states.length > 3 && ` +${zone.states.length - 3} more`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-900">{zone.pincodeCount} pincodes</p>
                          {zone.odaCount > 0 && (
                            <p className="text-sm text-orange-600">{zone.odaCount} ODA</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Entries */}
              {parseResult.invalid.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
                  <div className="px-4 py-3 bg-red-100 border-b border-red-200">
                    <h4 className="font-medium text-red-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Invalid Entries ({parseResult.invalid.length})
                    </h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-100/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-red-800">Row</th>
                          <th className="px-4 py-2 text-left font-medium text-red-800">Pincode</th>
                          <th className="px-4 py-2 text-left font-medium text-red-800">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {parseResult.invalid.slice(0, 50).map((entry, idx) => (
                          <tr key={idx} className="hover:bg-red-100/30">
                            <td className="px-4 py-2 text-red-700">{entry.row}</td>
                            <td className="px-4 py-2 font-mono text-red-900">{entry.pincode}</td>
                            <td className="px-4 py-2 text-red-700">{entry.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.invalid.length > 50 && (
                      <div className="px-4 py-2 text-sm text-red-600 bg-red-100/50">
                        ... and {parseResult.invalid.length - 50} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Checksum */}
              {parseResult.valid.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-100 text-sm">
                  <span className="text-slate-600">Checksum:</span>
                  <code className="font-mono text-slate-700">{parseResult.checksum}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceabilityUpload;
