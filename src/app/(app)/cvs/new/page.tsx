import { Suspense } from "react";
import NewCvPage from "./new-cv-form";

export default function NewCvRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Loading…</div>}>
      <NewCvPage />
    </Suspense>
  );
}
