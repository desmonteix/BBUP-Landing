import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Best Buddy UP! account to buy tickets to paid events.",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Join us"
      title="Create your account"
      description="Needed only for paid events, so we can price your ticket correctly."
    >
      <SignupForm />
    </AuthShell>
  );
}
