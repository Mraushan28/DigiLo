"use client";

import { AuthProvider } from "@/components/auth/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import FloatingAiChatBot from "@/components/layout/FloatingAiChatBot";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
      <FloatingAiChatBot />
    </AuthProvider>
  );
}
