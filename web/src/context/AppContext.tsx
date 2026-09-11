import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BusinessFormData, DataPreferences, ProviderProfile, ReportData, User, UserProgress, UserRole } from "../types";
import { roadmapSteps as initialSteps } from "../data/mockData";
import type { RoadmapStep } from "../types";

interface AppState {
  user: User | null;
  businessForm: BusinessFormData | null;
  report: ReportData | null;
  progress: UserProgress;
  preferences: DataPreferences;
  providerProfile: ProviderProfile | null;
  team: string[];
  steps: RoadmapStep[];
  login: (email: string, name?: string, role?: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  saveBusinessForm: (form: BusinessFormData) => void;
  saveReport: (report: ReportData) => void;
  saveProviderProfile: (profile: ProviderProfile) => void;
  toggleTeamProvider: (providerId: string) => void;
  completeStep: (stepId: string) => void;
  savePreferences: (preferences: Partial<DataPreferences>) => void;
  deleteAllData: () => void;
}

const STORAGE_KEY = "emprende-mvp-state";

const defaultProgress: UserProgress = {
  level: 1,
  xp: 0,
  completedSteps: [],
  lastActiveAt: new Date().toISOString(),
};

const AppContext = createContext<AppState | undefined>(undefined);

function unlockNextSteps(steps: RoadmapStep[], completedSteps: string[]): RoadmapStep[] {
  const result = steps.map((s) => ({ ...s }));
  result.forEach((step, idx) => {
    if (completedSteps.includes(step.id)) {
      step.status = "completed";
    } else if (idx === 0) {
      step.status = step.status === "locked" ? "available" : step.status;
    } else {
      const prev = result[idx - 1];
      step.status = prev.status === "completed" ? (step.status === "locked" ? "available" : step.status) : step.status;
    }
  });
  return result;
}

interface Persisted {
  user: User | null;
  businessForm: BusinessFormData | null;
  report: ReportData | null;
  progress: UserProgress;
  preferences: DataPreferences;
  providerProfile: ProviderProfile | null;
  team: string[];
}

const defaultPreferences: DataPreferences = {
  visibility: "business",
  locationPrecision: "city",
  onboardingComplete: false,
};

const emptyState: Persisted = {
  user: null,
  businessForm: null,
  report: null,
  progress: defaultProgress,
  preferences: defaultPreferences,
  providerProfile: null,
  team: [],
};

// Read synchronously during the first render (via useState's lazy
// initializer) instead of in an effect. Loading this in an effect meant
// guarded pages (Dashboard, Report, Heatmap, StepDetail) would run their
// "redirect if no data" check on the FIRST render, before this had a
// chance to populate — which bounced a reload straight to /formulario
// even when localStorage had everything. Reading it up front makes the
// first render already correct, so there's nothing to race.
function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      businessForm: parsed.businessForm ?? null,
      report: parsed.report ?? null,
      progress: parsed.progress ?? defaultProgress,
      preferences: { ...defaultPreferences, ...(parsed.preferences ?? {}) },
      providerProfile: parsed.providerProfile ?? null,
      team: Array.isArray(parsed.team) ? parsed.team : [],
    };
  } catch {
    return emptyState;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersisted);
  const [user, setUser] = useState<User | null>(persisted.user);
  const [businessForm, setBusinessForm] = useState<BusinessFormData | null>(persisted.businessForm);
  const [report, setReport] = useState<ReportData | null>(persisted.report);
  const [progress, setProgress] = useState<UserProgress>(persisted.progress);
  const [preferences, setPreferences] = useState<DataPreferences>(persisted.preferences);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(persisted.providerProfile);
  const [team, setTeam] = useState<string[]>(persisted.team);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, businessForm, report, progress, preferences, providerProfile, team })
    );
  }, [user, businessForm, report, progress, preferences, providerProfile, team]);

  const steps = unlockNextSteps(initialSteps, progress.completedSteps);

  const login = (email: string, name?: string, role?: UserRole) =>
    setUser((prev) => ({ email, name: name ?? prev?.name, role: role ?? prev?.role ?? "entrepreneur" }));
  const logout = () => setUser(null);
  const setRole = (role: UserRole) => setUser((prev) => (prev ? { ...prev, role } : prev));
  const saveBusinessForm = (form: BusinessFormData) => setBusinessForm(form);
  const saveReport = (r: ReportData) => setReport(r);
  const saveProviderProfile = (profile: ProviderProfile) => setProviderProfile(profile);
  const toggleTeamProvider = (providerId: string) =>
    setTeam((prev) => (prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]));
  const savePreferences = (next: Partial<DataPreferences>) => setPreferences((previous) => ({ ...previous, ...next }));
  const deleteAllData = () => {
    skipNextPersist.current = true;
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setBusinessForm(null);
    setReport(null);
    setProgress(defaultProgress);
    setPreferences(defaultPreferences);
    setProviderProfile(null);
    setTeam([]);
  };

  const completeStep = (stepId: string) => {
    setProgress((prev) => {
      if (prev.completedSteps.includes(stepId)) return prev;
      const step = initialSteps.find((s) => s.id === stepId);
      const newXp = prev.xp + (step?.xp ?? 0);
      const newLevel = Math.floor(newXp / 400) + 1;
      return {
        level: newLevel,
        xp: newXp,
        completedSteps: [...prev.completedSteps, stepId],
        lastActiveAt: new Date().toISOString(),
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        businessForm,
        report,
        progress,
        preferences,
        providerProfile,
        team,
        steps,
        login,
        logout,
        setRole,
        saveBusinessForm,
        saveReport,
        saveProviderProfile,
        toggleTeamProvider,
        completeStep,
        savePreferences,
        deleteAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
