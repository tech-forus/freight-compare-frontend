import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from '../config/api';

interface OTPProps {
  email: string;
}

const OTPVerification: React.FC<OTPProps> = ({ email }) => {
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await axios.post(`${API_BASE_URL}/api/auth/signup/verify`, {
        email,
        emailOtp,
        phoneOtp,
      });
      setMessage(res.data.message || "Verified successfully.");
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Verify OTPs</h2>
      <input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} placeholder="Email OTP" className="input" />
      <input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="Phone OTP" className="input" />
      <button onClick={handleVerify} disabled={verifying} className="btn w-full">
        {verifying ? "Verifying..." : "Verify & Register"}
      </button>
      {message && <p className="text-sm text-center text-green-600">{message}</p>}
    </div>
  );
};

export default OTPVerification;
