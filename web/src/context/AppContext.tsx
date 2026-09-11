import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BusinessFormData, DataPreferences, ProviderProfile, ReportData, User, UserProgress, UserRole } from "../types";
import { roadmapSteps as initialSteps } from "../data/mockData";
import type { RoadmapStep } from "../types";
import {
  signup as apiSignup,
  login as apiLogin,
  fetchMe,
  toClientUser,
  toClientBusinessForm,
  toClientProgress,
  toClientPreferences,
  toClientProviderProfile,
  saveBusinessProfile,
  saveReportRemote,
  completeStepRemote,
  savePreferencesRemote,
  saveProviderProfileRemote,
  toggleTeamProviderRemote,
  updateRoleRemote,
  deleteAccountRemote,
} from "../lib/userApi";

export interface AuthResult {
  role: UserRole;
  hasBusinessForm: boolean;
  hasProviderProfile: boolean;
  onboardingComplete: boolean;
}

interface AppState {
  user: User | null;
  businessForm: BusinessFormData | null;
  report: ReportData | null;
  progress: UserProgress;
  preferences: DataPreferences;
  providerProfile: ProviderProfile | null;
  team: string[];
  steps: RoadmapStep[];
  authReady: boolean;
  authError: string | null;
  /** Resolves with a snapshot of what the server actually returned — not
   * read off context state, which may not have re-rendered yet by the time
   * the caller needs to decide where to navigate. */
  signup: (email: string, password: string, name: string | undefined, role: UserRole) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
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
const TOKEN_KEY = "tlacuachic-token";

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
// initializer) instead of in an effect — see the git history on this file
// for why (guarded pages used to bounce a reload to /formulario before an
// effect-based load could populate anything).
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(persisted.user);
  const [businessForm, setBusinessForm] = useState<BusinessFormData | null>(persisted.businessForm);
  const [report, setReport] = useState<ReportData | null>(persisted.report);
  const [progress, setProgress] = useState<UserProgress>(persisted.progress);
  const [preferences, setPreferences] = useState<DataPreferences>(persisted.preferences);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(persisted.providerProfile);
  const [team, setTeam] = useState<string[]>(persisted.team);
  const [authReady, setAuthReady] = useState(!token);
  const [authError, setAuthError] = useState<string | null>(null);
  const skipNextPersist = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

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

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // A saved token means this browser was logged in before. Refetch from the
  // server on mount so the real, shared Postgres data wins over whatever
  // this browser happened to have cached — that's the whole point of
  // having a backend: log in from a different device and see the same
  // account, not a fresh empty one.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchMe(token)
      .then((full) => {
        if (cancelled) return;
        setUser(toClientUser(full.user));
        setBusinessForm(toClientBusinessForm(full.businessProfile));
        setReport(full.report);
        setProgress(toClientProgress(full.progress));
        setPreferences(toClientPreferences(full.preferences));
        setProviderProfile(toClientProviderProfile(full.providerProfile));
        setTeam(full.team);
      })
      .catch(() => {
        // Token expired, or the account was deleted from another session —
        // fall back to a logged-out state rather than showing stale data.
        if (cancelled) return;
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = unlockNextSteps(initialSteps, progress.completedSteps);

  // Shared by signup and login: apply a freshly-fetched profile to state
  // and hand back a plain snapshot of it. Callers (Auth.tsx) use the
  // snapshot to decide where to navigate — reading context state right
  // after calling this would still see the pre-update values, since
  // setState hasn't re-rendered yet.
  const applyProfile = (full: Awaited<ReturnType<typeof fetchMe>>): AuthResult => {
    setUser(toClientUser(full.user));
    setBusinessForm(toClientBusinessForm(full.businessProfile));
    setReport(full.report);
    setProgress(toClientProgress(full.progress));
    setPreferences(toClientPreferences(full.preferences));
    setProviderProfile(toClientProviderProfile(full.providerProfile));
    setTeam(full.team);
    return {
      role: full.user?.role ?? "entrepreneur",
      hasBusinessForm: full.businessProfile !== null,
      hasProviderProfile: full.providerProfile !== null,
      onboardingComplete: full.preferences.onboarding_complete,
    };
  };

  const signup: AppState["signup"] = async (email, password, name, role) => {
    setAuthError(null);
    try {
      const res = await apiSignup(email, password, name, role);
      setToken(res.token);
      const full = await fetchMe(res.token);
      return applyProfile(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear la cuenta";
      setAuthError(message);
      throw err;
    }
  };

  const login: AppState["login"] = async (email, password) => {
    setAuthError(null);
    try {
      const res = await apiLogin(email, password);
      setToken(res.token);
      const full = await fetchMe(res.token);
      return applyProfile(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión";
      setAuthError(message);
      throw err;
    }
  };

  const logout = () => {
    skipNextPersist.current = true;
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setBusinessForm(null);
    setReport(null);
    setProgress(defaultProgress);
    setPreferences(defaultPreferences);
    setProviderProfile(null);
    setTeam([]);
  };

  // Every mutation below updates local state immediately (so the UI never
  // waits on a network round-trip) and mirrors the change to the server in
  // the background when the user is authenticated. A background failure is
  // logged, not surfaced — the local state is still correct, it just won't
  // be there next time this account logs in from elsewhere until retried.
  const sync = (label: string, fn: (t: string) => Promise<unknown>) => {
    const t = tokenRef.current;
    if (!t) return;
    fn(t).catch((err) => console.warn(`[sync] ${label} failed, will retry on next change:`, err));
  };

  const setRole = (role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : prev));
    sync("role", (t) => updateRoleRemote(t, role));
  };

  const saveBusinessFormAction = (form: BusinessFormData) => {
    setBusinessForm(form);
    sync("business-profile", (t) => saveBusinessProfile(t, form));
  };

  const saveReportAction = (r: ReportData) => {
    setReport(r);
    sync("report", (t) => saveReportRemote(t, r));
  };

  const saveProviderProfileAction = (profile: ProviderProfile) => {
    setProviderProfile(profile);
    sync("provider-profile", (t) => saveProviderProfileRemote(t, profile));
  };

  const toggleTeamProvider = (providerId: string) => {
    setTeam((prev) => (prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]));
    sync("team-toggle", (t) => toggleTeamProviderRemote(t, providerId));
  };

  const savePreferences = (next: Partial<DataPreferences>) => {
    setPreferences((previous) => ({ ...previous, ...next }));
    sync("preferences", (t) => savePreferencesRemote(t, next));
  };

  const deleteAllData = () => {
    const t = tokenRef.current;
    if (t) deleteAccountRemote(t).catch((err) => console.warn("[sync] account deletion failed:", err));
    logout();
  };

  const completeStep = (stepId: string) => {
    let awardedXp = 0;
    setProgress((prev) => {
      if (prev.completedSteps.includes(stepId)) return prev;
      const step = initialSteps.find((s) => s.id === stepId);
      awardedXp = step?.xp ?? 0;
      const newXp = prev.xp + awardedXp;
      const newLevel = Math.floor(newXp / 400) + 1;
      return {
        level: newLevel,
        xp: newXp,
        completedSteps: [...prev.completedSteps, stepId],
        lastActiveAt: new Date().toISOString(),
      };
    });
    sync("complete-step", (t) => completeStepRemote(t, stepId, awardedXp));
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
        authReady,
        authError,
        signup,
        login,
        logout,
        setRole,
        saveBusinessForm: saveBusinessFormAction,
        saveReport: saveReportAction,
        saveProviderProfile: saveProviderProfileAction,
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
