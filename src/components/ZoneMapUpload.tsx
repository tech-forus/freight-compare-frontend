import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, AlertCircle, CheckCircle, Loader2, Trash2,
  FileSpreadsheet, Table, ChevronDown, ChevronUp, MapPin, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { zoneAssignmentService } from '../services/ZoneAssignmentService';
import type { ZoneConfig, RegionGroup, PincodeEntry } from '../types/wizard.types';

/**
 * ZoneMappingUpload Component - BULLETPROOF VERSION
 * 
 * Handles CSV/Excel uploads with comprehensive error handling and smart column detection.
 * 
 * KEY IMPROVEMENTS:
 * - Excel numeric handling (110001 as number, 1.10001e+5, 110001.0)
 * - Smart column detection (works with any headers or no headers)
 * - Detailed error messages with actionable suggestions
 * - Row-level validation with line numbers
 * - Confidence scoring for column detection
 * 
 * SUPPORTED FORMATS: CSV, TSV, Excel (.xlsx, .xls, .xlsm), TXT
 */

// Types
interface ParsedPincodeEntry {
  pincode: string;
  zone: string;
  isOda?: boolean;
  state?: string;
  city?: string;
  sourceRow?: number;
}

interface ZoneSummary {
  zoneCode: string;
  region: RegionGroup;
  pincodeCount: number;
  cityCount: number;
  stateCount: number;
  cities: string[];
  states: string[];
}

interface ParseError {
  row: number;
  type: 'INVALID_PINCODE' | 'INVALID_ZONE' | 'MISSING_DATA' | 'DUPLICATE' | 'FORMAT_ERROR';
  message: string;
  value?: string;
  suggestion?: string;
}

interface ParseWarning {
  type: 'MISSING_LOCATION' | 'ASSUMED_HEADER' | 'DATA_QUALITY' | 'INFO';
  message: string;
  count?: number;
}

interface ColumnDetectionResult {
  pincodeCol: number;
  zoneCol: number;
  stateCol: number;
  cityCol: number;
  odaCol: number;
  confidence: { pincode: number; zone: number; oda: number };
  analysis: string[];
}

interface ZoneMappingUploadProps {
  onDataParsed: (data: {
    zones: ZoneConfig[];
    priceMatrix: Record<string, Record<string, string | number>>;
    odaPincodes?: string[];
  }) => void;
  blankCellValue?: string | number;
}

// Constants
const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
  'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
  'uttarakhand', 'west bengal', 'delhi', 'jammu', 'kashmir', 'ladakh', 'chandigarh',
  'puducherry', 'andaman', 'nicobar', 'lakshadweep', 'daman', 'diu', 'dadra'
];

const BOOLEAN_VALUES = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];

// Helpers
const codeToRegion = (code: string): RegionGroup => {
  const upper = code.toUpperCase();
  if (upper.startsWith('NE')) return 'Northeast';
  const firstChar = upper.charAt(0);
  if (firstChar === 'N') return 'North';
  if (firstChar === 'S') return 'South';
  if (firstChar === 'E') return 'East';
  if (firstChar === 'W') return 'West';
  if (firstChar === 'C') return 'Central';
  return 'North';
};

const csKey = (city: string, state: string) => `${city}||${state}`;

/**
 * CRITICAL: Normalize pincode - handles Excel numeric formats
 * - Numbers: 110001 → "110001"
 * - Floats: 110001.0 → "110001"
 * - Scientific notation: 1.10001e+5 → "110001"
 */
const normalizePincode = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  
  let str = String(value).trim();
  
  // Handle scientific notation (e.g., "1.10001e+5" → "110001")
  if (str.includes('e') || str.includes('E')) {
    try {
      const num = parseFloat(str);
      if (!isNaN(num) && isFinite(num)) {
        str = Math.round(num).toString();
      }
    } catch (e) {
      // Continue with original
    }
  }
  
  // Handle floats (e.g., "110001.0" → "110001")
  if (str.includes('.')) {
    const num = parseFloat(str);
    if (!isNaN(num) && isFinite(num)) {
      str = Math.round(num).toString();
    }
  }
  
  // Extract digits
  const digits = str.replace(/[^0-9]/g, '');
  
  if (digits.length === 6) {
    return digits;
  } else if (digits.length > 6) {
    const first6 = digits.slice(0, 6);
    if (/^[1-8]/.test(first6)) {
      return first6;
    }
  }
  
  return null;
};

