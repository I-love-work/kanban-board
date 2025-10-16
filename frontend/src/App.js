import React, { useEffect, useState } from "react";
import Board from "./components/Board";
import AuthForm from "./components/AuthForm";
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

  if (!user) {
    return (
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
    );
  }

  const greeting = user.name ? `Hi, ${user.name}` : user.email;

  return (
    <div style={{ padding: 20, background: "#f5f5f5", minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 960,
          margin: "0 auto 24px",
          padding: "0 8px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px 0" }}>🗂️ Simple Kanban Board</h2>
          <span style={{ color: "#6b7280", fontSize: 14 }}>{greeting}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "8px 14px",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Log out
        </button>
      </header>

      <Board
        columns={columns}
        setColumns={setColumns}
        onAuthError={handleUnauthorized}
      />
    </div>
  );
}
