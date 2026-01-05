import React, { useState } from 'react';

const Onboarding: React.FC = () => {
  // rename vendor to companyName
  const [companyName, setCompanyName] = useState('');
  // new transporter ID state
  const [transporterId, setTransporterId] = useState('');

  // Align charges state keys with schema
  const [priceRate, setPriceRate] = useState({
    minWeight: '',
    docketCharges: '',
    fuel: '',
    rovVariable: '',
    rovFixed: '',
    inuaranceVariable: '',
    inuaranceFixed: '',
    odaVariable: '',
    odaFixed: '',
    codVariable: '',
    codFixed: '',
    prepaidVariable: '',
    prepaidFixed: '',
    topayVariable: '',
    topayFixed: '',
    handlingVariable: '',
    handlingFixed: '',
    fmVariable: '',
    fmFixed: '',
    appointmentVariable: '',
    appointmentFixed: '',
    divisor: '1',
    minCharges: '0',
    greenTax: '',
    daccCharges: '',
    miscellanousCharges: ''
  });

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPriceRate(prev => ({ ...prev, [name]: value }));
  };

  // Initialize a 14x14 matrix for zone-to-zone rates
  const initialMatrix = Array.from({ length: 14 }, () => Array(14).fill(''));
  const [matrix, setMatrix] = useState(initialMatrix);
  const zoneLabels = Array.from({ length: 14 }, (_, idx) => `Z${idx + 1}`);

  const handleMatrixChange = (i: number, j: number, value: string) => {
    setMatrix(prev => {
      const copy = prev.map(row => [...row]);
      copy[i][j] = value;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build rates object: priceChart
    const rates: Record<string, Record<string, number>> = {};
    matrix.forEach((row, i) => {
      rates[zoneLabels[i]] = row.reduce((acc, val, j) => {
        acc[zoneLabels[j]] = Number(val || 0);
        return acc;
      }, {} as Record<string, number>);
    });

    // Map UI state to schema payload
    const payload = {
      companyName,
      prices: [
        {
          transporterid: transporterId,
          priceRate: {
            minWeight: Number(priceRate.minWeight || 0),
            docketCharges: Number(priceRate.docketCharges),
            fuel: Number(priceRate.fuel),
            rovCharges: {
              variable: Number(priceRate.rovVariable),
              fixed: Number(priceRate.rovFixed)
            },
            inuaranceCharges: {
              variable: Number(priceRate.inuaranceVariable),
              fixed: Number(priceRate.inuaranceFixed)
            },
            odaCharges: {
              variable: Number(priceRate.odaVariable),
              fixed: Number(priceRate.odaFixed)
            },
            codCharges: {
              variable: Number(priceRate.codVariable),
              fixed: Number(priceRate.codFixed)
            },
            prepaidCharges: {
              variable: Number(priceRate.prepaidVariable),
              fixed: Number(priceRate.prepaidFixed)
            },
            topayCharges: {
              variable: Number(priceRate.topayVariable),
              fixed: Number(priceRate.topayFixed)
            },
            handlingCharges: {
              variable: Number(priceRate.handlingVariable),
              fixed: Number(priceRate.handlingFixed)
            },
            fmCharges: {
              variable: Number(priceRate.fmVariable),
              fixed: Number(priceRate.fmFixed)
            },
            appointmentCharges: {
              variable: Number(priceRate.appointmentVariable),
              fixed: Number(priceRate.appointmentFixed)
            },
            divisor: Number(priceRate.divisor),
            minCharges: Number(priceRate.minCharges),
            greenTax: Number(priceRate.greenTax),
            daccCharges: Number(priceRate.daccCharges),
            miscellanousCharges: Number(priceRate.miscellanousCharges)
          }
        }
      ],
      priceChart: rates
    };

    console.log('Generated payload:', JSON.stringify(payload, null, 2));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full w-full bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Vendor Pricing Matrix</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company (User ID)</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Transporter ID</label>
            <input
              type="text"
              value={transporterId}
              onChange={e => setTransporterId(e.target.value)}
              className="mt-1 w-full border-gray-300 rounded-lg"
              required
            />
          </div>

          {/* PriceRate inputs (docket, fuel, nested charges, etc.) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <input name="minWeight" placeholder="Min Weight" type="number" value={priceRate.minWeight} onChange={handleRateChange} className="border rounded p-2" />
            <input name="docketCharges" placeholder="Docket Charges" type="number" value={priceRate.docketCharges} onChange={handleRateChange} className="border rounded p-2" />
            <input name="fuel" placeholder="Fuel" type="number" value={priceRate.fuel} onChange={handleRateChange} className="border rounded p-2" />

            {/* Example nested fields; repeat for each nested charge */}
            <input name="rovVariable" placeholder="ROV Variable" type="number" value={priceRate.rovVariable} onChange={handleRateChange} className="border rounded p-2" />
            <input name="rovFixed" placeholder="ROV Fixed" type="number" value={priceRate.rovFixed} onChange={handleRateChange} className="border rounded p-2" />

            {/* ...and so on up to miscellanousCharges */}
          </div>

          {/* Zone matrix */}
          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">From/To</th>
                  {zoneLabels.map(z => <th key={z} className="border px-2 py-1">{z}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1 bg-gray-50">{zoneLabels[i]}</td>
                    {row.map((cell, j) => (
                      <td key={j} className="border px-1 py-1">
                        <input
                          type="number"
                          value={cell}
                          onChange={e => handleMatrixChange(i, j, e.target.value)}
                          className="w-full p-1 text-sm border rounded"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg">Generate JSON</button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
