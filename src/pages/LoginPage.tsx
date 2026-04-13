import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AmbientGlow from "@/components/AmbientGlow";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/auth/index";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import rehabitLogo from "@/assets/rehabit-logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-start justify-center">
      <AmbientGlow />
      <div className="relative z-10 w-full max-w-sm px-6 pt-16 flex flex-col items-center">
        <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center glow-primary">
          <img src={rehabitLogo} alt="Rehabit" className="w-full h-full object-contain" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow mb-10">Welcome back!</h1>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4"
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <Link to="/forgot-password" className="self-end text-muted-foreground font-body text-xs mt-2 hover:text-foreground transition-colors">
          Forgot Password?
        </Link>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 rounded-full bg-foreground font-heading text-base text-background mt-8 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="flex items-center gap-3 w-full my-6">
          <div className="flex-1 h-px bg-muted-foreground/20" />
          <span className="text-muted-foreground font-body text-xs">or</span>
          <div className="flex-1 h-px bg-muted-foreground/20" />
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            const result = await auth.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              setLoading(false);
              toast.error("Google sign-in failed");
              return;
            }

            if (!result.redirected) {
              setLoading(false);
              navigate("/", { replace: true });
            }
          }}
          disabled={loading}
          className="w-full py-4 rounded-full glass-strong font-body text-sm text-foreground flex items-center justify-center gap-3 hover:glow-primary transition-all duration-300"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="text-muted-foreground font-body text-sm mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:text-primary/80 transition-colors">Register Now</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
