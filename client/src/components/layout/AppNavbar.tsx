import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, Users, Camera, LogOut, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";
import { useLogoutMutation } from "@/services";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Patients",     to: "/patients",          icon: Users  },
  { label: "Recognition",  to: "/recognition",       icon: Camera },
];

export default function AppNavbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const user      = useAppSelector(selectUser);
  const [logout]  = useLogoutMutation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { /* ignore */ }
    navigate("/auth/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/patients" className="flex items-center gap-2 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:scale-105">
            <Brain className="size-4" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">
            Memory<span className="text-muted-foreground font-normal">Bridge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map(({ label, to, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="hidden sm:flex items-center gap-3">
          {user && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {user.name || user.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t border-border/60 bg-background px-4 py-3 space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {label}
                </span>
                <ChevronRight className="size-3.5 opacity-40" />
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border/40 mt-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
