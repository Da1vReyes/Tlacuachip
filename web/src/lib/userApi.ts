import type { BusinessFormData, DataPreferences, ProviderProfile, ReportData, User, UserProgress } from "../types";

export const USER_API_BASE = import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:4100";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${USER_API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.message || body?.error || `${res.status}`);
  return body as T;
}

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string | null; avatar_url?: string | null; role: "entrepreneur" | "provider"; created_at: string };
}

export function signup(email: string, password: string, name: string | undefined, role: "entrepreneur" | "provider") {
  return request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name, role }) });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

interface ServerBusinessProfile {
  business_type: string;
  category: string;
  budget: number;
  country: string;
  state: string;
  city: string;
  experience: string;
  description: string | null;
}

interface ServerProgress {
  level: number;
  xp: number;
  last_active_at: string;
  completedSteps: string[];
}

interface ServerPreferences {
  visibility: DataPreferences["visibility"];
  location_precision: DataPreferences["locationPrecision"];
  onboarding_complete: boolean;
  selected_zone_id: string | null;
  location_mode: DataPreferences["locationMode"] | null;
  tutorial_seen: boolean;
}

interface ServerProviderProfile {
  name: string;
  kind: ProviderProfile["kind"];
  is_ai: boolean;
  city: string;
  country: string;
  description: string;
  helps_with: string[];
}

export interface FullProfile {
  user: { id: string; email: string; name: string | null; avatar_url?: string | null; role: "entrepreneur" | "provider" } | null;
  businessProfile: ServerBusinessProfile | null;
  report: ReportData | null;
  progress: ServerProgress;
  preferences: ServerPreferences;
  providerProfile: ServerProviderProfile | null;
  team: string[];
}

export function fetchMe(token: string) {
  return request<FullProfile>("/api/me", { token });
}

export function toClientUser(u: FullProfile["user"]): User | null {
  if (!u) return null;
  return { email: u.email, name: u.name ?? undefined, avatarUrl: u.avatar_url ?? undefined, role: u.role };
}

export function toClientBusinessForm(p: ServerBusinessProfile | null): BusinessFormData | null {
  if (!p) return null;
  return {
    businessType: p.business_type,
    category: p.category as BusinessFormData["category"],
    budget: p.budget,
    location: { country: p.country as BusinessFormData["location"]["country"], state: p.state, city: p.city },
    experience: p.experience as BusinessFormData["experience"],
    description: p.description ?? undefined,
  };
}

export function toClientProgress(p: ServerProgress): UserProgress {
  return { level: p.level, xp: p.xp, completedSteps: p.completedSteps, lastActiveAt: p.last_active_at };
}

export function toClientPreferences(p: ServerPreferences): DataPreferences {
  return {
    visibility: p.visibility,
    locationPrecision: p.location_precision,
    onboardingComplete: p.onboarding_complete,
    selectedZoneId: p.selected_zone_id ?? undefined,
    locationMode: p.location_mode ?? undefined,
    tutorialSeen: p.tutorial_seen,
  };
}

export function toClientProviderProfile(p: ServerProviderProfile | null): ProviderProfile | null {
  if (!p) return null;
  return { name: p.name, kind: p.kind, isAI: p.is_ai, city: p.city, country: p.country, description: p.description, helpsWith: p.helps_with };
}

export function saveBusinessProfile(token: string, form: BusinessFormData) {
  return request("/api/me/business-profile", {
    method: "PUT",
    token,
    body: JSON.stringify({
      businessType: form.businessType,
      category: form.category,
      budget: form.budget,
      country: form.location.country,
      state: form.location.state,
      city: form.location.city,
      experience: form.experience,
      description: form.description,
    }),
  });
}

export function saveReportRemote(token: string, report: ReportData) {
  return request("/api/me/report", { method: "PUT", token, body: JSON.stringify(report) });
}

export function completeStepRemote(token: string, stepId: string, xp: number) {
  return request("/api/me/progress/complete-step", { method: "POST", token, body: JSON.stringify({ stepId, xp }) });
}