const normalizeZone = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).toUpperCase().trim();
  const match = str.match(/(NE\d?|N\d?|S\d?|E\d?|W\d?|C\d?|ROI|A|X\d?)/i);
  return match ? match[0].toUpperCase() : null;
};

const looksLikeHeader = (values: string[]): boolean => {
  const keywords = ['pincode', 'pin', 'postal', 'zip', 'zone', 'region', 'area', 'state', 'city', 'oda', 'district', 'location', 'code', 'name', 'id'];
  const matchCount = values.filter(v => {
    const lower = v.toLowerCase().trim();
    return keywords.some(k => lower.includes(k)) || v.length > 15 || /^[A-Za-z\s]+$/.test(v);
  }).length;
  return matchCount / values.length > 0.4;
};

// Main Component
const ZoneMappingUpload: React.FC<ZoneMappingUploadProps> = ({ onDataParsed, blankCellValue = '' }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pincodeData, setPincodeData] = useState<PincodeEntry[]>([]);
  const [isLoadingPincodes, setIsLoadingPincodes] = useState(true);
  const [parsedEntries, setParsedEntries] = useState<ParsedPincodeEntry[]>([]);
  const [zoneSummaries, setZoneSummaries] = useState<ZoneSummary[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load pincode reference data
  useEffect(() => {
    const loadPincodeData = async () => {
      try {
        const url = `${import.meta.env.BASE_URL || '/'}pincodes.json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        const data: PincodeEntry[] = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid pincodes.json format');
        const filtered = data.filter(e => 
          e.state && e.city && e.state !== 'NAN' && e.city !== 'NAN' &&
          e.state.trim() && e.city.trim() && e.pincode && /^\d{6}$/.test(String(e.pincode))
        );
        setPincodeData(filtered);
        console.log(`[ZoneMappingUpload] Loaded ${filtered.length} pincodes`);
      } catch (error: any) {
        console.error('[ZoneMappingUpload] Failed to load pincode data:', error);
        toast.error(`Failed to load pincode reference: ${error.message}`);
        setWarnings([{ type: 'DATA_QUALITY', message: 'Pincode reference unavailable. State/city info may be incomplete.' }]);
      } finally {
        setIsLoadingPincodes(false);
      }
    };
    loadPincodeData();
  }, []);

  const pincodeMap = React.useMemo(() => {
    const map = new Map<string, PincodeEntry>();
    pincodeData.forEach(entry => map.set(String(entry.pincode), entry));
    return map;
  }, [pincodeData]);

  const downloadTemplate = () => {
    const csv = `pincode,zone,isOda\n110001,N1,false\n110002,N1,false\n400001,W1,false\n400002,W1,true\n560001,S1,false\n700001,E1,false\n226001,N2,false\n302001,N3,false`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'zone_mapping_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Template downloaded');
  };

  // Column detection with confidence scoring
  const detectColumnType = (header: string, sampleValues: any[]) => {
    const h = (header || '').toLowerCase().trim();
    const pincodePatterns = ['pincode', 'pin', 'postal', 'zip'];
    const zonePatterns = ['zone', 'zonecode', 'region', 'area'];
    const statePatterns = ['state', 'province'];
    const cityPatterns = ['city', 'district', 'town'];
    const odaPatterns = ['oda', 'isoda', 'remote'];
    
    if (pincodePatterns.some(p => h === p || h.includes(p))) return { type: 'pincode', confidence: 0.95, reason: 'Header matches' };
    if (zonePatterns.some(p => h === p || h.includes(p))) return { type: 'zone', confidence: 0.95, reason: 'Header matches' };
    if (statePatterns.some(p => h === p || h.includes(p))) return { type: 'state', confidence: 0.95, reason: 'Header matches' };
    if (cityPatterns.some(p => h === p || h.includes(p))) return { type: 'city', confidence: 0.95, reason: 'Header matches' };
    if (odaPatterns.some(p => h === p || h.includes(p))) return { type: 'oda', confidence: 0.95, reason: 'Header matches' };
    
    const validSamples = sampleValues.filter(v => v !== null && v !== undefined && String(v).trim());
    if (validSamples.length === 0) return { type: 'unknown', confidence: 0, reason: 'No valid samples' };
    
    const pincodeCount = validSamples.filter(v => normalizePincode(v) !== null).length;
    const pincodeRatio = pincodeCount / validSamples.length;
    if (pincodeRatio > 0.7) return { type: 'pincode', confidence: 0.9, reason: `${Math.round(pincodeRatio * 100)}% are 6-digit pincodes` };
    if (pincodeRatio > 0.4) return { type: 'pincode', confidence: 0.6, reason: `${Math.round(pincodeRatio * 100)}% look like pincodes` };
    
    const zoneCount = validSamples.filter(v => normalizeZone(v) !== null).length;
    const zoneRatio = zoneCount / validSamples.length;
    if (zoneRatio > 0.7) return { type: 'zone', confidence: 0.9, reason: `${Math.round(zoneRatio * 100)}% match zone pattern` };
    if (zoneRatio > 0.4) return { type: 'zone', confidence: 0.6, reason: `${Math.round(zoneRatio * 100)}% look like zones` };
    
    const boolCount = validSamples.filter(v => BOOLEAN_VALUES.includes(String(v).toLowerCase().trim())).length;
    if (boolCount / validSamples.length > 0.7) return { type: 'oda', confidence: 0.85, reason: `${Math.round(boolCount / validSamples.length * 100)}% are boolean` };
    
    const stateCount = validSamples.filter(v => {
      const lower = String(v).toLowerCase().trim();
      return INDIAN_STATES.some(s => lower === s || lower.includes(s) || s.includes(lower));
    }).length;
    if (stateCount / validSamples.length > 0.3) return { type: 'state', confidence: 0.7, reason: 'Matches state names' };
    
    return { type: 'unknown', confidence: 0, reason: 'Could not determine' };
  };

  const autoDetectColumns = (headers: string[], rows: any[][]): ColumnDetectionResult => {
    const result: ColumnDetectionResult = {
      pincodeCol: -1, zoneCol: -1, stateCol: -1, cityCol: -1, odaCol: -1,
      confidence: { pincode: 0, zone: 0, oda: 0 }, analysis: []
    };
    
    const sampleSize = Math.min(100, rows.length);
    const columnScores: Array<{ index: number; type: string; confidence: number; reason: string }> = [];
    
    const numCols = Math.max(headers.length, rows[0]?.length || 0);
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const header = headers[colIdx] || '';
      const sampleValues = rows.slice(0, sampleSize).map(row => row[colIdx]);
      const detection = detectColumnType(header, sampleValues);
      
      if (detection.confidence > 0.4) {
        columnScores.push({ index: colIdx, type: detection.type, confidence: detection.confidence, reason: detection.reason });
        result.analysis.push(`Col ${colIdx} (${header || 'unnamed'}): ${detection.type} (${Math.round(detection.confidence * 100)}%) - ${detection.reason}`);
      }
    }
    
    const assignColumn = (type: string) => {
      const candidates = columnScores.filter(c => c.type === type).sort((a, b) => b.confidence - a.confidence);
      return candidates.length > 0 ? candidates[0] : null;
    };
    
    const pincodeMatch = assignColumn('pincode');
    const zoneMatch = assignColumn('zone');
    const odaMatch = assignColumn('oda');
    const stateMatch = assignColumn('state');
    const cityMatch = assignColumn('city');
    
    if (pincodeMatch) { result.pincodeCol = pincodeMatch.index; result.confidence.pincode = pincodeMatch.confidence; }
    if (zoneMatch) { result.zoneCol = zoneMatch.index; result.confidence.zone = zoneMatch.confidence; }
    if (odaMatch) { result.odaCol = odaMatch.index; result.confidence.oda = odaMatch.confidence; }
    if (stateMatch) result.stateCol = stateMatch.index;
    if (cityMatch) result.cityCol = cityMatch.index;
    
    return result;
  };

  // Parse raw data
  const parseRawData = (rawData: any[][]) => {
    const parseErrors: ParseError[] = [];
    const parseWarnings: ParseWarning[] = [];
    const entries: ParsedPincodeEntry[] = [];
    
    if (!rawData || rawData.length === 0) throw new Error('File contains no data');
    
    const nonEmptyRows = rawData.filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim()));
    if (nonEmptyRows.length === 0) throw new Error('File contains only empty rows');
    
    parseWarnings.push({ type: 'INFO', message: `Processing ${nonEmptyRows.length} non-empty rows from ${rawData.length} total` });
    
    const firstRow = nonEmptyRows[0];
    const hasHeader = looksLikeHeader(firstRow.map(v => String(v || '')));
    const headers = hasHeader ? firstRow.map((h, i) => String(h || `Column${i + 1}`)) : firstRow.map((_, i) => `Column${i + 1}`);
    const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
    
    if (dataRows.length === 0) throw new Error('No data rows found (only header?)');
    
    parseWarnings.push({
      type: hasHeader ? 'ASSUMED_HEADER' : 'INFO',
      message: hasHeader ? `First row detected as header: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}` : 'No header, using Column1, Column2...'
    });
    
    const columnMap = autoDetectColumns(headers, dataRows);
    console.log('[ZoneMappingUpload] Detection:', columnMap.analysis);
    
    const requiredErrors: string[] = [];
    
    if (columnMap.pincodeCol === -1) {
      requiredErrors.push(
        `❌ Could not detect PINCODE column.\n` +
        `   Expected: 6-digit numbers (110001, 400001, 560001)\n` +
        `   Headers checked: ${headers.length}\n` +
        `   Troubleshooting:\n` +
        `   • Ensure pincodes are 6 digits\n` +
        `   • Remove formatting (spaces, hyphens)\n` +
        `   • Check Excel didn't convert to dates/formulas`
      );
    } else {
      parseWarnings.push({
        type: 'INFO',
        message: `✓ Pincode: "${headers[columnMap.pincodeCol]}" (Col ${columnMap.pincodeCol + 1}, ${Math.round(columnMap.confidence.pincode * 100)}%)`
      });
    }
    
    if (columnMap.zoneCol === -1) {
      requiredErrors.push(
        `❌ Could not detect ZONE column.\n` +
        `   Expected: N1, S2, W1, NE1, E1, C1\n` +
        `   Headers checked: ${headers.length}\n` +
        `   Troubleshooting:\n` +
        `   • Use format: [Direction][Number]\n` +
        `   • Valid: N, S, E, W, NE, C, ROI\n` +
        `   • Remove extra text (e.g., "North 1" → "N1")`
      );
    } else {
      parseWarnings.push({
        type: 'INFO',
        message: `✓ Zone: "${headers[columnMap.zoneCol]}" (Col ${columnMap.zoneCol + 1}, ${Math.round(columnMap.confidence.zone * 100)}%)`
      });
    }
    
    if (requiredErrors.length > 0) {
      throw new Error(
        `Required columns not found:\n\n${requiredErrors.join('\n\n')}\n\n` +
        `File structure:\n` +
        `  • Rows: ${rawData.length}\n` +
        `  • Non-empty: ${nonEmptyRows.length}\n` +
        `  • Header: ${hasHeader ? 'Yes' : 'No'}\n` +
        `  • Columns: ${headers.length}\n` +
        `  • Names: ${headers.join(', ')}\n\n` +
        `Download template for reference.`
      );
    }
    
    if (columnMap.odaCol >= 0) parseWarnings.push({ type: 'INFO', message: `✓ ODA: "${headers[columnMap.odaCol]}" (Col ${columnMap.odaCol + 1})` });
    if (columnMap.stateCol >= 0) parseWarnings.push({ type: 'INFO', message: `✓ State: "${headers[columnMap.stateCol]}" (Col ${columnMap.stateCol + 1})` });
    if (columnMap.cityCol >= 0) parseWarnings.push({ type: 'INFO', message: `✓ City: "${headers[columnMap.cityCol]}" (Col ${columnMap.cityCol + 1})` });
    
    const seenPincodes = new Set<string>();
    let skippedRows = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = hasHeader ? i + 2 : i + 1;
      
      if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
        skippedRows++;
        continue;
      }
      
      const rawPincode = row[columnMap.pincodeCol];
      const rawZone = row[columnMap.zoneCol];
      const rawOda = columnMap.odaCol >= 0 ? row[columnMap.odaCol] : undefined;
      const rawState = columnMap.stateCol >= 0 ? row[columnMap.stateCol] : undefined;
      const rawCity = columnMap.cityCol >= 0 ? row[columnMap.cityCol] : undefined;
      
      const pincode = normalizePincode(rawPincode);
      if (!pincode) {
        if (parseErrors.length < 50) {
          parseErrors.push({
            row: lineNum, type: 'INVALID_PINCODE',
            message: `Invalid pincode: "${rawPincode}"`, value: String(rawPincode || ''),
            suggestion: 'Must be 6-digit number. Check for dates, formulas, or formatting.'
          });
        }
        continue;
      }
      
      const zone = normalizeZone(rawZone);
      if (!zone) {
        if (parseErrors.length < 50) {
          parseErrors.push({
            row: lineNum, type: 'INVALID_ZONE',
            message: `Invalid zone: "${rawZone}"`, value: String(rawZone || ''),
            suggestion: 'Format: N1, S2, W1, NE1. Valid: N, S, E, W, NE, C, ROI.'
          });
        }
        continue;
      }
      
      if (seenPincodes.has(pincode)) {
        parseWarnings.push({ type: 'DATA_QUALITY', message: `Duplicate pincode ${pincode} at row ${lineNum}` });
        continue;
      }
      seenPincodes.add(pincode);
      
      const isOda = rawOda !== undefined && rawOda !== null && BOOLEAN_VALUES.includes(String(rawOda).toLowerCase().trim()) && ['true', 'yes', '1', 'y'].includes(String(rawOda).toLowerCase().trim());
      const pincodeInfo = pincodeMap.get(pincode);
      const state = (rawState && String(rawState).trim()) || pincodeInfo?.state;
      const city = (rawCity && String(rawCity).trim()) || pincodeInfo?.city;
      
      entries.push({ pincode, zone, isOda, state, city, sourceRow: lineNum });
    }
    
    if (skippedRows > 0) parseWarnings.push({ type: 'INFO', message: `Skipped ${skippedRows} empty rows` });
    
    if (entries.length === 0) {
      const errorSummary = parseErrors.slice(0, 10).map(e => `  • Row ${e.row}: ${e.message}`).join('\n');
      throw new Error(
        `No valid entries after parsing ${dataRows.length} rows.\n\n` +
        `Errors (first 10):\n${errorSummary}${parseErrors.length > 10 ? `\n...and ${parseErrors.length - 10} more` : ''}\n\nFix errors and retry.`
      );
    }
    
    const missingLocation = entries.filter(e => !e.state || !e.city).length;
    if (missingLocation > 0) parseWarnings.push({ type: 'MISSING_LOCATION', message: `${missingLocation} pincodes missing state/city`, count: missingLocation });
    
    const odaCount = entries.filter(e => e.isOda).length;
    if (odaCount > 0) parseWarnings.push({ type: 'INFO', message: `${odaCount} ODA pincodes` });
    
    console.log(`[ZoneMappingUpload] Parsed ${entries.length} entries (${parseErrors.length} errors, ${parseWarnings.length} warnings)`);
    return { entries, errors: parseErrors, warnings: parseWarnings };
  };

  const parseCSV = (text: string): any[][] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) throw new Error('CSV is empty');
    
    const firstLine = lines[0];
    const delimiters = [',', '\t', ';', '|'];
    let delimiter = ',';
    let maxCells = 0;
    for (const delim of delimiters) {
      const cells = firstLine.split(delim);
      if (cells.length > maxCells) { maxCells = cells.length; delimiter = delim; }
    }
    console.log(`[ZoneMappingUpload] CSV delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"`);
    return lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, '')));
  };

  const parseExcel = async (file: File): Promise<any[][]> => {
    let XLSX: any = (window as any).XLSX;
    
    if (!XLSX) {
      try {
        const xlsxModule = await import('xlsx');
        XLSX = xlsxModule.default || xlsxModule;
      } catch (e) {
        console.log('[ZoneMappingUpload] xlsx not via import');
      }
    }
    
    if (!XLSX) {
      console.log('[ZoneMappingUpload] Loading XLSX from CDN...');
      await new Promise<void>((resolve, reject) => {
        if ((window as any).__xlsxLoading) {
          const checkInterval = setInterval(() => {
            if ((window as any).XLSX) { clearInterval(checkInterval); resolve(); }
          }, 100);
          setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout loading XLSX')); }, 15000);
          return;
        }
        (window as any).__xlsxLoading = true;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.integrity = 'sha512-r22gChDnGvBylk90+2e/ycr+equG0XZ+QP4D8oPM0+4S4BGOG7BRTj8RPqLO8nBCECUYRVQKSqWQWqQTv0Y0pA==';
        script.crossOrigin = 'anonymous';
        script.onload = () => { XLSX = (window as any).XLSX; (window as any).__xlsxLoading = false; console.log('[ZoneMappingUpload] XLSX loaded'); resolve(); };
        script.onerror = () => { (window as any).__xlsxLoading = false; reject(new Error('Failed to load XLSX')); };
        document.head.appendChild(script);
      });
      XLSX = (window as any).XLSX;
    }
    
    if (!XLSX) throw new Error('Could not load Excel parser. Try CSV format.');
    
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('Excel file is empty (0 bytes)');
    console.log(`[ZoneMappingUpload] Reading Excel (${arrayBuffer.byteLength} bytes)...`);
    
    let workbook;
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, cellNF: false });
    } catch (e: any) {
      throw new Error(`Failed to parse Excel: ${e.message}. File may be corrupted.`);
    }
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error('Excel has no sheets');
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) throw new Error(`Sheet "${firstSheetName}" could not be read`);
    console.log(`[ZoneMappingUpload] Reading sheet: "${firstSheetName}"`);
    
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, blankrows: true });
    if (!rawData || rawData.length === 0) throw new Error('Excel sheet is empty');
    console.log(`[ZoneMappingUpload] Excel parsed: ${rawData.length} rows, ${rawData[0]?.length || 0} cols`);
    return rawData;
  };

  const buildZoneConfigs = (entries: ParsedPincodeEntry[]): ZoneSummary[] => {
    const zoneMap = new Map<string, { pincodes: Set<string>; cities: Set<string>; states: Set<string> }>();
    entries.forEach(({ zone, pincode, city, state }) => {
      if (!zoneMap.has(zone)) zoneMap.set(zone, { pincodes: new Set(), cities: new Set(), states: new Set() });
      const data = zoneMap.get(zone)!;
      data.pincodes.add(pincode);
      if (city && state) { data.cities.add(csKey(city, state)); data.states.add(state); }
    });
    
    const summaries: ZoneSummary[] = [];
    zoneMap.forEach((data, zoneCode) => {
      summaries.push({
        zoneCode, region: codeToRegion(zoneCode),
        pincodeCount: data.pincodes.size, cityCount: data.cities.size, stateCount: data.states.size,
        cities: Array.from(data.cities), states: Array.from(data.states)
      });
    });
    
    return summaries.sort((a, b) => {
      const aPrefix = a.zoneCode.replace(/\d/g, '');
      const bPrefix = b.zoneCode.replace(/\d/g, '');
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      return parseInt(a.zoneCode.replace(/\D/g, '') || '0') - parseInt(b.zoneCode.replace(/\D/g, '') || '0');
    });
  };

  const handleFileProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);
    setParsedEntries([]);
    setZoneSummaries([]);

    try {
      console.log(`[ZoneMappingUpload] Processing: ${file.name} (${file.size} bytes)`);
      let rawData: any[][];
      const fileName = file.name.toLowerCase();
      
      if (file.size > 100 * 1024 * 1024) throw new Error('File too large (max 100MB)');
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
        rawData = await parseExcel(file);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
        const text = await file.text();
        if (!text || !text.trim()) throw new Error('File is empty');
        rawData = parseCSV(text);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
        if (firstBytes[0] === 0x50 && firstBytes[1] === 0x4B) {
          console.log('[ZoneMappingUpload] Detected Excel from signature');
          rawData = await parseExcel(file);
        } else {
          console.log('[ZoneMappingUpload] Assuming text format');
          const text = await file.text();
          if (!text || !text.trim()) throw new Error('File is empty');
          rawData = parseCSV(text);
        }
      }

      const parseResult = parseRawData(rawData);
      setParsedEntries(parseResult.entries);
      setErrors(parseResult.errors);
      setWarnings(parseResult.warnings);
      const summaries = buildZoneConfigs(parseResult.entries);
      setZoneSummaries(summaries);

      if (parseResult.errors.length === 0) {
        toast.success(`✓ Parsed ${parseResult.entries.length} entries into ${summaries.length} zones`, { duration: 4000 });
      } else {
        toast.error(`Parsed with ${parseResult.errors.length} errors. ${parseResult.entries.length} valid entries found.`, { duration: 5000 });
      }
    } catch (err: any) {
      console.error('[ZoneMappingUpload] Failed:', err);
      setErrors([{ row: 0, type: 'FORMAT_ERROR', message: err.message || 'Unknown error', suggestion: 'Check file format or download template.' }]);
      toast.error('Failed to process file', { duration: 4000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (zoneSummaries.length === 0) { toast.error('No zones to apply'); return; }
    try {
      const zones: ZoneConfig[] = zoneSummaries.map(s => ({
        zoneCode: s.zoneCode, zoneName: s.zoneCode, region: s.region,
        selectedStates: s.states, selectedCities: s.cities, isComplete: true
      }));
      const zoneCodes = zones.map(z => z.zoneCode);
      const priceMatrix: Record<string, Record<string, string | number>> = {};
      zoneCodes.forEach(from => {
        priceMatrix[from] = {};
        zoneCodes.forEach(to => { priceMatrix[from][to] = blankCellValue; });
      });
      const odaPincodes = parsedEntries.filter(e => e.isOda).map(e => e.pincode);
      console.log(`[ZoneMappingUpload] Applying ${zones.length} zones with ${odaPincodes.length} ODA`);
      onDataParsed({ zones, priceMatrix, odaPincodes });
      toast.success(`Applied ${zones.length} zones!`, { duration: 3000 });
    } catch (err: any) {
      console.error('[ZoneMappingUpload] Apply failed:', err);
      toast.error(`Failed to apply: ${err.message}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setParsedEntries([]); setZoneSummaries([]); setErrors([]); setWarnings([]); }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setParsedEntries([]); setZoneSummaries([]); setErrors([]); setWarnings([]); }
  };
  const handleRemoveFile = () => {
    setFile(null);
    setParsedEntries([]);
    setZoneSummaries([]);
    setErrors([]);
    setWarnings([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (file && !isLoadingPincodes) handleFileProcess();
  }, [file, isLoadingPincodes]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-slate-900">Upload Zone Mapping</h4>
        </div>
        <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Download className="w-4 h-4" />Template
        </button>
      </div>

      <p className="text-sm text-slate-600">Upload CSV/Excel with pincode-zone mappings. Columns auto-detected.</p>

      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => !isProcessing && !isLoadingPincodes && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isProcessing || isLoadingPincodes ? 'cursor-wait' : 'cursor-pointer'}
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
          ${file && !isProcessing ? 'border-green-400 bg-green-50' : ''}`}>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.xlsm,.txt,.tsv" onChange={handleFileChange} className="hidden" disabled={isProcessing || isLoadingPincodes} />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="font-medium text-green-800">{file.name}</p>
            <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
            {!isProcessing && (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors mt-2">
                <Trash2 className="w-4 h-4" />Remove
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-slate-400" />
            <p className="font-medium text-slate-700">{isDragging ? 'Drop file here' : 'Click or drag to upload'}</p>
            <p className="text-sm text-slate-500">CSV, Excel (.xlsx, .xls), TXT, TSV</p>
          </div>
        )}

        {(isProcessing || isLoadingPincodes) && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-slate-700">{isLoadingPincodes ? 'Loading reference data...' : 'Processing file...'}</span>
            </div>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-h-96 overflow-y-auto">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 mb-1">{errors.length} Error{errors.length > 1 ? 's' : ''} Found</p>
              <p className="text-sm text-red-700 mb-2">Please fix these and retry:</p>
            </div>
          </div>
          <div className="space-y-2 pl-7">
            {errors.slice(0, 20).map((err, i) => (
              <div key={i} className="text-sm bg-white p-3 rounded border border-red-200">
                <p className="font-medium text-red-900">{err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}</p>
                {err.value && <p className="text-red-700 mt-1 font-mono text-xs">Value: "{err.value}"</p>}
                {err.suggestion && <p className="text-red-600 mt-1 text-xs">💡 {err.suggestion}</p>}
              </div>
            ))}
            {errors.length > 20 && <p className="text-sm text-red-700 font-medium">...and {errors.length - 20} more</p>}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              {warnings.map((w, i) => <p key={i}>{w.type === 'INFO' ? '✓' : '⚠️'} {w.message}</p>)}
            </div>
          </div>
        </div>
      )}

      {zoneSummaries.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-900">{zoneSummaries.length} zones • {parsedEntries.length} pincodes</span>
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isExpanded && (
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto bg-white">
              {zoneSummaries.map(s => (
                <div key={s.zoneCode} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-sm rounded-md min-w-[48px] text-center">{s.zoneCode}</div>
                    <span className="text-xs text-slate-500 font-medium">{s.region}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span title="Pincodes">{s.pincodeCount} pins</span>
                    {s.cityCount > 0 && <span title="Cities">{s.cityCount} cities</span>}
                    {s.stateCount > 0 && <span title="States">{s.stateCount} states</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 bg-white border-t border-slate-200">
            <button type="button" onClick={handleApply} disabled={zoneSummaries.length === 0}
              className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />Apply Zone Mapping ({zoneSummaries.length} zones)
            </button>
          </div>
        </div>
      )}

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
        <p className="font-medium text-slate-700">Required Format:</p>
        <p>• <strong>Pincode:</strong> 6-digit Indian postal codes (110001, 400001)</p>
        <p>• <strong>Zone:</strong> Codes like N1, S2, W1, NE1, E1, C1</p>
        <p>• <strong>ODA (optional):</strong> true/false for Out of Delivery Area</p>
        <p className="mt-2 text-slate-500">✓ Any column names or no headers<br />✓ Auto-detects delimiters<br />✓ Handles Excel numeric formatting</p>
      </div>
    </div>
  );
};

export default ZoneMappingUpload;