package tests

import (
	"errors"
	"testing"
	"time"

	"github.com/SkliarovaAnastasiia357/project_pract/src/backend/auth"
)

func TestRegisterUserCreatesHashedUserModel(t *testing.T) {
	createdAt := time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC)

	user, session, validationErrors := auth.RegisterUser(
		nil,
		"user@example.com",
		"Анна",
		"123456",
		"123456",
		createdAt,
	)

	if validationErrors != nil {
		t.Fatalf("expected successful registration, got validation errors: %v", validationErrors)
	}

	if user.ID == "" {
		t.Fatalf("expected generated user id")
	}

	if user.Email != "user@example.com" || user.Name != "Анна" {
		t.Fatalf("expected correct user data, got %+v", user)
	}

	if user.HashedPassword == "" || user.HashedPassword == "123456" {
		t.Fatalf("expected hashed password to be stored instead of raw password")
	}

	if !user.CreatedAt.Equal(createdAt) {
		t.Fatalf("expected created_at to be set correctly")
	}

	if !session.Authenticated {
		t.Fatalf("expected authenticated session after registration")
	}
}

func TestRegisterUserRejectsDuplicateEmail(t *testing.T) {
	existingUsers := []auth.User{
		{
			ID:             "user-1",
			Email:          "existing@example.com",
			Name:           "Existing",
			HashedPassword: "hashed",
			CreatedAt:      time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC),
		},
	}

	_, _, validationErrors := auth.RegisterUser(
		existingUsers,
		"existing@example.com",
		"Another User",
		"123456",
		"123456",
		time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC),
	)

	if validationErrors["email"] != "Пользователь с таким email уже существует" {
		t.Fatalf("expected duplicate email error, got %v", validationErrors)
	}
}

func TestValidateRegistrationReturnsExpectedErrors(t *testing.T) {
	validationErrors := auth.ValidateRegistration("broken-email", "User", "123", "321")

	if validationErrors["email"] != "Некорректный формат email" {
		t.Fatalf("expected email validation error, got %v", validationErrors)
	}

	if validationErrors["password"] != "Пароль должен быть не короче 6 символов" {
		t.Fatalf("expected password validation error, got %v", validationErrors)
	}

	if validationErrors["confirmPassword"] != "Пароль и подтверждение пароля не совпадают" {
		t.Fatalf("expected confirm password validation error, got %v", validationErrors)
	}
}

func TestLoginUserAuthenticatesWithCorrectCredentials(t *testing.T) {
	users := []auth.User{
		{
			ID:             "user-1",
			Email:          "user@example.com",
			Name:           "Анна",
			HashedPassword: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
			CreatedAt:      time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC),
		},
	}

	session, err := auth.LoginUser(users, "user@example.com", "123456")

	if err != nil {
		t.Fatalf("expected successful login, got error %v", err)
	}

	if !session.Authenticated {
		t.Fatalf("expected authenticated session after successful login")
	}
}

func TestLoginUserReturnsGenericErrorForInvalidCredentials(t *testing.T) {
	users := []auth.User{
		{
			ID:             "user-1",
			Email:          "user@example.com",
			Name:           "Анна",
			HashedPassword: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
			CreatedAt:      time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC),
		},
	}

	_, err := auth.LoginUser(users, "user@example.com", "wrong-password")

	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected generic invalid credentials error, got %v", err)
	}
}

func TestLogoutUserMakesProtectedEndpointUnavailable(t *testing.T) {
	activeSession := auth.Session{
		UserID:        "user-1",
		Authenticated: true,
	}

	loggedOutSession := auth.LogoutUser(activeSession)

	if auth.CanAccessProtectedEndpoint(loggedOutSession) {
		t.Fatalf("expected protected endpoint to be unavailable after logout")
	}
}

func TestProtectedEndpointRequiresAuthorization(t *testing.T) {
	if auth.CanAccessProtectedEndpoint(auth.Session{Authenticated: false}) {
		t.Fatalf("expected unauthorized user to be blocked from protected endpoint")
	}

	if !auth.CanAccessProtectedEndpoint(auth.Session{Authenticated: true}) {
		t.Fatalf("expected authorized user to access protected endpoint")
	}
}

func TestGetCurrentUserReturnsUserFromAuthenticatedSession(t *testing.T) {
	users := []auth.User{
		{
			ID:             "user-1",
			Email:          "user@example.com",
			Name:           "Анна",
			HashedPassword: "hashed",
			CreatedAt:      time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC),
		},
	}

	currentUser, ok := auth.GetCurrentUser(users, auth.Session{
		UserID:        "user-1",
		Authenticated: true,
	})

	if !ok {
		t.Fatalf("expected current user to be found for authenticated session")
	}

	if currentUser.Email != "user@example.com" || currentUser.Name != "Анна" {
		t.Fatalf("expected correct current user data, got %+v", currentUser)
	}
}
