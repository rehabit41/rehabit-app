import { LayoutDashboard, Map, BarChart3, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Maps", path: "/maps" },
  { icon: BarChart3, label: "Stats", path: "/stats" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-8 left-6 right-6 max-w-md mx-auto z-50">
      <nav className="glass-strong rounded-[2rem] h-20 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? "futuristic-gradient glow-primary scale-110"
                  : "glass hover:scale-105"
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
