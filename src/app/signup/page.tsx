import type { Metadata } from "next";
import SignupForm from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account — Momentum",
  description:
    "Claim one of the two seats in this private habit tracker with a username and password.",
};

export default function SignupPage() {
  return <SignupForm />;
}
