// src/pages/BiddingPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Box, Hash, MoveHorizontal, MoveVertical, Calendar, Clock, Send, Loader, ChevronDown, Tag, Rocket, Crown, Star
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

// --- TYPE DEFINITIONS (Unchanged) ---
type Transporter = { _id: string; companyName: string; };
type Bidder = { _id: string; companyName: string; bidAmount: number; rating: number; };
type ActiveBid = { _id: string; origin: string; destination: string; bidEndTime: string; bidders: Bidder[]; };
type FormValues = {
  userId: string;
  weightOfBox: number; noofboxes: number; length: number; width: number; height: number;
  origin: string; destination: string; bidEndTime: string; pickupDate: string; pickupTime: string;
  bidType: 'open' | 'limited' | 'semi-limited'; transporterIds: string[]; transporterRating: number | '';
};

// --- MOCK DATA (Unchanged) ---
const MOCK_ACTIVE_BIDS: ActiveBid[] = [
    { _id: 'bid1', origin: '110001', destination: '400001', bidEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), bidders: [ { _id: 't1', companyName: 'Speedy Logistics', bidAmount: 4500, rating: 4.8 }, { _id: 't2', companyName: 'Reliable Movers', bidAmount: 4550, rating: 4.9 }, { _id: 't3', companyName: 'Quick Transits', bidAmount: 4600, rating: 4.5 }, { _id: 't4', companyName: 'India Freight', bidAmount: 4750, rating: 4.6 }, { _id: 't5', companyName: 'Metro Connect', bidAmount: 4800, rating: 4.7 }, ] },
    { _id: 'bid2', origin: '560038', destination: '600002', bidEndTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), bidders: [ { _id: 't6', companyName: 'Deccan Express', bidAmount: 8200, rating: 4.9 }, { _id: 't7', companyName: 'Southern Carriers', bidAmount: 8350, rating: 4.7 }, { _id: 't1', companyName: 'Speedy Logistics', bidAmount: 8400, rating: 4.8 }, ] },
];

// --- HELPER FUNCTION (Unchanged) ---
const getTimeLeft = (endTime: string) => {
    const total = Date.parse(endTime) - Date.now();
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    if (total < 0) return "Bid Closed";
    return `${days}d ${hours}h ${minutes}m left`;
}

