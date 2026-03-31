const INVALID_CREDENTIALS_ERROR = "Неверный email или пароль";

export function getRegistrationFormFields() {
  return ["Email", "Имя", "Пароль", "Подтверждение пароля"];
}

export function validateRegistrationForm(form) {
  const errors = {};

  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Некорректный формат email";
  }

  if (!form.name || form.name.trim().length === 0) {
    errors.name = "Имя обязательно";
  }

  if (!form.password || form.password.length < 6) {
    errors.password = "Пароль должен быть не короче 6 символов";
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Пароль и подтверждение пароля не совпадают";
  }

  return errors;
}

export function registerUser(users, form) {
  const errors = validateRegistrationForm(form);
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const alreadyExists = users.some((user) => user.email === form.email);
  if (alreadyExists) {
    return {
      success: false,
      errors: { email: "Пользователь с таким email уже существует" },
    };
  }

  const user = {
    id: `user-${users.length + 1}`,
    email: form.email,
    name: form.name,
    password: form.password,
  };

  return {
    success: true,
    user,
    users: [...users, user],
    session: { authenticated: true, user },
    nextPage: "/home",
  };
}

export function getLoginFormFields() {
  return ["Email", "Пароль"];
}

export function loginUser(users, credentials) {
  const user = users.find(
    (item) => item.email === credentials.email && item.password === credentials.password,
  );

  if (!user) {
    return { success: false, error: INVALID_CREDENTIALS_ERROR };
  }

  return {
    success: true,
    session: { authenticated: true, user },
    nextPage: "/home",
  };
}

export function logoutUser() {
  return { authenticated: false, user: null };
}

export function canAccessProtectedPage(session) {
  return Boolean(session?.authenticated);
}

export function resolveProtectedPageAccess(session) {
  if (canAccessProtectedPage(session)) {
    return { allowed: true, redirectTo: null };
  }

  return { allowed: false, redirectTo: "/login" };
}

export function getNavigationMenu(currentPath) {
  return [
    { label: "Главная", path: "/home", active: currentPath === "/home" },
    { label: "Мой профиль", path: "/profile", active: currentPath === "/profile" },
    { label: "Выйти", path: "/logout", active: currentPath === "/logout" },
  ];
}

export function getHomePagePlaceholder() {
  return "Здесь будет лента проектов / подбор команд";
}

export function getProfilePageData(user) {
  return {
    name: user.name,
    email: user.email,
    note: "Редактирование профиля будет в следующей версии",
  };
}

export { INVALID_CREDENTIALS_ERROR };
