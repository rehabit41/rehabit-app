import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/+$/, '')}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    }
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-start justify-center">
      <AmbientGlow />
      <div className="relative z-10 w-full max-w-sm px-6 pt-14 flex flex-col items-center">
        <button
          onClick={() => navigate(-1)}
          className="self-start glass w-10 h-10 rounded-full flex items-center justify-center hover:glow-primary transition-all duration-300 mb-8"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow mb-3">Forgot Password?</h1>
        <p className="text-muted-foreground font-body text-sm text-center mb-8 max-w-[90%]">
          {sent
            ? "We've sent a password reset link to your email. Click the link to set a new password."
            : "Don't worry! It occurs. Please enter the email address linked with your account."}
        </p>

        {!sent && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendReset()}
              className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />

            <button
              onClick={handleSendReset}
              disabled={loading}
              className="w-full py-4 rounded-full bg-foreground font-heading text-base text-background mt-8 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        {sent && (
          <button
            onClick={() => setSent(false)}
            className="w-full py-4 rounded-full glass-strong font-heading text-base text-foreground mt-4 hover:glow-primary transition-all duration-300"
          >
            Resend Link
          </button>
        )}

        <p className="text-muted-foreground font-body text-sm mt-8">
          Remember Password?{" "}
          <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
