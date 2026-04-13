import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AmbientGlow from "@/components/AmbientGlow";
import { useAuth } from "@/contexts/AuthContext";
import rehabitLogo from "@/assets/rehabit-logo.png";

const StartPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <AmbientGlow />
      <div className="relative z-10 text-center w-full max-w-sm px-6">
        <div className="w-36 h-36 mx-auto mb-8 flex items-center justify-center glow-primary">
          <img src={rehabitLogo} alt="Rehabit" className="w-full h-full object-contain" />
        </div>

        <h1 className="font-heading text-3xl font-bold text-foreground text-glow mb-10">Start now!</h1>

        <Link
          to="/login"
          className="block w-full py-4 rounded-full glass-strong font-heading text-base text-foreground mb-4 hover:glow-primary transition-all duration-300"
        >
          Login
        </Link>

        <Link
          to="/register"
          className="block w-full py-4 rounded-full bg-foreground font-heading text-base text-background mb-6 hover:opacity-90 transition-opacity"
        >
          Register
        </Link>

      </div>
    </div>
  );
};

export default StartPage;
