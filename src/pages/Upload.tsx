import React from 'react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config/api';

const Upload: React.FC = () => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt: ProgressEvent<FileReader>) => {
      const result = evt.target?.result;
      if (!result) return;

      const data = new Uint8Array(result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const companyName = prompt("Enter Company Name (e.g., XYZ Logistics):");
      if (!companyName) return alert("Company name is required");

      fetch(`${API_BASE_URL}/api/transporter/addtransporter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName, prices: jsonData })
      })
        .then(res => res.json())
        .then(data => alert(data.message))
        .catch(err => console.error(err));
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2>Upload Company Pricing</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
    </div>
  );
};

export default Upload;
