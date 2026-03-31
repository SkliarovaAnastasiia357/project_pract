package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"time"
)

var ErrInvalidCredentials = errors.New("Неверный email или пароль")

type User struct {
	ID             string
	Email          string
	Name           string
	HashedPassword string
	CreatedAt      time.Time
}

type Session struct {
	UserID        string
	Authenticated bool
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func ValidateRegistration(email, name, password, confirmPassword string) map[string]string {
	validationErrors := map[string]string{}
	emailPattern := regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

	if !emailPattern.MatchString(email) {
		validationErrors["email"] = "Некорректный формат email"
	}

	if name == "" {
		validationErrors["name"] = "Имя обязательно"
	}

	if len(password) < 6 {
		validationErrors["password"] = "Пароль должен быть не короче 6 символов"
	}

	if password != confirmPassword {
		validationErrors["confirmPassword"] = "Пароль и подтверждение пароля не совпадают"
	}

	return validationErrors
}

func RegisterUser(users []User, email, name, password, confirmPassword string, createdAt time.Time) (User, Session, map[string]string) {
	validationErrors := ValidateRegistration(email, name, password, confirmPassword)
	if len(validationErrors) > 0 {
		return User{}, Session{}, validationErrors
	}

	for _, user := range users {
		if user.Email == email {
			return User{}, Session{}, map[string]string{
				"email": "Пользователь с таким email уже существует",
			}
		}
	}

	createdUser := User{
		ID:             "user-1",
		Email:          email,
		Name:           name,
		HashedPassword: hashPassword(password),
		CreatedAt:      createdAt,
	}

	return createdUser, Session{UserID: createdUser.ID, Authenticated: true}, nil
}

func LoginUser(users []User, email, password string) (Session, error) {
	passwordHash := hashPassword(password)

	for _, user := range users {
		if user.Email == email && user.HashedPassword == passwordHash {
			return Session{UserID: user.ID, Authenticated: true}, nil
		}
	}

	return Session{}, ErrInvalidCredentials
}

func LogoutUser(Session) Session {
	return Session{UserID: "", Authenticated: false}
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
