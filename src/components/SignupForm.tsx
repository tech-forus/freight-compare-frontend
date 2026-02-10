import React, { useState, useRef, useEffect } from "react";
import { useForm, UseFormRegister, FieldErrors, Controller, Control, Path } from "react-hook-form";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Lock, Building, Hash, MapPin, Briefcase, BarChart,
  Package, HeartHandshake, Globe, Users, Truck, ChevronDown, Check,
  ArrowRight, CheckCircle, ShieldCheck, ArrowLeft, Loader2,
  Weight, Maximize
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PincodeAutocomplete from "./PincodeAutocomplete";
import { API_BASE_URL } from '../config/api';

// -----------------------------------------------------------------------------
// Limits
// -----------------------------------------------------------------------------
const MAX_LOAD_KG = 40_000;  // 40 tons
const MAX_LENGTH_CM = 1500;
const MAX_WIDTH_CM = 300;
const MAX_HEIGHT_CM = 300;

// --- Form Type Definitions ---
type FormValues = {
  firstName: string; lastName: string; email: string; phone: string; password: string;
  companyName: string; gstNumber: string; businessType: string; monthlyOrder: string;
  address: string; state: string; pincode: string;
  deliveryMode: string; typeOfLoad: string; handlingCare: string;
  typeOfCustomers: string;
  emailOtp: string; contactNoOtp: string;
  sameAsPhone: boolean;
  whatsapp: string;
  maxLoadInDispatch: string;
  maxLength: string;
  maxWidth: string;
  maxHeight: string;
  customerNetwork: string;
};

// --- Reusable Input Field ---
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: Path<FormValues>;
  label: string;
  icon: React.ReactNode;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  validation?: object;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, icon, register, errors, validation, ...props }) => {
  const hasError = !!errors[id];
  const errorMessage = errors[id]?.message;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">
          {icon}
        </span>
        <input
          {...register(id, {
            ...(props.required && { required: `${label} is required.` }),
            ...validation
          })}
          id={id}
          {...props}
          className={`w-full pl-10 pr-3 py-2.5 border rounded-md transition-colors duration-300 
            bg-slate-50 text-slate-800 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${hasError ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-indigo-500"}
            ${props.disabled ? 'cursor-not-allowed bg-slate-200' : ''}`}
        />
      </div>
      {hasError && <p className="mt-1 text-xs text-red-600">{(errorMessage as any)?.toString()}</p>}
    </div>
  );
};

// --- Single-Select Dropdown ---
interface SingleSelectFieldProps {
  id: Path<FormValues>;
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
  control: Control<FormValues>;
  required?: boolean;
}

