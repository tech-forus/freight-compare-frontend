import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';
import { Plus, Trash2, Save, X } from 'lucide-react';

interface DistancePricing {
    _id?: string;
    distanceRange: {
        min: number;
        max: number;
    };
    price: number;
}

interface IndiaPostPricing {
    _id: string;
    weightRange: {
        min: number;
        max: number;
    };
    pricing: DistancePricing[];
}

const IndiaPostAdminPage: React.FC = () => {
    const [pricings, setPricings] = useState<IndiaPostPricing[]>([]);
    const [loading, setLoading] = useState(true);

    // New Slabs form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newWeightMin, setNewWeightMin] = useState<number>(0);
    const [newWeightMax, setNewWeightMax] = useState<number>(5);
    const [newDistances, setNewDistances] = useState<DistancePricing[]>([
        { distanceRange: { min: 0, max: 200 }, price: 0 }
    ]);

    const fetchPricings = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/indiapost/admin/all');
            if (res.data.success) {
                setPricings(res.data.data);
            }
        } catch (error: any) {
            toast.error('Failed to fetch IndiaPost pricing: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPricings();
    }, []);

    const handleAddDistance = () => {
        setNewDistances([
            ...newDistances,
            { distanceRange: { min: 0, max: 0 }, price: 0 }
        ]);
    };

    const handleRemoveDistance = (index: number) => {
        setNewDistances(newDistances.filter((_, i) => i !== index));
    };

    const handleDistanceChange = (index: number, field: string, value: number) => {
        const updated = [...newDistances];
        if (field === 'min') updated[index].distanceRange.min = value;
        if (field === 'max') updated[index].distanceRange.max = value;
        if (field === 'price') updated[index].price = value;
        setNewDistances(updated);
    };

    const handleSaveSlab = async () => {
        if (newWeightMin >= newWeightMax) {
            toast.error('Weight Max must be greater than Weight Min');
            return;
        }
        if (newDistances.length === 0) {
            toast.error('Add at least one distance pricing');
            return;
        }

        try {
            const payload = {
                weightRange: { min: newWeightMin, max: newWeightMax },
                pricing: newDistances
            };

            const res = await axios.post('/api/indiapost/admin/add', payload);
            if (res.data.success) {
                toast.success('Pricing slab added successfully!');
                setShowAddForm(false);
                setNewWeightMin(0);
                setNewWeightMax(5);
                setNewDistances([{ distanceRange: { min: 0, max: 200 }, price: 0 }]);
                fetchPricings();
            }
        } catch (error: any) {
            toast.error('Failed to add slab: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteSlab = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this pricing slab?')) return;
        try {
            const res = await axios.delete(`/api/indiapost/admin/${id}`);
            if (res.data.success) {
                toast.success('Pricing slab deleted');
                fetchPricings();
            }
        } catch (error: any) {
            toast.error('Failed to delete slab: ' + error.message);
        }
    };

    return (
        <AdminLayout
            title="IndiaPost Pricing Configuration"
            subtitle="Manage weight and distance brackets for IndiaPost Freight Calculator"
        >
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Current Pricing Slabs</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'Cancel' : 'Add New Bracket'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm mb-8">
                    <h3 className="text-lg font-medium text-slate-800 mb-4">Add New Weight Bracket</h3>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight Min (kg)</label>
                            <input
                                type="number"
                                value={newWeightMin}
                                onChange={(e) => setNewWeightMin(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight Max (kg)</label>
                            <input
                                type="number"
                                value={newWeightMax}
                                onChange={(e) => setNewWeightMax(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <h4 className="text-md font-medium text-slate-700 mb-2">Distance Pricing Tiers</h4>
                        {newDistances.map((dist, idx) => (
                            <div key={idx} className="flex gap-4 items-end mb-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Distance Min (km)</label>
                                    <input
                                        type="number"
                                        value={dist.distanceRange.min}
                                        onChange={(e) => handleDistanceChange(idx, 'min', Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Distance Max (km)</label>
                                    <input
                                        type="number"
                                        value={dist.distanceRange.max}
                                        onChange={(e) => handleDistanceChange(idx, 'max', Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        value={dist.price}
                                        onChange={(e) => handleDistanceChange(idx, 'price', Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemoveDistance(idx)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-1"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={handleAddDistance}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Distance Tier
                        </button>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSaveSlab}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Save className="w-4 h-4" /> Save Pricing Bracket
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-10 text-slate-500">Loading pricing data...</div>
            ) : pricings.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-600">No IndiaPost pricing brackets configured yet.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {pricings.map((slab) => (
                        <div key={slab._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-semibold text-lg text-slate-800">
                                    Weight Bracket: {slab.weightRange.min} kg - {slab.weightRange.max} kg
                                </h3>
                                <button
                                    onClick={() => handleDeleteSlab(slab._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                    title="Delete entire bracket"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-600 text-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-medium border-b">Distance Min (km)</th>
                                            <th className="px-6 py-3 font-medium border-b">Distance Max (km)</th>
                                            <th className="px-6 py-3 font-medium border-b">Price (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {slab.pricing.map((dist, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 text-slate-700">{dist.distanceRange.min}</td>
                                                <td className="px-6 py-3 text-slate-700">{dist.distanceRange.max}</td>
                                                <td className="px-6 py-3 text-slate-700 font-medium">₹{dist.price}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
};

export default IndiaPostAdminPage;
