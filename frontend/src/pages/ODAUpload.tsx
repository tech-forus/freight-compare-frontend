import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DecimalInput from '../components/DecimalInput';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Sparkles,
  Route,
  Plus,
  Trash2,
  Edit3,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Info,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// --- Type Definitions ---

interface DistanceWeightMatrixEntry {
  weightRange: string;
  distanceRange: string;
  price: number | null;
}


interface Range {
  id: string;
  label: string;
  min: number;
  max: number;
}

interface ODAEntry {
  pincode: string;
  isOda: string;
  zone: string;
}

interface ODAUploadData {
  entries: ODAEntry[];
  totalEntries: number;
  odaEntries: number;
  regularEntries: number;
  zones: string[];
}

// --- Reusable UI Components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 sm:p-8 ${className}`}>
    {children}
  </div>
);

const StepIndicator: React.FC<{ currentStep: number; steps: string[] }> = ({ currentStep, steps }) => (
  <nav aria-label="Progress">
    <ol role="list" className="flex items-center justify-between w-full">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <li className="relative flex flex-col items-center">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full font-medium transition-colors duration-300 z-10
              ${idx < currentStep ? 'bg-blue-600 text-white' : ''}
              ${idx === currentStep ? 'bg-white border-2 border-blue-600 text-blue-600' : 'bg-slate-200 text-slate-500'}`}
            >
              {idx < currentStep ? <CheckCircle className="h-6 w-6" /> : idx + 1}
            </div>
            <p className={`mt-2 whitespace-nowrap text-sm font-medium transition-colors text-center
              ${idx === currentStep ? 'text-blue-600' : 'text-slate-500'}`}
            >
              {step}
            </p>
          </li>
          {idx < steps.length - 1 && (
            <div className="flex-1 h-0.5 transition-colors bg-slate-200 relative mx-4">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: currentStep > idx ? '100%' : '0%' }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </ol>
  </nav>
);

// --- Main Component ---
const ODAUpload: React.FC = () => {
  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedData, setUploadedData] = useState<ODAUploadData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Distance-Weight Matrix State
  const [distanceWeightMatrix, setDistanceWeightMatrix] = useState<DistanceWeightMatrixEntry[]>([]);
  const [weightRanges, setWeightRanges] = useState<Range[]>([
    { id: '1', label: '1-100', min: 1, max: 100 },
    { id: '2', label: '101-500', min: 101, max: 500 },
    { id: '3', label: '501-1000', min: 501, max: 1000 },
    { id: '4', label: '1001-1500', min: 1001, max: 1500 },
    { id: '5', label: '1501-2000', min: 1501, max: 2000 },
    { id: '6', label: '2001-2500', min: 2001, max: 2500 }
  ]);
  const [distanceRanges, setDistanceRanges] = useState<Range[]>([
    { id: '1', label: '1-50', min: 1, max: 50 },
    { id: '2', label: '51-100', min: 51, max: 100 },
    { id: '3', label: '101-150', min: 101, max: 150 },
    { id: '4', label: '151-200', min: 151, max: 200 },
    { id: '5', label: '201-250', min: 201, max: 250 },
    { id: '6', label: '251-300', min: 251, max: 300 }
  ]);
  const [editingRange, setEditingRange] = useState<{ type: 'weight' | 'distance', range: Range } | null>(null);
  const [customWeightGap, setCustomWeightGap] = useState<number | null>(null);
  const [customDistanceGap, setCustomDistanceGap] = useState<number | null>(null);

  const navigate = useNavigate();

  // --- File Upload Functions ---
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/oda_template.csv');
      const csvContent = await response.text();

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'oda_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ODA template downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('File is empty');
      }

      const entries: ODAEntry[] = [];
      const errors: string[] = [];
      const zoneSet = new Set<string>();

      lines.forEach((line, index) => {
        const columns = line.split(',').map(col => col.trim());

        if (columns.length !== 3) {
          errors.push(`Line ${index + 1}: Expected 3 columns, found ${columns.length}`);
          return;
        }

        const [pincode, isOda, zone] = columns;

        if (!pincode || !isOda || !zone) {
          errors.push(`Line ${index + 1}: Missing required data`);
          return;
        }


        entries.push({ pincode, isOda, zone });
        zoneSet.add(zone);
      });

      if (errors.length > 0) {
        setErrors(errors);
        throw new Error('Validation errors found');
      }

      const odaEntries = entries.filter(entry => entry.isOda.toLowerCase() === 'true').length;
      const regularEntries = entries.filter(entry => entry.isOda.toLowerCase() === 'false').length;

      const uploadData: ODAUploadData = {
        entries,
        totalEntries: entries.length,
        odaEntries,
        regularEntries,
        zones: Array.from(zoneSet).sort()
      };

      setUploadedData(uploadData);
      setErrors([]);

      toast.success(`File processed successfully! ${entries.length} entries loaded.`);

    } catch (error: any) {
      toast.error(error.message || 'Error processing file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        processFile(droppedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        processFile(selectedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleDeleteFile = () => {
    setFile(null);
    setUploadedData(null);
    setErrors([]);
  };




  // --- Final Submission ---
  const handleSubmit = async () => {
    setIsLoading(true);
    const toastId = toast.loading('Saving distance-weight matrix...');

    try {
      // Use centralized API configuration
      const { API_BASE_URL } = await import('../config/api');
      const API_BASE = API_BASE_URL;

      // Get auth token
      const token = localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || '';

      const matrixData = {
        weightRanges: weightRanges.map(r => r.label),
        distanceRanges: distanceRanges.map(r => r.label),
        matrix: distanceWeightMatrix,
        odaEntries: odaEntries || [],
        vendorId: null, // Can be set if vendor-specific
      };

      // Save to backend API
      const response = await fetch(`${API_BASE}/api/oda/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(matrixData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save ODA configuration');
      }

      // Also save to localStorage as backup
      localStorage.setItem('distanceWeightMatrix', JSON.stringify({
        ...matrixData,
        timestamp: new Date().toISOString()
      }));
      sessionStorage.setItem('distanceWeightMatrix', JSON.stringify({
        ...matrixData,
        timestamp: new Date().toISOString()
      }));

      toast.success('ODA configuration saved successfully!', { id: toastId });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (error: any) {
      const message = error.message || 'Error saving data';
      toast.error(message, { id: toastId });
      console.error('ODA upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Distance-Weight Matrix Functions ---
  const initializeMatrix = () => {
    const matrix: DistanceWeightMatrixEntry[] = [];
    weightRanges.forEach(weightRange => {
      distanceRanges.forEach(distanceRange => {
        matrix.push({
          weightRange: weightRange.label,
          distanceRange: distanceRange.label,
          price: null
        });
      });
    });
    setDistanceWeightMatrix(matrix);
  };

  const updateMatrixPrice = (weightRange: string, distanceRange: string, price: number | null) => {
    setDistanceWeightMatrix(prev =>
      prev.map(entry =>
        entry.weightRange === weightRange && entry.distanceRange === distanceRange
          ? { ...entry, price }
          : entry
      )
    );
  };

  const addWeightRange = () => {
    const maxId = Math.max(...weightRanges.map(r => parseInt(r.id)));
    const lastRange = weightRanges[weightRanges.length - 1];
    const newMin = lastRange.max + 1;

    // Check if we've reached the maximum limit of 10,000 kg
    if (newMin > 10000) {
      toast.error('Maximum weight limit reached. Cannot add ranges beyond 10,000 kg.');
      return;
    }

    // Use custom gap if available, otherwise use default logic
    let increment: number;
    if (customWeightGap !== null) {
      increment = customWeightGap;
    } else {
      // Default increment logic
      if (lastRange.max >= 10000) {
        increment = 2500; // For ranges 10000+ (2500+ increments)
      } else if (lastRange.max >= 3000) {
        increment = 1000; // For ranges 3000-10000 (1000kg increments)
      } else if (lastRange.max >= 500) {
        increment = 500; // For ranges 500-3000 (500kg increments)
      } else {
        increment = 100; // Default for small ranges
      }
    }

    const newMax = newMin + increment - 1;

    // Ensure the new range doesn't exceed 10,000 kg
    if (newMax > 10000) {
      toast.error('Maximum weight limit reached. Cannot add ranges beyond 10,000 kg.');
      return;
    }

    const newRange: Range = {
      id: (maxId + 1).toString(),
      label: `${newMin}-${newMax}`,
      min: newMin,
      max: newMax
    };

    setWeightRanges(prev => [...prev, newRange]);

    // Add new matrix entries for this weight range
    const newEntries: DistanceWeightMatrixEntry[] = distanceRanges.map(distanceRange => ({
      weightRange: newRange.label,
      distanceRange: distanceRange.label,
      price: null
    }));

    setDistanceWeightMatrix(prev => [...prev, ...newEntries]);
  };

  const addDistanceRange = () => {
    const maxId = Math.max(...distanceRanges.map(r => parseInt(r.id)));
    const lastRange = distanceRanges[distanceRanges.length - 1];
    const newMin = lastRange.max + 1;

    // Check if we've reached the maximum limit of 500 km
    if (newMin > 500) {
      toast.error('Maximum distance limit reached. Cannot add ranges beyond 500 km.');
      return;
    }

    // Use custom gap if available, otherwise use default 50km
    const increment = customDistanceGap !== null ? customDistanceGap : 50;
    const newMax = newMin + increment - 1;

    // Ensure the new range doesn't exceed 500 km
    if (newMax > 500) {
      toast.error('Maximum distance limit reached. Cannot add ranges beyond 500 km.');
      return;
    }

    const newRange: Range = {
      id: (maxId + 1).toString(),
      label: `${newMin}-${newMax}`,
      min: newMin,
      max: newMax
    };

    setDistanceRanges(prev => [...prev, newRange]);

    // Add new matrix entries for this distance range
    const newEntries: DistanceWeightMatrixEntry[] = weightRanges.map(weightRange => ({
      weightRange: weightRange.label,
      distanceRange: newRange.label,
      price: null
    }));

    setDistanceWeightMatrix(prev => [...prev, ...newEntries]);
  };

  const removeWeightRange = (rangeId: string) => {
    if (weightRanges.length <= 1) {
      toast.error('At least one weight range is required.');
      return;
    }

    const rangeToRemove = weightRanges.find(r => r.id === rangeId);
    if (!rangeToRemove) return;

    setWeightRanges(prev => prev.filter(r => r.id !== rangeId));
    setDistanceWeightMatrix(prev =>
      prev.filter(entry => entry.weightRange !== rangeToRemove.label)
    );
  };

  const removeDistanceRange = (rangeId: string) => {
    if (distanceRanges.length <= 1) {
      toast.error('At least one distance range is required.');
      return;
    }

    const rangeToRemove = distanceRanges.find(r => r.id === rangeId);
    if (!rangeToRemove) return;

    setDistanceRanges(prev => prev.filter(r => r.id !== rangeId));
    setDistanceWeightMatrix(prev =>
      prev.filter(entry => entry.distanceRange !== rangeToRemove.label)
    );
  };

  const updateRange = (type: 'weight' | 'distance', rangeId: string, newLabel: string, newMin: number, newMax: number) => {
    if (type === 'weight') {
      const oldRange = weightRanges.find(r => r.id === rangeId);
      if (!oldRange) return;

      // Check if the new range exceeds 10,000 kg limit
      if (newMax > 10000) {
        toast.error('Maximum weight limit is 10,000 kg. Cannot exceed this limit.');
        return;
      }

      const currentIndex = weightRanges.findIndex(r => r.id === rangeId);

      // Calculate and store the custom gap
      const customGap = newMax - newMin + 1;
      setCustomWeightGap(customGap);

      // Update the current range
      const updatedRanges = [...weightRanges];
      updatedRanges[currentIndex] = { ...oldRange, label: newLabel, min: newMin, max: newMax };

      // Cascade update all subsequent ranges using the custom gap
      for (let i = currentIndex + 1; i < updatedRanges.length; i++) {
        const prevRange = updatedRanges[i - 1];
        const currentRange = updatedRanges[i];

        const newMin = prevRange.max + 1;
        const newMax = newMin + customGap - 1;

        // Stop cascade update if we would exceed 10,000 kg
        if (newMax > 10000) {
          // Remove all ranges from this point onwards
          updatedRanges.splice(i);
          break;
        }

        const newLabel = `${newMin}-${newMax}`;
        updatedRanges[i] = { ...currentRange, label: newLabel, min: newMin, max: newMax };
      }

      setWeightRanges(updatedRanges);

      // Update matrix entries for all changed ranges
      setDistanceWeightMatrix(prev => {
        let updatedMatrix = [...prev];

        // Update the current range
        updatedMatrix = updatedMatrix.map(entry =>
          entry.weightRange === oldRange.label
            ? { ...entry, weightRange: newLabel }
            : entry
        );

        // Update all subsequent ranges
        for (let i = currentIndex + 1; i < updatedRanges.length; i++) {
          const oldRangeLabel = weightRanges[i].label;
          const newRangeLabel = updatedRanges[i].label;

          updatedMatrix = updatedMatrix.map(entry =>
            entry.weightRange === oldRangeLabel
              ? { ...entry, weightRange: newRangeLabel }
              : entry
          );
        }

        // Remove matrix entries for ranges that were removed due to 10,000 kg limit
        const removedRanges = weightRanges.slice(updatedRanges.length);
        removedRanges.forEach(removedRange => {
          updatedMatrix = updatedMatrix.filter(entry => entry.weightRange !== removedRange.label);
        });

        return updatedMatrix;
      });

    } else {
      const oldRange = distanceRanges.find(r => r.id === rangeId);
      if (!oldRange) return;

      // Check if the new range exceeds 500 km limit
      if (newMax > 500) {
        toast.error('Maximum distance limit is 500 km. Cannot exceed this limit.');
        return;
      }

      const currentIndex = distanceRanges.findIndex(r => r.id === rangeId);

      // Calculate and store the custom gap
      const customGap = newMax - newMin + 1;
      setCustomDistanceGap(customGap);

      // Update the current range
      const updatedRanges = [...distanceRanges];
      updatedRanges[currentIndex] = { ...oldRange, label: newLabel, min: newMin, max: newMax };

      // Cascade update all subsequent ranges using the custom gap
      for (let i = currentIndex + 1; i < updatedRanges.length; i++) {
        const prevRange = updatedRanges[i - 1];
        const currentRange = updatedRanges[i];

        const newMin = prevRange.max + 1;
        const newMax = newMin + customGap - 1;

        // Stop cascade update if we would exceed 500 km
        if (newMax > 500) {
          // Remove all ranges from this point onwards
          updatedRanges.splice(i);
          break;
        }

        const newLabel = `${newMin}-${newMax}`;
        updatedRanges[i] = { ...currentRange, label: newLabel, min: newMin, max: newMax };
      }

      setDistanceRanges(updatedRanges);

      // Update matrix entries for all changed ranges
      setDistanceWeightMatrix(prev => {
        let updatedMatrix = [...prev];

        // Update the current range
        updatedMatrix = updatedMatrix.map(entry =>
          entry.distanceRange === oldRange.label
            ? { ...entry, distanceRange: newLabel }
            : entry
        );

        // Update all subsequent ranges
        for (let i = currentIndex + 1; i < updatedRanges.length; i++) {
          const oldRangeLabel = distanceRanges[i].label;
          const newRangeLabel = updatedRanges[i].label;

          updatedMatrix = updatedMatrix.map(entry =>
            entry.distanceRange === oldRangeLabel
              ? { ...entry, distanceRange: newRangeLabel }
              : entry
          );
        }

        // Remove matrix entries for ranges that were removed due to 500 km limit
        const removedRanges = distanceRanges.slice(updatedRanges.length);
        removedRanges.forEach(removedRange => {
          updatedMatrix = updatedMatrix.filter(entry => entry.distanceRange !== removedRange.label);
        });

        return updatedMatrix;
      });
    }

    setEditingRange(null);

    // Show detailed success message
    const affectedCount = type === 'weight'
      ? weightRanges.length - weightRanges.findIndex(r => r.id === rangeId) - 1
      : distanceRanges.length - distanceRanges.findIndex(r => r.id === rangeId) - 1;

    if (affectedCount > 0) {
      toast.success(`Range updated successfully! ${affectedCount} subsequent range(s) have been automatically adjusted.`);
    } else {
      toast.success('Range updated successfully!');
    }
  };


  // Initialize matrix when component mounts
  React.useEffect(() => {
    if (distanceWeightMatrix.length === 0) {
      initializeMatrix();
    }
  }, []);

  const steps = ['Distance-Weight Matrix', 'Upload Sheet'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/zone-price-matrix')}
            className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Zone Price Matrix
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold text-center text-slate-900 tracking-tight">
            Add New Transporter
          </h1>
          <p className="mt-2 text-center text-lg text-slate-600">
            Follow the steps below to onboard a new service provider.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <StepIndicator currentStep={currentStep} steps={steps} />
            </div>

            <div className="mt-12 px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: currentStep === 0 ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: currentStep === 0 ? -50 : 50 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {currentStep === 0 ? (
                    <div className="space-y-6">
                      {/* Distance-Weight Matrix */}
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                          <Route className="h-5 w-5" />
                          Distance-Weight Pricing Matrix
                        </h3>
                        <p className="text-sm text-blue-700 mb-6">
                          Set pricing for different weight and distance combinations.
                        </p>

                        {/* Range Management */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Weight Ranges */}
                          <div className="bg-white rounded-lg border border-blue-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-800">Weight Ranges (kg)</h4>
                              </div>
                              <button
                                onClick={addWeightRange}
                                disabled={weightRanges[weightRanges.length - 1]?.max >= 10000}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                              >
                                <Plus size={14} />
                                Add
                              </button>
                            </div>
                            <div className="space-y-2">
                              {weightRanges.map(range => (
                                <div key={range.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                  {editingRange?.type === 'weight' && editingRange.range.id === range.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="number"
                                        defaultValue={range.min}
                                        className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
                                        placeholder="Min"
                                      />
                                      <span className="text-slate-500">-</span>
                                      <input
                                        type="number"
                                        defaultValue={range.max}
                                        className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
                                        placeholder="Max"
                                      />
                                      <button
                                        onClick={() => {
                                          const minInput = document.querySelector(`input[placeholder="Min"]`) as HTMLInputElement;
                                          const maxInput = document.querySelector(`input[placeholder="Max"]`) as HTMLInputElement;
                                          if (minInput && maxInput) {
                                            const newMin = parseInt(minInput.value);
                                            const newMax = parseInt(maxInput.value);
                                            const newLabel = `${newMin}-${newMax}`;
                                            updateRange('weight', range.id, newLabel, newMin, newMax);
                                          }
                                        }}
                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                        title="This will also update all subsequent weight ranges"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingRange(null)}
                                        className="px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm font-medium">{range.label}</span>
                                      <button
                                        onClick={() => setEditingRange({ type: 'weight', range })}
                                        className="p-1 text-slate-600 hover:text-blue-600"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      {weightRanges.length > 1 && (
                                        <button
                                          onClick={() => removeWeightRange(range.id)}
                                          className="p-1 text-slate-600 hover:text-red-600"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Distance Ranges */}
                          <div className="bg-white rounded-lg border border-blue-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-800">Distance Ranges (km)</h4>
                              </div>
                              <button
                                onClick={addDistanceRange}
                                disabled={distanceRanges[distanceRanges.length - 1]?.max >= 500}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                              >
                                <Plus size={14} />
                                Add
                              </button>
                            </div>
                            <div className="space-y-2">
                              {distanceRanges.map(range => (
                                <div key={range.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                  {editingRange?.type === 'distance' && editingRange.range.id === range.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="number"
                                        defaultValue={range.min}
                                        className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
                                        placeholder="Min"
                                      />
                                      <span className="text-slate-500">-</span>
                                      <input
                                        type="number"
                                        defaultValue={range.max}
                                        className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
                                        placeholder="Max"
                                      />
                                      <button
                                        onClick={() => {
                                          const minInput = document.querySelector(`input[placeholder="Min"]`) as HTMLInputElement;
                                          const maxInput = document.querySelector(`input[placeholder="Max"]`) as HTMLInputElement;
                                          if (minInput && maxInput) {
                                            const newMin = parseInt(minInput.value);
                                            const newMax = parseInt(maxInput.value);
                                            const newLabel = `${newMin}-${newMax}`;
                                            updateRange('distance', range.id, newLabel, newMin, newMax);
                                          }
                                        }}
                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                        title="This will also update all subsequent distance ranges"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingRange(null)}
                                        className="px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm font-medium">{range.label}</span>
                                      <button
                                        onClick={() => setEditingRange({ type: 'distance', range })}
                                        className="p-1 text-slate-600 hover:text-blue-600"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      {distanceRanges.length > 1 && (
                                        <button
                                          onClick={() => removeDistanceRange(range.id)}
                                          className="p-1 text-slate-600 hover:text-red-600"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Matrix Table */}
                        <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Weight (kg)</th>
                                  {distanceRanges.map(distance => (
                                    <th key={distance.id} className="px-4 py-3 text-center font-semibold text-slate-700 min-w-[120px]">
                                      {distance.label} km
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {weightRanges.map(weightRange => (
                                  <tr key={weightRange.id} className="border-b border-slate-100">
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                      {weightRange.label} kg
                                    </td>
                                    {distanceRanges.map(distanceRange => {
                                      const entry = distanceWeightMatrix.find(
                                        e => e.weightRange === weightRange.label && e.distanceRange === distanceRange.label
                                      );
                                      return (
                                        <td key={distanceRange.id} className="px-2 py-3">
                                          <DecimalInput
                                            value={entry?.price ?? null}
                                            onChange={(num) => {
                                              updateMatrixPrice(weightRange.label, distanceRange.label, num);
                                            }}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                                            max={99999.99}
                                            maxDecimals={2}
                                            maxIntegerDigits={5}
                                          />

                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Matrix Summary */}
                        <div className="mt-4 bg-slate-50 rounded-lg p-4">
                          <h4 className="font-semibold text-slate-800 mb-2">Matrix Summary</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">Total Combinations:</span>
                              <span className="ml-2 font-semibold text-slate-800">
                                {weightRanges.length * distanceRanges.length}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">Configured Prices:</span>
                              <span className="ml-2 font-semibold text-slate-800">
                                {distanceWeightMatrix.filter(entry => entry.price !== null).length}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">Remaining:</span>
                              <span className="ml-2 font-semibold text-slate-800">
                                {distanceWeightMatrix.filter(entry => entry.price === null).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4">
                        <button
                          onClick={() => navigate('/zone-price-matrix')}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                        >
                          <ArrowLeft size={18} />Back
                        </button>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Next: Upload Sheet
                        </button>
                      </div>
                    </div>
                  ) : currentStep === 1 ? (
                    <div className="space-y-6">
                      {/* Upload Sheet Section */}
                      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                          <UploadCloud className="h-5 w-5" />
                          Upload ODA Sheet
                        </h3>
                        <p className="text-sm text-green-700 mb-6">
                          Review or update your Out-of-Delivery (ODA) data
                        </p>

                        {/* Download Card */}
                        <div className="bg-white rounded-lg border border-green-200 p-4 mb-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="h-8 w-8 text-green-600" />
                              <div>
                                <h4 className="font-semibold text-slate-800">Get the Current ODA List</h4>
                                <p className="text-sm text-slate-600">
                                  Download the latest ODA CSV (zones & pincodes). Use this file as the formatting reference. Review it, make your changes, and upload the revised CSV.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={downloadTemplate}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <Download size={16} />
                              Download ODA List
                            </button>
                          </div>
                        </div>

                        {/* Info Banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                              <p className="font-medium mb-1">Uploading is optional</p>
                              <p>Download the ODA list to review it. Edit and re-upload if changes are needed. Use the same format for your own list.</p>
                              <p className="mt-2 font-medium">If you do not upload or make any changes, the above will be considered as default.</p>
                            </div>
                          </div>
                        </div>

                        {/* File Upload Area */}
                        <div className="bg-white rounded-lg border border-green-200 p-6">
                          <h4 className="font-semibold text-slate-800 mb-4">Upload your ODA CSV</h4>
                          <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                ? 'border-green-500 bg-green-50'
                                : file
                                  ? 'border-green-400 bg-green-50'
                                  : 'border-slate-300 hover:border-green-400'
                              }`}
                            onDragEnter={handleDragIn}
                            onDragLeave={handleDragOut}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                          >
                            {file ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3">
                                  <FileSpreadsheet className="h-12 w-12 text-green-600" />
                                  <div className="text-left">
                                    <p className="font-semibold text-slate-800">{file.name}</p>
                                    <p className="text-sm text-slate-600">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-3 justify-center">
                                  <button
                                    onClick={handleDeleteFile}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <UploadCloud className="h-12 w-12 text-slate-400 mx-auto" />
                                <div>
                                  <p className="text-lg font-semibold text-slate-700">
                                    {isDragging ? 'Drop your CSV file here' : 'Drag and drop your file here, or click to browse'}
                                  </p>
                                  <p className="text-sm text-slate-500 mt-1">
                                    CSV only
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  accept=".csv"
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  id="file-upload"
                                />
                                <label
                                  htmlFor="file-upload"
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                                >
                                  <UploadCloud size={16} />
                                  Choose File
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Helper Notes */}
                          <div className="mt-4 text-xs text-slate-600 space-y-1">
                            <p>• Use the downloaded ODA list as the source of truth for structure (no separate template needed).</p>
                            <p>• Keep column names and order unchanged to ensure a smooth import.</p>
                          </div>
                        </div>


                        {/* Data Preview */}
                        {uploadedData && (
                          <div className="bg-white rounded-lg border border-green-200 p-6">
                            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                              <MapPin className="h-5 w-5" />
                              Data Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-sm text-slate-600">Total Entries</p>
                                <p className="text-2xl font-bold text-slate-800">{uploadedData.totalEntries - 1}</p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-sm text-green-600">ODA Applicable</p>
                                <p className="text-2xl font-bold text-green-800">{uploadedData.odaEntries}</p>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-sm text-blue-600">ODA Not Applicable</p>
                                <p className="text-2xl font-bold text-blue-800">{uploadedData.regularEntries}</p>
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3">
                                <p className="text-sm text-purple-600">Zones</p>
                                <p className="text-2xl font-bold text-purple-800">{uploadedData.zones.length - 1}</p>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4">
                        <button
                          onClick={() => setCurrentStep(0)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                        >
                          <ArrowLeft size={18} />Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isLoading}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Complete</>}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  );
};

export default ODAUpload;
