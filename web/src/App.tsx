import { HashRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import BusinessForm from "./pages/BusinessForm";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Heatmap from "./pages/Heatmap";
import Roadmap from "./pages/Roadmap";
import StepDetail from "./pages/StepDetail";
import Mentors from "./pages/Mentors";
import Marketplace from "./pages/Marketplace";
import ProviderSignup from "./pages/ProviderSignup";
import ProviderDashboard from "./pages/ProviderDashboard";
import Team from "./pages/Team";
import Community from "./pages/Community";
import MapOnboarding from "./pages/MapOnboarding";
import Settings from "./pages/Settings";
import Tutorial from "./pages/Tutorial";
import Inbox from "./pages/Inbox";

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/formulario" element={<BusinessForm />} />
            <Route path="/onboarding/mapa" element={<MapOnboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reporte" element={<Report />} />
            <Route path="/mapa-calor" element={<Heatmap />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/paso/:stepId" element={<StepDetail />} />
            <Route path="/mentores" element={<Mentors />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/equipo" element={<Team />} />
            <Route path="/proveedor/nuevo" element={<ProviderSignup />} />
            <Route path="/proveedor/panel" element={<ProviderDashboard />} />
            <Route path="/comunidad" element={<Community />} />
            <Route path="/configuracion" element={<Settings />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/mensajes" element={<Inbox />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </AppProvider>
  );
}
