import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in — Momentum",
  description: "Sign in to your private habit tracker with your username.",
};

export default function LoginPage() {
  return <LoginForm />;
}
