import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/layout/AppNavbar";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AppNavbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
