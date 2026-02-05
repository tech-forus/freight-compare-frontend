import React, { useState } from "react";
import SignupForm from "../components/SignupForm";
import OTPVerification from "../components/OTPVerification";

const SignUpPage = () => {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {!email ? (
        <SignupForm onOTPSent={(email: string) => setEmail(email)} />
      ) : (
        <OTPVerification email={email} />
      )}
    </div>
  );
};

export default SignUpPage;
