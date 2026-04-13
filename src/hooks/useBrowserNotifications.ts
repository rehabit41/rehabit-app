import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Requests browser notification permission when the user is logged in.
 * Uses the basic Notification API (not service-worker push).
 */
export function useBrowserNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      // Ask permission after a short delay so it doesn't feel aggressive
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [user]);
}

/**
 * Show a browser notification if the user has granted permission.
 */
export function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  });
}
