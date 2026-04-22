import assert from "node:assert/strict";

import {
  canAccessProtectedPage,
  getHomePagePlaceholder,
  getLoginFormFields,
  getNavigationMenu,
  getProfilePageData,
  getRegistrationFormFields,
  loginUser,
  logoutUser,
  registerUser,
  resolveProtectedPageAccess,
  validateRegistrationForm,
} from "../../src/frontend/authMvp.ts";

export function runFrontendTests(): void {
  assert.deepEqual(
    getRegistrationFormFields(),
    ["Email", "Имя", "Пароль", "Подтверждение пароля"],
    "форма регистрации должна содержать email, имя, пароль и подтверждение пароля",
  );

  const users = [
    {
      id: "user-1",
      email: "existing@example.com",
      name: "Existing User",
      password: "StrongPass1",
    },
  ];

  const registrationResult = registerUser(users, {
    email: "newuser@example.com",
    name: "Новый пользователь",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  assert.equal(registrationResult.success, true, "валидный пользователь должен успешно зарегистрироваться");
  assert.equal(
    registrationResult.session.authenticated,
    true,
    "после регистрации пользователь должен автоматически войти в систему",
  );
  assert.equal(registrationResult.nextPage, "/home", "после регистрации должен быть переход на главную страницу");

  const duplicateRegistration = registerUser(users, {
    email: "existing@example.com",
    name: "Duplicate User",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  assert.equal(duplicateRegistration.success, false, "нельзя зарегистрироваться с уже существующим email");
  assert.equal(
    duplicateRegistration.errors.email,
    "Пользователь с таким email уже существует",
    "должна отображаться ошибка о существующем email",
  );

  const invalidEmailErrors = validateRegistrationForm({
    email: "broken-email",
    name: "User",
    password: "123456",
    confirmPassword: "123456",
  });
  assert.equal(invalidEmailErrors.email, "Некорректный формат email", "должна отображаться ошибка при некорректном email");

  const shortPasswordErrors = validateRegistrationForm({
    email: "user@example.com",
    name: "User",
    password: "123",
    confirmPassword: "123",
  });
  assert.equal(
    shortPasswordErrors.password,
    "Пароль должен быть не короче 6 символов",
    "должна отображаться ошибка при коротком пароле",
  );

  const mismatchErrors = validateRegistrationForm({
    email: "user@example.com",
    name: "User",
    password: "123456",
    confirmPassword: "654321",
  });
  assert.equal(
    mismatchErrors.confirmPassword,
    "Пароль и подтверждение пароля не совпадают",
    "должна отображаться ошибка при несовпадении паролей",
  );

  assert.deepEqual(getLoginFormFields(), ["Email", "Пароль"], "форма входа должна содержать email и пароль");

  const loginSuccess = loginUser(
    [{ id: "user-1", email: "anastasiia@example.com", name: "Anastasiia", password: "StrongPass1" }],
    { email: "anastasiia@example.com", password: "StrongPass1" },
  );
  assert.equal(loginSuccess.success, true, "пользователь с корректными данными должен успешно войти");
  assert.equal(loginSuccess.nextPage, "/home", "после входа должен быть переход на главную страницу");

  const loginFailure = loginUser(
    [{ id: "user-1", email: "anastasiia@example.com", name: "Anastasiia", password: "StrongPass1" }],
    { email: "anastasiia@example.com", password: "WrongPass1" },
  );
  assert.equal(loginFailure.success, false, "при неверных данных вход невозможен");
  assert.equal(loginFailure.error, "Неверный email или пароль", "должна отображаться общая ошибка авторизации");

  const authenticatedSession = {
    authenticated: true,
    user: { id: "user-1", email: "anna@example.com", name: "Анна", password: "StrongPass1" },
  };
  assert.equal(
    canAccessProtectedPage(authenticatedSession),
    true,
    "авторизованный пользователь должен иметь доступ к защищённой странице",
  );

  const loggedOutSession = logoutUser();
  assert.equal(loggedOutSession.authenticated, false, "после выхода сессия должна завершаться");
  assert.deepEqual(
    resolveProtectedPageAccess(loggedOutSession),
    { allowed: false, redirectTo: "/login" },
    "после выхода защищённая страница должна редиректить на страницу входа",
  );

  const homeMenu = getNavigationMenu("/home");
  assert.deepEqual(
    homeMenu.map((item) => item.label),
    ["Главная", "Мой профиль", "Новый проект", "Выйти"],
    "меню должно содержать нужные пункты",
  );
  assert.equal(homeMenu.find((item) => item.path === "/home")?.active, true, "текущий пункт меню должен быть выделен");

  const profileMenu = getNavigationMenu("/profile");
  assert.equal(profileMenu.find((item) => item.path === "/profile")?.active, true, "на странице профиля должен быть активен пункт профиля");
  assert.equal(
    profileMenu.find((item) => item.path === "/projects/new")?.active,
    false,
    "пункт создания проекта не должен быть активен на странице профиля",
  );

  assert.equal(
    getHomePagePlaceholder().includes("Здесь будет лента проектов / подбор команд"),
    true,
    "главная страница должна содержать информативный placeholder",
  );

  assert.deepEqual(
    getProfilePageData({ name: "Анна", email: "anna@example.com" }),
    {
      name: "Анна",
      email: "anna@example.com",
      note: "Описание и навыки можно редактировать прямо в профиле",
    },
    "страница профиля должна показывать имя, email и подсказку по редактированию",
  );
}
