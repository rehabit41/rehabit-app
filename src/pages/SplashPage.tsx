import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AmbientGlow from "@/components/AmbientGlow";
import rehabitLogo from "@/assets/rehabit-logo.png";

const SplashPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/start"), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <AmbientGlow />
      <div className="relative z-10 text-center">
        <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center glow-primary animate-pulse-glow">
          <img src={rehabitLogo} alt="Rehabit" className="w-full h-full object-contain" />
        </div>
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mt-8" />
        <p className="text-muted-foreground font-body text-sm mt-4 tracking-widest uppercase">Loading...</p>
      </div>
    </div>
  );
};

export default SplashPage;
