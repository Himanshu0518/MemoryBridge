import { Outlet } from "react-router-dom";

/**
 * RootLayout — top-level shell for all authenticated app pages.
 *
 * Add your navbar, sidebar, global toasts, theme provider, etc. here.
 * Child routes are rendered through <Outlet />.
 */
export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/*
       * TODO: Add <Navbar /> or <Sidebar /> here once you build them.
       * Example:
       *   <Navbar />
       *   <main className="flex-1"><Outlet /></main>
       */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