// --- MAIN COMPONENT ---
const BiddingPage: React.FC = () => {
  // --- STATE AND HOOKS (Unchanged) ---
  const { user } = useAuth();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [activeBids, setActiveBids] = useState<ActiveBid[]>([]);
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { userId: user ? (user as any).customer._id : '', bidType: 'open', transporterIds: [], transporterRating: '', weightOfBox: undefined, noofboxes: undefined, length: undefined, width: undefined, height: undefined, origin: '', destination: '', bidEndTime: '', pickupDate: '', pickupTime: '', },
  });
  const bidType = watch('bidType');

  // --- DATA FETCHING (Unchanged) ---
  useEffect(() => {
    const userId = user ? (user as any).customer._id : '';
    const fetchData = async () => {
      await axios.get<{ data: ActiveBid[] }>(`http://localhost:8000/api/bidding/user/${userId}`).then(res => setActiveBids(res.data.data)).catch(err => console.error('Failed to load active bids', err));
    };
    fetchData();
  }, [user]);

  // --- FORM SUBMISSION (Unchanged) ---
  const onSubmit: SubmitHandler<FormValues> = async data => {
    try {``
      const payload = { userId: (user as any).customer._id, weightOfBox: Number(data.weightOfBox), noofboxes: Number(data.noofboxes), length: Number(data.length), width: Number(data.width), height: Number(data.height), origin: data.origin, destination: data.destination, bidEndTime: data.bidEndTime, pickupDate: data.pickupDate, pickupTime: data.pickupTime, bidType: data.bidType, transporterIds: data.bidType === 'semi-limited' ? data.transporterIds : [], transporterRating: data.bidType === 'semi-limited' && data.transporterRating !== '' ? Number(data.transporterRating) : undefined, };
      const response = await axios.post('http://localhost:8000/api/bidding/addbid', payload);
      if (response.data.success) {
        toast.success('Bidding created successfully!');
      }
    } catch (err: any) { console.error(err); alert('Failed to create bidding'); }
  };
  
  // --- Reusable Form Input Component, styled to your app's theme ---
  const FormInput = ({ id, label, type, register, errors, icon: Icon, ...props }: any) => (
      <div className="relative">
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
          <div className="relative">
            <input
              id={id}
              type={type}
              className="pl-4 pr-10 py-2.5 block w-full bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder-slate-400"
              {...register}
              {...props}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Icon className="h-5 w-5 text-slate-400" />
            </span>
          </div>
          {errors[id] && <p className="text-red-500 text-xs mt-1 ml-1">{errors[id].message}</p>}
      </div>
  );

  const getBiddingDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/bidding/details/${expandedBidId}`);
      console.log(response.data);
    } catch (error) {
      console.error('Failed to fetch bidding details', error);
      return null;
    }
  }

  return (
    // THEME CHANGE: Light background, base text color for your app's theme
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
        <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        
            {/* LEFT PANEL: ACTIVE BIDS */}
            <motion.div
                className="lg:col-span-5"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {/* THEME CHANGE: White panel with a soft shadow */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 h-full">
                    <div className="flex items-center gap-4 mb-6">
                       {/* THEME CHANGE: Icon wrapper now has indigo accent */}
                       <div className="bg-indigo-100 p-2 rounded-lg">
                           <Rocket className="w-8 h-8 text-indigo-600" />
                       </div>
                       <div>
                          <h1 className="text-2xl font-bold text-slate-900">Your Active Bids</h1>
                          <p className="text-sm text-slate-500">Track ongoing bids and top contenders</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                        {activeBids.map((bid) => (
                           <div key={bid._id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                               <button 
                                 className="w-full text-left p-4 hover:bg-slate-50 transition-colors duration-200 flex justify-between items-center"
                                 onClick={() => setExpandedBidId(expandedBidId === bid._id ? null : bid._id)}
                               >
                                    <div>
                                       <div className="flex items-center gap-2 text-lg font-semibold">
                                          {/* THEME CHANGE: MapPin icon is now indigo */}
                                          <MapPin className="w-5 h-5 text-indigo-600" />
                                          <span className="text-slate-800">{bid.origin}</span>
                                          <MoveHorizontal className="w-4 h-4 text-slate-400" />
                                          <span className="text-slate-800">{bid.destination}</span>
                                       </div>
                                       <div className="text-sm text-slate-500 mt-1">{getTimeLeft(bid.bidEndTime)}</div>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: expandedBidId === bid._id ? -180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                       <ChevronDown className="w-6 h-6 text-slate-400"/>
                                    </motion.div>
                               </button>
                               <AnimatePresence>
                               {expandedBidId === bid._id && (
                                   <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="border-t border-slate-200"
                                   >
                                      <div className="p-4 bg-slate-50">
                                         {/* THEME CHANGE: Header text is indigo */}
                                         <h3 className="font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                                             <Crown className="w-5 h-5"/> Top 5 Lowest Bidders
                                         </h3>
                                         {bid.bidders.length > 0 ? (
                                           <ol className="space-y-3 text-sm">
                                            {bid.bidders.slice(0, 5).map((bidder, i) => (
                                                <li key={bidder._id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-md">
                                                   <div className="flex items-center gap-3">
                                                      <span className={clsx("font-bold", i === 0 && "text-amber-500", i === 1 && "text-slate-500", i === 2 && "text-orange-500", )}>#{i + 1}</span>
                                                      <span className="text-slate-700">{bidder.companyName}</span>
                                                      <div className="flex items-center gap-1 text-yellow-500/80"> <Star className="w-4 h-4" fill="currentColor"/> {bidder.rating.toFixed(1)} </div>
                                                   </div>
                                                    {/* THEME CHANGE: Price text is indigo */}
                                                   <span className="font-mono font-semibold text-indigo-600">₹{bidder.bidAmount.toLocaleString('en-IN')}</span>
                                                </li>
                                            ))}
                                           </ol>
                                         ) : ( <p className="text-slate-500 text-center py-4">No bids placed yet.</p> )}
                                      </div>
                                   </motion.div>
                               )}
                               </AnimatePresence>
                           </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* RIGHT PANEL: CREATE NEW BID */}
            <motion.div
                className="lg:col-span-7"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                 <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-8">
                     <div className="flex items-center gap-4 mb-8">
                       <div className="bg-indigo-100 p-2 rounded-lg">
                           <Tag className="w-8 h-8 text-indigo-600" />
                       </div>
                       <div>
                           <h1 className="text-2xl font-bold text-slate-900">Create New Bid</h1>
                           <p className="text-sm text-slate-500">Fill in the details to start a new bidding process</p>
                       </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        
                        {/* Section: Parcel Details */}
                        <div className="space-y-4">
                           {/* THEME CHANGE: Section header is indigo */}
                           <h3 className="font-semibold text-lg text-indigo-600 border-b border-indigo-200 pb-2">Parcel Details</h3>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                               <FormInput id="weightOfBox" label="Weight (kg)" type="number" icon={Box} register={register('weightOfBox', { required: 'Weight is required', valueAsNumber: true, min: {value: 0.01, message: "Must be > 0"} })} errors={errors} />
                               <FormInput id="noofboxes" label="No. of Boxes" type="number" icon={Hash} register={register('noofboxes', { required: 'No. of boxes required', valueAsNumber: true, min: {value: 1, message: "Must be > 0"} })} errors={errors} />
                               <FormInput id="length" label="Length (cm)" type="number" icon={MoveHorizontal} register={register('length', { valueAsNumber: true })} errors={errors} />
                               <FormInput id="width" label="Width (cm)" type="number" icon={MoveHorizontal} register={register('width', { valueAsNumber: true })} errors={errors} />
                               <FormInput id="height" label="Height (cm)" type="number" icon={MoveVertical} register={register('height', { valueAsNumber: true })} errors={errors} />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="font-semibold text-lg text-indigo-600 border-b border-indigo-200 pb-2">Route & Schedule</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <FormInput id="origin" label="Origin Pincode" type="text" maxLength={6} icon={MapPin} register={register('origin', { required: 'Origin is required', pattern: { value: /^\d{6}$/, message: 'Must be 6 digits' } })} errors={errors} />
                              <FormInput id="destination" label="Destination Pincode" type="text" maxLength={6} icon={MapPin} register={register('destination', { required: 'Destination is required', pattern: { value: /^\d{6}$/, message: 'Must be 6 digits' } })} errors={errors} />
                              <FormInput id="bidEndTime" label="Bid End Time" type="datetime-local" icon={Clock} register={register('bidEndTime', { required: 'End time is required' })} errors={errors} />
                              <FormInput id="pickupDate" label="Pickup Date" type="date" icon={Calendar} register={register('pickupDate', { required: 'Pickup date is required' })} errors={errors} />
                              <div className="md:col-span-2">
                                <FormInput id="pickupTime" label="Pickup Time" type="time" icon={Clock} register={register('pickupTime', { required: 'Pickup time is required' })} errors={errors} />
                              </div>
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <h3 className="font-semibold text-lg text-indigo-600 border-b border-indigo-200 pb-2">Bid Configuration</h3>
                            <Controller name="bidType" control={control} render={({ field }) => (
                                // THEME CHANGE: Toggle button now matches your theme's style
                                <div className="flex gap-2 rounded-lg bg-slate-100 p-1 mt-2">
                                    {(['open', 'limited', 'semi-limited'] as FormValues['bidType'][]).map(type => (
                                      <button key={type} type="button" onClick={() => field.onChange(type)}
                                        className={clsx(
                                            "w-full rounded-lg py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-indigo-500",
                                            field.value === type ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-300 text-slate-500 hover:bg-slate-200'
                                        )}>
                                       {type.charAt(0).toUpperCase() + type.slice(1).replace('-', '‑')}
                                      </button>
                                    ))}
                                </div>
                            )}/>
                        </div>
                        
                        <AnimatePresence>
                        {bidType === 'semi-limited' && (
                             <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.4, ease: 'easeInOut' }} className="overflow-hidden">
                               <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                   <div>
                                       <label htmlFor="transporterIds" className="block text-sm font-medium text-slate-700 mb-1">Select Transporters</label>
                                       <select id="transporterIds" multiple {...register('transporterIds')} className="block w-full bg-white border-slate-300 rounded-lg p-2 h-36 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800">
                                           {transporters.map(t => (<option key={t._id} value={t._id} className="p-2 bg-white">{t.companyName}</option>))}
                                       </select>
                                   </div>
                                    <FormInput id="transporterRating" label="Minimum Transporter Rating (1-5)" type="number" step="0.1" icon={Star} register={register('transporterRating', { valueAsNumber: true, min: { value: 1, message: 'min 1' }, max: { value: 5, message: 'max 5' } })} errors={errors} />
                               </div>
                           </motion.div>
                        )}
                        </AnimatePresence>

                        {/* THEME CHANGE: Main button is solid indigo to match your app */}
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl shadow-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? ( <><Loader className="animate-spin w-5 h-5"/> Creating Bid...</> ) : ( <><Send className="w-5 h-5"/> Launch Bidding</> )}
                        </motion.button>
                    </form>
                 </div>
            </motion.div>
        </main>
    </div>
  );
};

export default BiddingPage;