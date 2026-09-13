"use client";

import dynamic from "next/dynamic";

// The interactive dashboard is client-rendered while all persistent data and
// authentication come from Supabase through same-origin API routes. Disabling
// SSR here keeps browser-only animation and chart setup hydration-safe.
const App = dynamic(() => import("@/components/app"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#0a0a0c]" aria-hidden />
  ),
});

export default function AppLoader() {
  return <App />;
}
