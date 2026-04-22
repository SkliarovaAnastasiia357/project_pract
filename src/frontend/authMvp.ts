import { loginFields, normalizeEmail, registrationFields, validateRegistrationForm } from "../features/auth/forms.ts";
import { getHomePagePlaceholder, getProfilePageData } from "../features/profile/profile-view-model.ts";
import { buildNavigationMenu } from "../shared/navigation.ts";
import type { LoginInput, NavigationItem, RegisterInput } from "../shared/types.ts";

type LegacyUser = {
  id: string;
  email: string;
  name: string;
  password: string;
};

type LegacySession = {
  authenticated: boolean;
  user?: LegacyUser;
};

type RegistrationResult =
  | {
      success: true;
      session: LegacySession;
      nextPage: "/home";
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

type LoginResult =
  | {
      success: true;
      session: LegacySession;
      nextPage: "/home";
    }
  | {
      success: false;
      error: string;
    };

export function getRegistrationFormFields(): string[] {
  return [...registrationFields];
}

export function getLoginFormFields(): string[] {
  return [...loginFields];
}

export function registerUser(users: LegacyUser[], input: RegisterInput): RegistrationResult {
  const errors = validateRegistrationForm(input);

  if (users.some((user) => user.email === normalizeEmail(input.email))) {
    errors.email = "Пользователь с таким email уже существует";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    nextPage: "/home",
    session: {
      authenticated: true,
      user: {
        id: `user-${users.length + 1}`,
        email: normalizeEmail(input.email),
        name: input.name.trim(),
        password: input.password,
      },
    },
  };
}

export function loginUser(users: LegacyUser[], input: LoginInput): LoginResult {
  const user = users.find(
    (entry) => entry.email === normalizeEmail(input.email) && entry.password === input.password,
  );

  if (!user) {
    return {
      success: false,
      error: "Неверный email или пароль",
    };
  }

  return {
    success: true,
    nextPage: "/home",
    session: {
      authenticated: true,
      user,
    },
  };
}

export function logoutUser(): LegacySession {
  return {
    authenticated: false,
  };
}

export function canAccessProtectedPage(session: LegacySession): boolean {
  return session.authenticated;
}

export function resolveProtectedPageAccess(session: LegacySession): { allowed: boolean; redirectTo?: string } {
  if (session.authenticated) {
    return { allowed: true };
  }

  return {
    allowed: false,
    redirectTo: "/login",
  };
}

export function getNavigationMenu(currentPath: string): NavigationItem[] {
  return buildNavigationMenu(currentPath);
}

export { getHomePagePlaceholder, getProfilePageData, validateRegistrationForm };
