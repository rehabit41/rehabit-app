import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";

const OTPPage = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 3) refs[index + 1].current?.focus();
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-start justify-center">
      <AmbientGlow />
      <div className="relative z-10 w-full max-w-sm px-6 pt-14 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="self-start glass w-10 h-10 rounded-full flex items-center justify-center hover:glow-primary transition-all duration-300 mb-8"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow mb-3">OTP Verification</h1>
        <p className="text-muted-foreground font-body text-sm mb-8">
          Enter the verification code we sent to your email.
        </p>

        <div className="flex gap-4 justify-center mb-10">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              className="w-14 h-14 rounded-2xl glass-strong bg-transparent text-center font-heading text-xl text-foreground outline-none focus:glow-primary transition-all"
            />
          ))}
        </div>

        <button
          onClick={() => navigate("/reset-password")}
          className="w-full py-4 rounded-full bg-foreground font-heading text-base text-background hover:opacity-90 transition-opacity mb-5"
        >
          Verify
        </button>

        <p className="text-muted-foreground font-body text-sm text-center">
          Didn't receive code?{" "}
          <button className="text-primary hover:text-primary/80 transition-colors">Resend</button>
        </p>
      </div>
    </div>
  );
};

export default OTPPage;
