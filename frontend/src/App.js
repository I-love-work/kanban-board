import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Board from "./components/Board";
import AuthForm from "./components/AuthForm";
import ProfilePage from "./components/ProfilePage";
import {
  clearAuth,
  fetchCurrentUser,
  login,
  persistAuth,
  register,
} from "./api/authApi";
import { getStoredToken } from "./api/client";

const initialColumns = {
  todo: {
    id: "todo",
    name: "To Do",
    tasks: [],
  },
  inprogress: {
    id: "inprogress",
    name: "In Progress",
    tasks: [],
  },
  done: {
    id: "done",
    name: "Done",
    tasks: [],
  },
};

export default function App() {
  const [columns, setColumns] = useState(initialColumns);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    async function bootstrapAuth() {
      const token = getStoredToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const { user: me } = await fetchCurrentUser();
        setUser(me);
      } catch {
        clearAuth();
      } finally {
        setCheckingAuth(false);
      }
    }
    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setColumns(initialColumns);
    }
  }, [user]);

  const handleAuthSubmit = async ({ email, password, name }) => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = password || "";
    const trimmedName = (name || "").trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthError("Email and password are required");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");

    try {
      const payload = {
        email: trimmedEmail,
        password: trimmedPassword,
      };
      if (authMode === "register" && trimmedName) {
        payload.name = trimmedName;
      }

      const authFn = authMode === "login" ? login : register;
      const { user: authedUser, token } = await authFn(payload);
      persistAuth(token);
      setUser(authedUser);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        (authMode === "login"
          ? "Unable to sign in. Check your credentials."
          : "Unable to create account right now.");
      setAuthError(message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthMode("login");
    setAuthError("");
  };

  const handleUnauthorized = () => {
    clearAuth();
    setUser(null);
    setAuthMode("login");
    setAuthError("Session expired. Please sign in again.");
    setAuthSubmitting(false);
  };

  if (checkingAuth) {
    return (
      <BrowserRouter>
        <LoadingScreen />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <AuthForm
          mode={authMode}
          onModeChange={(next) => {
            setAuthMode(next);
            setAuthError("");
          }}
          onSubmit={handleAuthSubmit}
          error={authError}
          isSubmitting={authSubmitting}
        />
      ) : (
        <AuthenticatedApp
          user={user}
          columns={columns}
          setColumns={setColumns}
          onLogout={handleLogout}
          onAuthError={handleUnauthorized}
        />
      )}
    </BrowserRouter>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
      }}
    >
      <p style={{ fontSize: 16, color: "#4b5563" }}>Loading...</p>
    </div>
  );
}

function AuthenticatedApp({
  user,
  columns,
  setColumns,
  onLogout,
  onAuthError,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarButtonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuOpen) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const greeting = useMemo(() => {
    if (user.name) return `Hi, ${user.name}`;
    if (user.email) return user.email;
    return "Welcome back";
  }, [user.name, user.email]);

  const initials = useMemo(() => getUserInitials(user), [user]);

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const isBoardActive = location.pathname === "/";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <div
        style={{
          padding: "20px 24px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            position: "relative",
          }}
        >
          <button
            type="button"
            onClick={() => handleNavigate("/")}
            style={{
              border: "none",
              background: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <h2 style={{ margin: "0 0 4px 0" }}>🗂️ Simple Kanban Board</h2>
            <span style={{ color: "#6b7280", fontSize: 14 }}>{greeting}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              onClick={() => handleNavigate("/")}
              style={navButtonStyle(isBoardActive)}
            >
              Board
            </button>
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "2px solid #c7d2fe",
                background: "#4338ca",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                position: "relative",
                boxShadow: menuOpen
                  ? "0 0 0 4px rgba(99,102,241,0.15)"
                  : "0 6px 16px rgba(17,24,39,0.15)",
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {initials}
            </button>
            {menuOpen ? (
              <div
                ref={menuRef}
                style={{
                  position: "absolute",
                  top: 72,
                  right: 0,
                  background: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                  padding: "12px 0",
                  minWidth: 200,
                  zIndex: 20,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    padding: "8px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 14, color: "#94a3b8" }}>
                    Signed in as
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#1f2937",
                      marginTop: 4,
                      wordBreak: "break-all",
                    }}
                  >
                    {user.email || "Unknown user"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate("/profile")}
                  style={menuItemStyle}
                >
                  Open profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  style={menuItemStyle}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <Board
                  columns={columns}
                  setColumns={setColumns}
                  onAuthError={onAuthError}
                />
              }
            />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

const navButtonStyle = (isActive) => ({
  borderRadius: 30,
  border: "none",
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  color: isActive ? "#ffffff" : "#4c1d95",
  background: isActive ? "#4c1d95" : "rgba(79,70,229,0.12)",
  transition: "all 0.2s ease",
});

const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "10px 20px",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  color: "#1f2937",
};

const getUserInitials = (user) => {
  if (!user) return "?";
  const source =
    typeof user.name === "string" && user.name.trim()
      ? user.name
      : user.email || "";
  const initials = source
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (initials) return initials;
  return "?";
};
