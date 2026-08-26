import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Organizer login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      eyebrow="Organizers only"
      title="Admin login"
      description="Restricted to the Best Buddy UP! organizer team."
    >
      {error === "not-authorized" && (
        <p className="mb-4 rounded-md bg-error/10 p-3 text-sm font-semibold text-error" role="alert">
          That account isn&rsquo;t on the organizer list. Contact an existing admin if you
          think this is a mistake.
        </p>
      )}
      <LoginForm redirectTo="/admin" />
    </AuthShell>
  );
}
