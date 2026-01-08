import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export const metadata = {
  title: "Login – Instagram Lead Engine",
  description:
    "Internal login for Pehchaan Media's Instagram Lead Engine dashboard."
};

export default function LoginPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-sm text-slate-400">Loading login…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