const SingleSelectField: React.FC<SingleSelectFieldProps> = ({ id, label, icon, options, control, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Controller
      name={id}
      control={control}
      rules={{ validate: (value) => !required || (typeof value === "string" && value.length > 0) || `${label} is required.` }}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const handleSelectOption = (optionValue: string) => {
          onChange(optionValue);
          setIsOpen(false);
        };
        const selectedLabel = options.find(o => o.value === value)?.label;

        return (
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10">{icon}</span>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-md transition-colors duration-300 bg-slate-50 text-left focus:outline-none focus:ring-2 focus:ring-offset-1 ${error ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-indigo-500"}`}
              >
                <span className={selectedLabel ? 'text-slate-800' : 'text-slate-400'}>
                  {selectedLabel || 'Select an option...'}
                </span>
              </button>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none">
                <ChevronDown size={20} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </span>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-auto">
                  {options.map(option => (
                    <li key={option.value} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between group" onClick={() => handleSelectOption(option.value)}>
                      <span className="text-sm text-slate-700">{option.label}</span>
                      {value === option.value && <Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
          </div>
        );
      }}
    />
  );
};

// --- Step Indicator ---
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <nav aria-label="Progress">
    <ol role="list" className="flex items-center">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <li className="relative md:flex-1">
            <div
              className={`flex h-10 w-10 mx-auto items-center justify-center rounded-full font-bold transition-all duration-300
                ${currentStep > index ? 'bg-emerald-600 text-white' : ''}
                ${currentStep === index ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : ''}
                ${currentStep < index ? 'bg-slate-200 text-slate-500' : ''}`}
            >
              {currentStep > index ? <CheckCircle className="h-6 w-6" /> : <span>{index + 1}</span>}
            </div>
            <p className={`absolute -bottom-7 w-max text-center text-xs font-semibold left-1/2 -translate-x-1/2 transition-colors duration-300
              ${currentStep >= index ? 'text-slate-800' : 'text-slate-400'}`}
            >
              {step}
            </p>
          </li>
          {index < steps.length - 1 && (
            <div className={`flex-auto border-t-2 transition-colors duration-300
                ${currentStep > index ? 'border-emerald-600' : 'border-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </ol>
  </nav>
);

// --- Steps ---
const stepConfig: { name: string; title: string; subtitle: string; fields: Path<FormValues>[] }[] = [
  { name: "Account", title: "Create Your Account", subtitle: "Let's get started with the basics.", fields: ["firstName", "lastName", "email", "phone", "password", "whatsapp"] },
  { name: "Business", title: "Business Details", subtitle: "Tell us more about your company.", fields: ["companyName", "gstNumber", "businessType", "address", "state", "pincode", "monthlyOrder"] },
  { name: "Logistics", title: "Logistics Profile", subtitle: "Select the options that fit your needs.", fields: ["deliveryMode", "typeOfLoad", "handlingCare", "typeOfCustomers"] },
  { name: "Specifications", title: "Package Specifications", subtitle: "Provide details about your typical shipment.", fields: ["maxLoadInDispatch", "maxLength", "maxWidth", "maxHeight", "customerNetwork"] },
  { name: "Verification", title: "Verify Your Identity", subtitle: "Enter the OTP sent to your email and phone.", fields: ["emailOtp", "contactNoOtp"] },
];

const stepNames = stepConfig.map(step => step.name);

// --- Dropdown Options ---
const businessTypeOptions = [
  { value: 'retailer', label: 'Retailer' }, { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'franchise', label: 'Franchise' }, { value: 'co-loader', label: 'Co-loader' },
  { value: 'brand', label: 'Brand' }, { value: 'enterprise', label: 'Enterprise' }
];
const deliveryModeOptions = [{ value: 'road', label: 'Road' }, { value: 'air', label: 'Air' }, { value: 'rail', label: 'Rail' }];
const typeOfLoadOptions = [{ value: 'heavy', label: 'Heavy Goods' }, { value: 'volumetric', label: 'Volumetric' }];
const handlingCareOptions = [{ value: 'normal', label: 'Normal' }, { value: 'extra_care', label: 'Fragile / Extra Care' }];
const customerNetworkOptions = [{ value: 'domestic', label: 'Domestic' }, { value: 'international', label: 'International' }];
const typeOfCustomersOptions = [{ value: 'b2c', label: 'Business-to-Consumer (B2C)' }, { value: 'b2b', label: 'Business-to-Business (B2B)' }];

// --- Main ---
interface SignupFormProps {
  isModal?: boolean;
}

const SignupForm: React.FC<SignupFormProps> = ({ isModal = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, trigger, getValues, control, watch, setValue, clearErrors } = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", password: "",
      companyName: "", gstNumber: "", businessType: "", monthlyOrder: "",
      address: "", state: "", pincode: "",
      deliveryMode: "", typeOfLoad: "", handlingCare: "", customerNetwork: "", typeOfCustomers: "",
      emailOtp: "", contactNoOtp: "",
      sameAsPhone: false,
      whatsapp: "",
      maxLoadInDispatch: "",
      maxLength: "",
      maxWidth: "",
      maxHeight: "",
    }
  });

  const phoneValue = watch("phone");
  const sameAsPhone = watch("sameAsPhone");

  // Pincode validity (from autocomplete)
  const [isPincodeValid, setIsPincodeValid] = useState<boolean | null>(null);

  // Caps check
  const [wLoad, wLen, wWid, wHei] = watch([
    "maxLoadInDispatch",
    "maxLength",
    "maxWidth",
    "maxHeight",
  ]);

  const specsOverCaps =
    (!!wLoad && Number(wLoad) > MAX_LOAD_KG) ||
    (!!wLen && Number(wLen) > MAX_LENGTH_CM) ||
    (!!wWid && Number(wWid) > MAX_WIDTH_CM) ||
    (!!wHei && Number(wHei) > MAX_HEIGHT_CM);

  useEffect(() => {
    if (sameAsPhone) {
      setValue("whatsapp", phoneValue);
      clearErrors("whatsapp");
    }
  }, [sameAsPhone, phoneValue, setValue, clearErrors]);

  const navigate = useNavigate();

  const formVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -50 } };

  // ---- helpers to force digits-only + max length (DOM-level) ----
  const digitsOnlyKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };
  const enforceDigits10: React.FormEventHandler<HTMLInputElement> = (e) => {
    const t = e.currentTarget;
    const cleaned = (t.value || "").replace(/\D/g, "").slice(0, 10);
    if (t.value !== cleaned) t.value = cleaned;
  };

  const handleNextStep = async () => {
    const fieldsToValidate = stepConfig[currentStep].fields;
    const isValid = await trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    // Extra guard for Business step: pincode must be OK
    if (currentStep === 1) {
      const pin = (getValues("pincode") || "").trim();
      if (!/^\d{6}$/.test(pin) || isPincodeValid === false) {
        toast.error("Please select a valid 6-digit pincode from the list.");
        return;
      }
    }

    if (currentStep === 3) {
      await handleSendOtps();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => setCurrentStep(prev => prev - 1);

  const handleSendOtps = async () => {
    setLoading(true);
    toast.loading("Sending verification codes...");
    try {
      const values = getValues();
      // Use centralized API configuration
      await axios.post(`${API_BASE_URL}/api/auth/signup/initiate`, values);
      toast.dismiss();
      toast.success("Verification codes sent!");
      setCurrentStep(4);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.response?.data?.message || "Failed to send OTPs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    // Only validate email OTP since SMS is not implemented
    const isValid = await trigger(["emailOtp"]);
    if (!isValid) return;

    setLoading(true);
    try {
      const { email, emailOtp } = getValues();
      // Use centralized API configuration
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/signup/verify`, {
        email,
        emailOtp,
        phoneOtp: emailOtp // Send same OTP for phone (backend doesn't check it anyway)
      });
      toast.success(data.message || "Signup successful!");
      setIsSuccess(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Verification failed. Please check your OTPs.");
    } finally {
      setLoading(false);
    }
  };

  const stopInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField id="firstName" label="First Name" icon={<User size={18} />} register={register} errors={errors} required />
              <InputField id="lastName" label="Last Name" icon={<User size={18} />} register={register} errors={errors} required />
            </div>

            <InputField id="email" label="Email Address" icon={<Mail size={18} />} type="email" register={register} errors={errors} required />

            {/* PHONE: digits only, max 10 */}
            <InputField
              id="phone"
              label="Phone Number"
              icon={<Phone size={18} />}
              register={register}
              errors={errors}
              required
              type="tel"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
              onKeyDown={digitsOnlyKeyDown}
              onInput={enforceDigits10}
              validation={{
                required: "Phone number is required.",
                pattern: {
                  value: /^\d{10}$/,
                  message: "Phone number must be exactly 10 digits.",
                },
                // sanitize what goes into RHF state
                setValueAs: (v: any) => String(v ?? "").replace(/\D/g, "").slice(0, 10),
              }}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sameAsPhone"
                {...register("sameAsPhone")}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="sameAsPhone" className="text-sm text-slate-700">
                Same as phone number
              </label>
            </div>

            {/* WHATSAPP: mirror same behavior */}
            <InputField
              id="whatsapp"
              label="WhatsApp Number"
              icon={<Phone size={18} />}
              register={register}
              errors={errors}
              required={!sameAsPhone}
              type="tel"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel-national"
              disabled={sameAsPhone}
              onKeyDown={digitsOnlyKeyDown}
              onInput={enforceDigits10}
              validation={{
                ...(sameAsPhone ? {} : {
                  pattern: {
                    value: /^\d{10}$/,
                    message: "WhatsApp number must be exactly 10 digits.",
                  }
                }),
                setValueAs: (v: any) => String(v ?? "").replace(/\D/g, "").slice(0, 10),
              }}
            />

            <InputField id="password" label="Password" icon={<Lock size={18} />} type="password" register={register} errors={errors} required validation={{ minLength: { value: 8, message: "Password must be at least 8 characters long." } }} />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <InputField id="companyName" label="Company Name" icon={<Building size={18} />} register={register} errors={errors} required />
            <InputField id="gstNumber" label="GST Number" icon={<Hash size={18} />} register={register} errors={errors} required />
            <SingleSelectField id="businessType" label="Business Type" icon={<Briefcase size={18} />} options={businessTypeOptions} control={control} required />
            <InputField id="address" label="Company Address" icon={<MapPin size={18} />} register={register} errors={errors} required />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField id="state" label="State" icon={<MapPin size={18} />} register={register} errors={errors} required />

              <Controller
                name="pincode"
                control={control}
                rules={{
                  required: "Pincode is required.",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Pincode must be exactly 6 digits."
                  }
                }}
                render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                  <PincodeAutocomplete
                    label="Pincode"
                    id="pincode"
                    value={value || ""}
                    placeholder="Enter 6-digit pincode"
                    error={error?.message}
                    onChange={(v) => onChange(v)}
                    onBlur={onBlur}
                    onValidationChange={(ok) => setIsPincodeValid(ok)}
                    onSelect={(s) => {
                      onChange(s.pincode);
                      setValue("state", s.state || "", { shouldValidate: true });
                    }}
                  />
                )}
              />
            </div>

            <InputField id="monthlyOrder" label="Approx. Monthly Orders" icon={<BarChart size={18} />} type="number" register={register} errors={errors} required />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <SingleSelectField id="deliveryMode" label="Primary Delivery Mode" icon={<Truck size={18} />} options={deliveryModeOptions} control={control} required />
            <SingleSelectField id="typeOfLoad" label="Common Type of Load" icon={<Package size={18} />} options={typeOfLoadOptions} control={control} required />
            <SingleSelectField id="handlingCare" label="Special Handling Need" icon={<HeartHandshake size={18} />} options={handlingCareOptions} control={control} required />
            <SingleSelectField id="typeOfCustomers" label="Type of Customer" icon={<Users size={18} />} options={typeOfCustomersOptions} control={control} required />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <InputField
              id="maxLoadInDispatch"
              label="Max Load (in kg)"
              icon={<Weight size={18} />}
              type="number"
              register={register}
              errors={errors}
              required
              max={MAX_LOAD_KG}
              min={1}
              step="1"
              inputMode="numeric"
              onKeyDown={stopInvalidKeys}
              validation={{
                min: { value: 1, message: "Max Load must be greater than 0." },
                validate: (v: string) => {
                  const n = Number(v);
                  if (Number.isNaN(n)) return "Enter a valid number.";
                  if (n > MAX_LOAD_KG) return `Maximum allowed is ${MAX_LOAD_KG.toLocaleString()} kg (40 tons).`;
                  return true;
                }
              }}
            />

            <p className="text-sm text-slate-700 font-medium pt-2 -mb-2">Max Package Dimensions (in cm)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                id="maxLength"
                label="Length"
                icon={<Maximize size={18} />}
                type="number"
                register={register}
                errors={errors}
                required
                max={MAX_LENGTH_CM}
                min={1}
                step="1"
                inputMode="numeric"
                onKeyDown={stopInvalidKeys}
                validation={{
                  min: { value: 1, message: "Length must be greater than 0." },
                  validate: (v: string) => {
                    const n = Number(v);
                    if (Number.isNaN(n)) return "Enter a valid number.";
                    if (n > MAX_LENGTH_CM) return `Max length is ${MAX_LENGTH_CM} cm.`;
                    return true;
                  }
                }}
              />

              <InputField
                id="maxWidth"
                label="Width"
                icon={<Maximize size={18} />}
                type="number"
                register={register}
                errors={errors}
                required
                max={MAX_WIDTH_CM}
                min={1}
                step="1"
                inputMode="numeric"
                onKeyDown={stopInvalidKeys}
                validation={{
                  min: { value: 1, message: "Width must be greater than 0." },
                  validate: (v: string) => {
                    const n = Number(v);
                    if (Number.isNaN(n)) return "Enter a valid number.";
                    if (n > MAX_WIDTH_CM) return `Max width is ${MAX_WIDTH_CM} cm.`;
                    return true;
                  }
                }}
              />

              <InputField
                id="maxHeight"
                label="Height"
                icon={<Maximize size={18} />}
                type="number"
                register={register}
                errors={errors}
                required
                max={MAX_HEIGHT_CM}
                min={1}
                step="1"
                inputMode="numeric"
                onKeyDown={stopInvalidKeys}
                validation={{
                  min: { value: 1, message: "Height must be greater than 0." },
                  validate: (v: string) => {
                    const n = Number(v);
                    if (Number.isNaN(n)) return "Enter a valid number.";
                    if (n > MAX_HEIGHT_CM) return `Max height is ${MAX_HEIGHT_CM} cm.`;
                    return true;
                  }
                }}
              />
            </div>

            {specsOverCaps && (
              <p className="text-sm text-red-600">
                Caps: Max load 40,000 kg; Length ≤ 1500 cm; Width ≤ 300 cm; Height ≤ 300 cm.
                Please correct the highlighted fields to continue.
              </p>
            )}

            <SingleSelectField
              id="customerNetwork"
              label="Customer Network"
              icon={<Globe size={18} />}
              options={customerNetworkOptions}
              control={control}
              required
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 text-center">
            <p className="text-slate-600">A one-time password has been sent to your registered email address.</p>
            <InputField id="emailOtp" label="Email OTP" icon={<Lock size={18} />} register={register} errors={errors} required />
            <InputField id="contactNoOtp" label="Phone OTP (Optional)" icon={<Lock size={18} />} register={register} errors={errors} />
            <p className="text-xs text-slate-500 mt-2">Note: SMS verification is currently not available. Only email OTP is required to proceed.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSuccess = () => (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <div className="flex justify-center items-center">
        <CheckCircle className="w-20 h-20 text-emerald-500" />
      </div>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">
        Account Created!
      </h2>
      <p className="mt-2 text-lg text-slate-600">
        Welcome aboard! You can now log in to your dashboard.
      </p>
      <button
        onClick={() => navigate('/signin')}
        className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Go to Signin <ArrowRight size={18} />
      </button>
    </motion.div>
  );

  return (
    <div className={isModal ? "p-0" : "min-h-screen bg-slate-50 flex items-center justify-center p-4"}>
      <div className={isModal ? "w-full bg-white" : "grid grid-cols-1 lg:grid-cols-5 w-full max-w-6xl bg-white shadow-2xl rounded-2xl overflow-hidden"}>
        {!isModal && (
          <div className="hidden lg:flex lg:col-span-2 flex-col justify-center p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
            <h1 className="text-4xl font-extrabold tracking-tight">Streamline Your Logistics</h1>
            <p className="mt-4 text-indigo-200">
              Join us to manage your shipments, track orders, and grow your business with our powerful and intuitive platform.
            </p>
            <div className="mt-8 flex space-x-2">
              <span className="w-3 h-3 rounded-full bg-indigo-400"></span>
              <span className="w-3 h-3 rounded-full bg-indigo-300"></span>
              <span className="w-3 h-3 rounded-full bg-indigo-200"></span>
            </div>
          </div>
        )}

        <div className="col-span-1 lg:col-span-3 p-6 md:p-10 flex flex-col">
          {isSuccess ? renderSuccess() : (
            <>
              <div className="mb-12">
                <StepIndicator currentStep={currentStep} steps={stepNames} />
              </div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-800">{stepConfig[currentStep].title}</h2>
                <p className="text-sm text-slate-500 mt-1">{stepConfig[currentStep].subtitle}</p>
              </div>

              <form onSubmit={handleSubmit(handleFinalSubmit)} className="flex-grow flex flex-col">
                <div className="flex-grow">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      variants={formVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      {renderStepContent()}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="mt-10 flex items-center gap-4">
                  <motion.button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 0 || loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </motion.button>

                  {currentStep === stepNames.length - 1 ? (
                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      {loading ? "Verifying..." : "Verify & Create Account"}
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleNextStep}
                      disabled={
                        loading ||
                        (currentStep === 3 && specsOverCaps) ||
                        (currentStep === 1 && (!!errors.pincode || isPincodeValid === false))
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading && currentStep === 3 ? 'Sending OTPs...' : 'Next Step'}
                      {loading && currentStep === 3 ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    </motion.button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
