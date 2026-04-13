import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";

const PasswordChangedPage = () => {
  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <AmbientGlow />
      <div className="relative z-10 text-center w-full max-w-sm px-6">
        <div className="w-24 h-24 rounded-full futuristic-gradient mx-auto mb-6 flex items-center justify-center glow-primary">
          <CheckCircle className="w-12 h-12 text-foreground" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow mb-3">Password Changed!</h1>
        <p className="text-muted-foreground font-body text-sm mb-10">
          Your password has been updated successfully.
        </p>

        <Link
          to="/login"
          className="block w-full py-4 rounded-full bg-foreground font-heading text-base text-background hover:opacity-90 transition-opacity"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default PasswordChangedPage;
