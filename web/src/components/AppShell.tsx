import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { providerKindLabel } from "../lib/matching";
import { IconRoute, IconChart, IconMap, IconUsers, IconBag, IconChat, IconLeaf, IconArrowLeft, IconGrid, IconSettings, IconForm } from "./icons";

const fullBleedRoutes = ["/", "/auth", "/formulario", "/onboarding/mapa"];

type NavItem = { section: string } | { path: string; label: string; icon: typeof IconGrid };

const entrepreneurNav: NavItem[] = [
  { section: "Tu negocio" },
  { path: "/dashboard", label: "Dashboard", icon: IconGrid },
  { path: "/reporte", label: "Reporte de mercado", icon: IconChart },
  { path: "/mapa-calor", label: "Mapa de calor", icon: IconMap },
  { path: "/roadmap", label: "Tu camino", icon: IconRoute },
  { section: "Tu red" },
  { path: "/equipo", label: "Tu equipo", icon: IconUsers },
  { path: "/mentores", label: "Mentores", icon: IconChat },
  { path: "/marketplace", label: "Marketplace", icon: IconBag },
  { path: "/comunidad", label: "Comunidad", icon: IconChat },
  { path: "/configuracion", label: "Configuración", icon: IconSettings },
];

const providerNav: NavItem[] = [
  { section: "Tu servicio" },
  { path: "/proveedor/panel", label: "Panel", icon: IconGrid },
  { path: "/proveedor/nuevo", label: "Mi perfil", icon: IconForm },
  { section: "Red" },
  { path: "/comunidad", label: "Comunidad", icon: IconChat },
  { path: "/configuracion", label: "Configuración", icon: IconSettings },
];

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/formulario": "Nuevo negocio",
  "/reporte": "Reporte de mercado",
  "/mapa-calor": "Mapa de calor",
  "/roadmap": "Tu camino",
  "/equipo": "Tu equipo",
  "/mentores": "Mentores",
  "/marketplace": "Marketplace",
  "/proveedor/nuevo": "Perfil de proveedor",
  "/proveedor/panel": "Panel de proveedor",
  "/comunidad": "Comunidad",
  "/configuracion": "Configuración",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, progress, providerProfile } = useApp();

  if (fullBleedRoutes.includes(location.pathname)) {
    return <>{children}</>;
  }

  const isProvider = user?.role === "provider";
  const navItems = isProvider ? providerNav : entrepreneurNav;
  const isStepDetail = location.pathname.startsWith("/paso/");
  const showBack = isStepDetail || location.pathname === "/proveedor/nuevo";
  const title = isStepDetail ? "Detalle del paso" : titles[location.pathname] ?? "Tlacuachic";
  const xpPct = Math.min(100, Math.round(((progress.xp % 400) / 400) * 100));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <IconLeaf size={17} />
          </div>
          <span className="sidebar-logo-text">Tlacuachic</span>
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
          {isProvider ? (
            <span className="muted" style={{ fontWeight: 600 }}>
              {providerProfile ? providerKindLabel[providerProfile.kind] : "Proveedor"}{providerProfile?.isAI ? " · IA" : ""}
            </span>
          ) : (
            <>
              <span className="muted" style={{ fontWeight: 600 }}>
                Nivel {progress.level} · {progress.xp} XP
              </span>
              <div className="progress-track">
                <div className="progress-fill" style={{ transform: `scaleX(${xpPct / 100})` }} />
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-left">
            {showBack && (
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
