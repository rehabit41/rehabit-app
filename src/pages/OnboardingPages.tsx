import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import rehabitLogo from "@/assets/rehabit-logo.png";

interface OnboardingStepProps {
  title: string;
  placeholder: string;
  nextPath: string;
  storageKey: string;
  isLast?: boolean;
}

const OnboardingStep = ({ title, placeholder, nextPath, storageKey, isLast }: OnboardingStepProps) => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    const num = Number(value);
    if (!value || num <= 0) {
      toast.error("Please enter a valid number");
      return;
    }

    // Save to temp storage
    const partial = JSON.parse(localStorage.getItem("onboarding_temp") || "{}");
    partial[storageKey] = num;
    localStorage.setItem("onboarding_temp", JSON.stringify(partial));

    if (isLast) {
      setLoading(true);
      // Save to Supabase profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          age: partial.age || null,
          height: partial.height || null,
          weight: partial.weight || null,
          calorie_goal: partial.calorieGoal || 2000,
          step_goal: partial.stepGoal || 10000,
        }).eq("user_id", user.id);
      }
      localStorage.removeItem("onboarding_temp");
      setLoading(false);
    }

    navigate(nextPath);
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden flex items-start justify-center">
      <AmbientGlow />
      <div className="relative z-10 w-full max-w-sm px-6 pt-20 flex flex-col items-center">
        <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center glow-primary">
          <img src={rehabitLogo} alt="Rehabit" className="w-full h-full object-contain" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground text-glow text-center mb-10">{title}</h1>

        <input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full py-4 px-6 rounded-full glass-strong bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none mb-10"
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
        />

        <button
          onClick={handleNext}
          disabled={loading}
          className="w-full py-4 rounded-full bg-foreground font-heading text-base text-background hover:opacity-90 transition-opacity disabled:opacity-50 mb-5"
        >
          {loading ? "Saving..." : isLast ? "Start" : "Next"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground font-body text-base flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    </div>
  );
};

export const AgePage = () => (
  <OnboardingStep title="How old are you?" placeholder="Input age" nextPath="/onboarding/height" storageKey="age" />
);

export const HeightPage = () => (
  <OnboardingStep title="What is your height?" placeholder="Input height (cm)" nextPath="/onboarding/weight" storageKey="height" />
);

export const WeightPage = () => (
  <OnboardingStep title="What is your weight?" placeholder="Input weight (kg)" nextPath="/onboarding/calories" storageKey="weight" />
);

export const CaloriesPage = () => (
  <OnboardingStep title={"What is your calorie intake?"} placeholder="Input calories" nextPath="/onboarding/steps" storageKey="calorieGoal" />
);

export const StepsPage = () => (
  <OnboardingStep title={"How many steps do you want to aim for each day?"} placeholder="Input steps" nextPath="/" storageKey="stepGoal" isLast />
);
