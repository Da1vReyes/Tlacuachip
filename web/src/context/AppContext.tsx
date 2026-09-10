import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BusinessFormData, ReportData, User, UserProgress } from "../types";
import { roadmapSteps as initialSteps } from "../data/mockData";
import type { RoadmapStep } from "../types";

interface AppState {
  user: User | null;
  businessForm: BusinessFormData | null;
  report: ReportData | null;
  progress: UserProgress;
  steps: RoadmapStep[];
  login: (email: string, name?: string) => void;
  logout: () => void;
  saveBusinessForm: (form: BusinessFormData) => void;
  saveReport: (report: ReportData) => void;
  completeStep: (stepId: string) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessFormData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.user) setUser(parsed.user);
        if (parsed.businessForm) setBusinessForm(parsed.businessForm);
        if (parsed.report) setReport(parsed.report);
        if (parsed.progress) setProgress(parsed.progress);
      } catch {
        // ignore corrupted storage
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, businessForm, report, progress })
    );
  }, [user, businessForm, report, progress]);

  const steps = unlockNextSteps(initialSteps, progress.completedSteps);

  const login = (email: string, name?: string) => setUser({ email, name });
  const logout = () => setUser(null);
  const saveBusinessForm = (form: BusinessFormData) => setBusinessForm(form);
  const saveReport = (r: ReportData) => setReport(r);

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
      value={{ user, businessForm, report, progress, steps, login, logout, saveBusinessForm, saveReport, completeStep }}
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
