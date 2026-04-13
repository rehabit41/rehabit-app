import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a recovery session in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "recovery") {
      setReady(true);
    }

    // Also listen for auth events — Supabase auto-sets session from hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password || !confirm) {
      toast.error("Please fill in both fields");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/password-changed", { replace: true });
    }
  };

  if (!ready) {
    return (
      <div className="h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <AmbientGlow />
        <div className="relative z-10 text-center px-6">
          <h1 className="font-heading text-xl font-bold text-foreground text-glow mb-3">Invalid Reset Link</h1>
          <p className="text-muted-foreground font-body text-sm mb-6">
            This link is invalid or has expired. Please request a new password reset.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="py-3 px-8 rounded-full bg-foreground font-heading text-sm text-background hover:opacity-90 transition-opacity"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

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

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow mb-3">Create new password</h1>
        <p className="text-muted-foreground font-body text-sm mb-8">
          Your new password must be different from previously used passwords.
        </p>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReset()}
          className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full py-4 rounded-full bg-foreground font-heading text-base text-background mt-8 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
