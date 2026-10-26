import { Suspense } from "react";
import LoginPage from "./login-form";

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-stone-500">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}
