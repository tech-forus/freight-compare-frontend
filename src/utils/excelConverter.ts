// src/utils/excelConverter.ts
import * as XLSX from 'xlsx';

/**
 * Box type for Excel conversion
 */
export interface BoxExcelRow {
  name: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  quantity: number;
  description?: string;
}

/**
 * Generate and download an Excel template for box library import
 */
export const generateBoxLibraryTemplate = (): void => {
  // Create sample data with one example row
  const sampleData = [
    {
      'Box Name': 'Example Box',
      'Weight (kg)': 10,
      'Length (cm)': 30,
      'Width (cm)': 20,
      'Height (cm)': 15,
      'Quantity': 5,
      'Description': 'Sample box for reference'
    }
  ];

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 }, // Box Name
    { wch: 12 }, // Weight
    { wch: 12 }, // Length
    { wch: 12 }, // Width
    { wch: 12 }, // Height
    { wch: 10 }, // Quantity
    { wch: 30 }, // Description
  ];

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Box Library Template');

  // Download file
  XLSX.writeFile(workbook, 'box_library_template.xlsx');
};

/**
 * Export boxes to Excel file
 * @param boxes - Array of boxes to export
 * @param filename - Name of the file (without extension)
 */
export const exportBoxesToExcel = (
  boxes: BoxExcelRow[],
  filename: string = 'packing_list'
): void => {
  if (!boxes || boxes.length === 0) {
    throw new Error('No boxes to export');
  }

  // Transform boxes to Excel format
  const excelData = boxes.map(box => ({
    'Box Name': box.name || box.description || 'Unnamed Box',
    'Weight (kg)': box.weight || 0,
    'Length (cm)': box.length || '',
    'Width (cm)': box.width || '',
    'Height (cm)': box.height || '',
    'Quantity': box.quantity || 1,
    'Description': box.description || ''
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Box Name
    { wch: 12 }, // Weight
    { wch: 12 }, // Length
    { wch: 12 }, // Width
    { wch: 12 }, // Height
    { wch: 10 }, // Quantity
    { wch: 30 }, // Description
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Packing List');

  // Download file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export packing list to Excel (wrapper for Calculator page)
 * @param packingListBoxes - Array of boxes from packing list
 * @param filename - Optional filename (defaults to 'packing_list')
 */
export const exportPackingListToExcel = (
  packingListBoxes: any[],
  filename: string = 'packing_list'
): void => {
  // Transform packing list boxes to BoxExcelRow format
  const boxes: BoxExcelRow[] = packingListBoxes.map(box => ({
    name: box.name || box.description || 'Box',
    weight: box.weight || 0,
    length: box.boxLength || box.length,
    width: box.boxWidth || box.width,
    height: box.boxHeight || box.height,
    quantity: box.quantity || 1,
    description: box.description || box.name || ''
  }));

  // Use the generic export function
  exportBoxesToExcel(boxes, filename);
};

/**
 * Parse uploaded Excel file and convert to box array
 * @param file - Excel file to parse
 * @returns Promise resolving to array of boxes
 */
export const parseExcelToBoxes = (file: File): Promise<BoxExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Parse workbook
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel file is empty'));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('No data found in Excel file'));
          return;
        }

        // Map and validate data
        const boxes: BoxExcelRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          const rowNum = index + 2; // +2 because Excel is 1-indexed and has header row

          // Required fields validation
          const name = row['Box Name']?.toString().trim();
          const weight = parseFloat(row['Weight (kg)']);
          const length = row['Length (cm)'] ? parseFloat(row['Length (cm)']) : undefined;
          const width = row['Width (cm)'] ? parseFloat(row['Width (cm)']) : undefined;
          const height = row['Height (cm)'] ? parseFloat(row['Height (cm)']) : undefined;
          const quantity = row['Quantity'] ? parseInt(row['Quantity']) : 1;
          const description = row['Description']?.toString().trim() || '';

          // Validate required fields
          if (!name) {
            errors.push(`Row ${rowNum}: Box Name is required`);
          }
          if (!weight || isNaN(weight) || weight <= 0) {
            errors.push(`Row ${rowNum}: Valid Weight is required`);
          }

          // If dimensions are provided, validate them
          if (length !== undefined && (isNaN(length) || length <= 0)) {
            errors.push(`Row ${rowNum}: Length must be a positive number`);
          }
          if (width !== undefined && (isNaN(width) || width <= 0)) {
            errors.push(`Row ${rowNum}: Width must be a positive number`);
          }
          if (height !== undefined && (isNaN(height) || height <= 0)) {
            errors.push(`Row ${rowNum}: Height must be a positive number`);
          }
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Row ${rowNum}: Quantity must be a positive number`);
          }

          // If no errors for this row, add the box
          if (!errors.some(e => e.startsWith(`Row ${rowNum}:`))) {
            boxes.push({
              name,
              weight,
              length,
              width,
              height,
              quantity,
              description
            });
          }
        });

        // If there are validation errors, reject
        if (errors.length > 0) {
          reject(new Error(`Validation errors:\n${errors.join('\n')}`));
          return;
        }

        // Success
        resolve(boxes);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Validate Excel file extension
 * @param file - File to validate
 * @returns true if file is Excel format
 */
export const isExcelFile = (file: File): boolean => {
  const validExtensions = ['.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};
