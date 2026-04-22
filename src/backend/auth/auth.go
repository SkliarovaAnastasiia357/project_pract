package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"
)

var (
	emailPattern          = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	ErrInvalidCredentials = errors.New("invalid credentials")
)

type User struct {
	ID             string
	Name           string
	Email          string
	HashedPassword string
	Bio            string
	CreatedAt      time.Time
}

type Session struct {
	UserID        string
	Authenticated bool
}

func ValidateRegistration(email, name, password, confirmPassword string) map[string]string {
	validationErrors := make(map[string]string)
	normalizedEmail := normalizeEmail(email)

	if !emailPattern.MatchString(normalizedEmail) {
		validationErrors["email"] = "Некорректный формат email"
	}

	if strings.TrimSpace(name) == "" {
		validationErrors["name"] = "Имя обязательно"
	}

	if len(password) < 6 {
		validationErrors["password"] = "Пароль должен быть не короче 6 символов"
	}

	if password != confirmPassword {
		validationErrors["confirmPassword"] = "Пароль и подтверждение пароля не совпадают"
	}

	if len(validationErrors) == 0 {
		return nil
	}

	return validationErrors
}

func RegisterUser(existingUsers []User, email, name, password, confirmPassword string, createdAt time.Time) (User, Session, map[string]string) {
	validationErrors := ValidateRegistration(email, name, password, confirmPassword)
	normalizedEmail := normalizeEmail(email)

	if emailExists(existingUsers, normalizedEmail) {
		if validationErrors == nil {
			validationErrors = make(map[string]string)
		}

		validationErrors["email"] = "Пользователь с таким email уже существует"
	}

	if validationErrors != nil {
		return User{}, Session{}, validationErrors
	}

	user := User{
		ID:             buildUserID(normalizedEmail, createdAt),
		Name:           strings.TrimSpace(name),
		Email:          normalizedEmail,
		HashedPassword: hashPassword(password),
		Bio:            "",
		CreatedAt:      createdAt,
	}

	session := Session{
		UserID:        user.ID,
		Authenticated: true,
	}

	return user, session, nil
}

func LoginUser(users []User, email, password string) (Session, error) {
	normalizedEmail := normalizeEmail(email)
	passwordHash := hashPassword(password)

	for _, user := range users {
		if normalizeEmail(user.Email) == normalizedEmail && user.HashedPassword == passwordHash {
			return Session{
				UserID:        user.ID,
				Authenticated: true,
			}, nil
		}
	}

	return Session{}, ErrInvalidCredentials
}

func LogoutUser(session Session) Session {
	return Session{}
}

func CanAccessProtectedEndpoint(session Session) bool {
	return session.Authenticated
}

func GetCurrentUser(users []User, session Session) (User, bool) {
	if !session.Authenticated {
		return User{}, false
	}

	for _, user := range users {
		if user.ID == session.UserID {
			return user, true
		}
	}

	return User{}, false
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func emailExists(users []User, normalizedEmail string) bool {
	for _, user := range users {
		if normalizeEmail(user.Email) == normalizedEmail {
			return true
		}
	}

	return false
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func buildUserID(email string, createdAt time.Time) string {
	sum := sha256.Sum256([]byte(email + createdAt.UTC().Format(time.RFC3339Nano)))
	return "user-" + hex.EncodeToString(sum[:8])
}
