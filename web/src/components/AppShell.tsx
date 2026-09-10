import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { IconRoute, IconChart, IconMap, IconUsers, IconBag, IconChat, IconLeaf, IconArrowLeft, IconGrid } from "./icons";

const fullBleedRoutes = ["/", "/auth", "/formulario"];

const navItems = [
  { section: "Tu negocio" },
  { path: "/dashboard", label: "Dashboard", icon: IconGrid },
  { path: "/reporte", label: "Reporte de mercado", icon: IconChart },
  { path: "/mapa-calor", label: "Mapa de calor", icon: IconMap },
  { path: "/roadmap", label: "Tu camino", icon: IconRoute },
  { section: "Comunidad" },
  { path: "/mentores", label: "Mentores", icon: IconUsers },
  { path: "/marketplace", label: "Marketplace", icon: IconBag },
  { path: "/comunidad", label: "Comunidad", icon: IconChat },
] as const;

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/formulario": "Nuevo negocio",
  "/reporte": "Reporte de mercado",
  "/mapa-calor": "Mapa de calor",
  "/roadmap": "Tu camino",
  "/mentores": "Mentores",
  "/marketplace": "Marketplace",
  "/proveedor/nuevo": "Registro de proveedor",
  "/comunidad": "Comunidad",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, progress } = useApp();

  if (fullBleedRoutes.includes(location.pathname)) {
    return <>{children}</>;
  }

  const isStepDetail = location.pathname.startsWith("/paso/");
  const isProviderSignup = location.pathname === "/proveedor/nuevo";
  const isFormulario = location.pathname === "/formulario";
  const title = isStepDetail ? "Detalle del paso" : titles[location.pathname] ?? "Tlacuachip";
  const xpPct = Math.min(100, Math.round(((progress.xp % 400) / 400) * 100));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <IconLeaf size={17} />
          </div>
          <span className="sidebar-logo-text">Tlacuachip</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, i) =>
            "section" in item ? (
              <div key={`s-${i}`} className="sidebar-category">
                {item.section}
              </div>
            ) : (
              <button
                key={item.path}
                className={`sidebar-item${location.pathname === item.path ? " active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon />
                {item.label}
              </button>
            )
          )}
        </nav>
        <div className="sidebar-footer stack" style={{ gap: 6 }}>
          <span className="muted" style={{ fontWeight: 600 }}>
            Nivel {progress.level} · {progress.xp} XP
          </span>
          <div className="progress-track">
            <div className="progress-fill" style={{ transform: `scaleX(${xpPct / 100})` }} />
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-left">
            {(isStepDetail || isProviderSignup || isFormulario) && (
              <button className="topbar-back" onClick={() => navigate(-1)} aria-label="Volver">
                <IconArrowLeft size={15} />
              </button>
            )}
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-avatar">{(user?.name ?? user?.email ?? "A").charAt(0).toUpperCase()}</div>
        </header>
        <main className="content">
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
