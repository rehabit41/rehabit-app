import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, RotateCcw, Bell, LogOut } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import BottomNav from "@/components/BottomNav";
import { useSupabaseProfile } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useSupabaseProfile();
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? true);

  const toggleNotifications = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    await updateProfile({ notifications_enabled: newVal });
    toast.success(newVal ? "Notifications enabled" : "Notifications disabled");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/start");
  };

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
          <h1 className="font-heading text-3xl font-bold text-glow">Settings</h1>
        </div>

        {/* Account */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <p className="text-muted-foreground font-body text-xs tracking-widest uppercase mb-4">Account</p>
          <button
            onClick={() => navigate("/edit-profile")}
            className="w-full flex items-center gap-3 py-3 text-foreground font-body text-base hover:text-primary transition-colors"
          >
            <User className="w-5 h-5 text-primary" />
            Edit Profile
          </button>
          <button
            onClick={() => navigate("/reset-password")}
            className="w-full flex items-center gap-3 py-3 text-foreground font-body text-base hover:text-primary transition-colors"
          >
            <Lock className="w-5 h-5 text-primary" />
            Change Password
          </button>
        </div>

        {/* App */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <p className="text-muted-foreground font-body text-xs tracking-widest uppercase mb-4">App</p>
          <button
            onClick={() => navigate("/onboarding/age")}
            className="w-full flex items-center gap-3 py-3 text-foreground font-body text-base hover:text-primary transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-primary" />
            Redo Onboarding Questions
          </button>
          <button
            onClick={toggleNotifications}
            className="w-full flex items-center justify-between py-3 text-foreground font-body text-base hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </div>
            <div className={`w-12 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${
              notificationsEnabled ? "futuristic-gradient" : "glass-strong"
            }`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform duration-300 ${
                notificationsEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-destructive font-heading text-base text-destructive-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
