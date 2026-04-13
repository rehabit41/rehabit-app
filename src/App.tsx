import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import MapsPage from "./pages/MapsPage.tsx";
import StatsPage from "./pages/StatsPage.tsx";
import AIChatPage from "./pages/AIChatPage.tsx";
import SplashPage from "./pages/SplashPage.tsx";
import StartPage from "./pages/StartPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import PasswordChangedPage from "./pages/PasswordChangedPage.tsx";
import { AgePage, HeightPage, WeightPage, CaloriesPage, StepsPage } from "./pages/OnboardingPages.tsx";
import OTPPage from "./pages/OTPPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import EditProfilePage from "./pages/EditProfilePage.tsx";
import LogStressPage from "./pages/LogStressPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '')}>
          <Routes>
            {/* Auth flow */}
            <Route path="/splash" element={<SplashPage />} />
            <Route path="/start" element={<StartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/otp" element={<OTPPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/password-changed" element={<PasswordChangedPage />} />

            {/* Onboarding */}
            <Route path="/onboarding/age" element={<AgePage />} />
            <Route path="/onboarding/height" element={<HeightPage />} />
            <Route path="/onboarding/weight" element={<WeightPage />} />
            <Route path="/onboarding/calories" element={<CaloriesPage />} />
            <Route path="/onboarding/steps" element={<StepsPage />} />

            {/* Main app */}
            <Route path="/" element={<Index />} />
            <Route path="/maps" element={<MapsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/ai-chat" element={<AIChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/log-stress" element={<LogStressPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
