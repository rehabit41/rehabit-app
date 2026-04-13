import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, User } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import BottomNav from "@/components/BottomNav";
import { useSupabaseProfile } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, uploadAvatar, loading } = useSupabaseProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [age, setAge] = useState(profile?.age || 0);
  const [height, setHeight] = useState(profile?.height || 170);
  const [weight, setWeight] = useState(profile?.weight || 70);
  const [stepGoal, setStepGoal] = useState(profile?.step_goal || 10000);
  const [calorieGoal, setCalorieGoal] = useState(profile?.calorie_goal || 2000);
  const [uploading, setUploading] = useState(false);

  // Sync state when profile loads
  useState(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAge(profile.age || 0);
      setHeight(profile.height || 170);
      setWeight(profile.weight || 70);
      setStepGoal(profile.step_goal);
      setCalorieGoal(profile.calorie_goal);
    }
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadAvatar(file);
    setUploading(false);
    if (url) toast.success("Profile picture updated!");
    else toast.error("Failed to upload image");
  };

  const handleSave = async () => {
    await updateProfile({
      display_name: displayName,
      age,
      height,
      weight,
      step_goal: stepGoal,
      calorie_goal: calorieGoal,
    });
    toast.success("Profile saved!");
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AmbientGlow />

      <div className="relative z-10 max-w-md mx-auto px-6 pt-14 pb-36">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="glass w-10 h-10 rounded-full flex items-center justify-center hover:glow-primary transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-heading text-3xl font-bold text-glow">Edit Profile</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full futuristic-gradient p-[2px] glow-primary">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full futuristic-gradient flex items-center justify-center cursor-pointer glow-primary hover:scale-110 transition-transform">
              {uploading ? (
                <div className="w-4 h-4 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <p className="font-body text-xs text-muted-foreground mt-2">Tap camera to change photo</p>
        </div>

        {/* Profile Fields */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <p className="text-muted-foreground font-body text-xs tracking-widest uppercase mb-4">Personal Info</p>
          <div className="space-y-4">
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Display Name</p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full py-3 px-4 rounded-xl glass-strong bg-transparent font-body text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Age</p>
                <input
                  type="number"
                  value={age || ""}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full py-3 px-3 rounded-xl glass-strong bg-transparent font-heading text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Height (cm)</p>
                <input
                  type="number"
                  value={height || ""}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full py-3 px-3 rounded-xl glass-strong bg-transparent font-heading text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Weight (kg)</p>
                <input
                  type="number"
                  value={weight || ""}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full py-3 px-3 rounded-xl glass-strong bg-transparent font-heading text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <p className="text-muted-foreground font-body text-xs tracking-widest uppercase mb-4">Daily Goals</p>
          <div className="space-y-4">
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Step Goal</p>
              <input
                type="number"
                value={stepGoal}
                onChange={(e) => setStepGoal(Number(e.target.value))}
                className="w-full py-3 px-4 rounded-xl glass-strong bg-transparent font-heading text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground mb-1">Calorie Goal</p>
              <input
                type="number"
                value={calorieGoal}
                onChange={(e) => setCalorieGoal(Number(e.target.value))}
                className="w-full py-3 px-4 rounded-xl glass-strong bg-transparent font-heading text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl futuristic-gradient font-heading text-base font-semibold text-foreground flex items-center justify-center gap-2 glow-primary hover:opacity-90 transition-opacity"
        >
          <Save className="w-5 h-5" />
          Save Profile
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default EditProfilePage;
