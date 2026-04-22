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

export type NavigationItem = {
  label: string;
  path: string;
  active: boolean;
  kind?: "link" | "action";
};

export type AuthStatus = "booting" | "authenticated" | "anonymous";