export function savePreferencesRemote(token: string, patch: Partial<DataPreferences>) {
  return request("/api/me/preferences", { method: "PUT", token, body: JSON.stringify(patch) });
}

export function saveProviderProfileRemote(token: string, profile: ProviderProfile) {
  return request("/api/me/provider-profile", { method: "PUT", token, body: JSON.stringify(profile) });
}

export function toggleTeamProviderRemote(token: string, providerId: string) {
  return request(`/api/me/team/${encodeURIComponent(providerId)}/toggle`, { method: "POST", token });
}

export function updateRoleRemote(token: string, role: "entrepreneur" | "provider") {
  return request("/api/me/role", { method: "PUT", token, body: JSON.stringify({ role }) });
}

export function updateUserProfileRemote(token: string, patch: { name?: string | null; avatarUrl?: string | null }) {
  return request<FullProfile["user"]>("/api/me/profile", { method: "PATCH", token, body: JSON.stringify(patch) });
}

export function deleteAccountRemote(token: string) {
  return request<void>("/api/me", { method: "DELETE", token });
}

export interface CommunityPost {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: string;
  businessType: string;
  location: string;
}

export function fetchCommunityPosts() { return request<CommunityPost[]>("/api/community/posts"); }
export function createCommunityPostRemote(token: string, body: string, parentId?: string) {
  return request<CommunityPost>("/api/me/community/posts", { method: "POST", token, body: JSON.stringify({ body, parentId }) });
}
export function startConversationRemote(token: string, providerId: string, body: string) {
  return request("/api/me/conversations", { method: "POST", token, body: JSON.stringify({ providerId, body }) });
}

export interface Conversation {
  id: string;
  providerCatalogId: string;
  counterpart: { name: string; role: "provider" | "entrepreneur" };
  status: "pending" | "accepted";
  teamStatus: "none" | "invited" | "active";
  request: { category: string | null; city: string | null } | null;
  createdAt: string;
  messages: { id: string; body: string; sentByMe: boolean; createdAt: string }[];
}

export function fetchConversations(token: string) { return request<Conversation[]>("/api/me/conversations", { token }); }
export function sendConversationMessageRemote(token: string, conversationId: string, body: string) {
  return request(`/api/me/conversations/${encodeURIComponent(conversationId)}/messages`, { method: "POST", token, body: JSON.stringify({ body }) });
}
export function acceptConversationRemote(token: string, conversationId: string) {
  return request(`/api/me/conversations/${encodeURIComponent(conversationId)}/accept`, { method: "POST", token });
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  mimeType: "text/csv";
  dataUrl: string;
  createdAt: string;
}

export interface Workspace {
  conversationId: string;
  providerCatalogId: string;
  collaborator: { name: string; role: "provider" | "entrepreneur" };
  tasks: WorkspaceTask[];
  files: WorkspaceFile[];
}

export function inviteConversationToTeamRemote(token: string, conversationId: string) {
  return request(`/api/me/conversations/${encodeURIComponent(conversationId)}/team-invite`, { method: "POST", token });
}
export function acceptTeamInviteRemote(token: string, conversationId: string) {
  return request(`/api/me/conversations/${encodeURIComponent(conversationId)}/team-accept`, { method: "POST", token });
}
export function fetchWorkspace(token: string) { return request<Workspace[]>("/api/me/workspace", { token }); }
export function createWorkspaceItemRemote(token: string, conversationId: string, input: { title: string; description?: string; dueDate?: string }) {
  return request(`/api/me/workspace/${encodeURIComponent(conversationId)}/items`, { method: "POST", token, body: JSON.stringify(input) });
}
export function completeWorkspaceItemRemote(token: string, itemId: string, completed: boolean) {
  return request(`/api/me/workspace/items/${encodeURIComponent(itemId)}`, { method: "PATCH", token, body: JSON.stringify({ completed }) });
}
export function uploadWorkspaceCsvRemote(token: string, conversationId: string, input: { name: string; contentBase64: string }) {
  return request(`/api/me/workspace/${encodeURIComponent(conversationId)}/files`, { method: "POST", token, body: JSON.stringify({ ...input, mimeType: "text/csv" }) });
}
