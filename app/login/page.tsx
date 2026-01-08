import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login – Instagram Lead Engine",
  description:
    "Internal login for Pehchaan Media's Instagram Lead Engine dashboard.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">
            Loading login…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
