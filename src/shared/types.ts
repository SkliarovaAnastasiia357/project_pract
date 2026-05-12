export type ApiFieldErrors = Record<string, string>;

export type User = {
  id: string;
  name: string;
  email: string;
  bio: string;
};

export type AuthSession = {
  token: string;
  user: User;
};

export type Skill = {
  id: string;
  name: string;
};

export type Profile = {
  bio: string;
  skills: Skill[];
};

export type Project = {
  id: string;
  title: string;
  description: string;
  stack: string;
  roles: string;
  updatedAt: string;
};

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type ProjectSearchResult = Project & {
  ownerId: string;
  ownerName: string;
  applicationStatus: ApplicationStatus | null;
};

export type UserSearchResult = User & {
  skills: Skill[];
};

export type ProjectApplication = {
  id: string;
  projectId: string;
  applicantId: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type IncomingApplication = {
  id: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    title: string;
  };
  applicant: User & {
    skills: Skill[];
  };
};

export type RegisterInput = {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ProfileInput = {
  bio: string;
};

export type SkillInput = {
  name: string;
};

export type ProjectInput = {
  title: string;
  description: string;
  stack: string;
  roles: string;
};

export type SearchInput = {
  query: string;
};

export type ApplicationInput = {
  message: string;
};

export type ApplicationDecisionInput = {
  status: Extract<ApplicationStatus, "accepted" | "rejected">;
};

export type NavigationItem = {
  label: string;
  path: string;
  active: boolean;
  kind?: "link" | "action";
};

export type AuthStatus = "booting" | "authenticated" | "anonymous";
