import React, { useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';

// A generic row type: keys are column headers, values can be string, number, etc.
type ExcelRow = { [key: string]: string | number | boolean };

const ExcelUploader: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result || typeof result !== 'string') return;

      // Read workbook and convert first sheet to JSON
      const workbook = XLSX.read(result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      setExcelData(json);
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/data/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: excelData }),
      });
      const result = await response.json();

      if (result.success) {
        alert('Data saved successfully');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <div className="p-4">
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        className="mb-4"
      />

      {excelData.length > 0 && (
        <>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Save to Database
          </button>

          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr>
                {Object.keys(excelData[0]).map((key) => (
                  <th key={key} className="border p-2">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {excelData.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="border p-2">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default ExcelUploader;