import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import Board from "./components/Board";
import AuthForm from "./components/AuthForm";
import ProfilePage from "./components/ProfilePage";
import BoardList from "./components/BoardList";
import {
  clearAuth,
  fetchCurrentUser,
  login,
  persistAuth,
  register,
} from "./api/authApi";
import { getStoredToken, API_ORIGIN } from "./api/client";
import { createBoard, getBoard, getBoards } from "./api/boardApi";

export default function App() {
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
          onLogout={handleLogout}
          onAuthError={handleUnauthorized}
          onUserUpdate={setUser}
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

function AuthenticatedApp({ user, onLogout, onAuthError, onUserUpdate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardLoadError, setBoardLoadError] = useState("");
  const [boardCreateError, setBoardCreateError] = useState("");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function fetchBoards() {
      setBoardsLoading(true);
      setBoardLoadError("");
      try {
        const list = await getBoards();
        if (!cancelled) {
          setBoards(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          onAuthError();
          return;
        }
        setBoardLoadError("Unable to load boards right now.");
      } finally {
        if (!cancelled) {
          setBoardsLoading(false);
        }
      }
    }
    fetchBoards();
    return () => {
      cancelled = true;
    };
  }, [onAuthError]);

  const greeting = useMemo(() => {
    if (user.name) return `Hi, ${user.name}`;
    if (user.email) return user.email;
    return "Welcome back";
  }, [user.name, user.email]);

  const initials = useMemo(() => getUserInitials(user), [user]);
  const avatarSrc = useMemo(
    () => resolveAvatarUrl(user?.avatarUrl),
    [user?.avatarUrl]
  );
  const hasAvatar = Boolean(avatarSrc);

  const refreshBoards = useCallback(async () => {
    setBoardLoadError("");
    setBoardsLoading(true);
    try {
      const list = await getBoards();
      setBoards(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err?.response?.status === 401) {
        onAuthError();
        return;
      }
      setBoardLoadError("Unable to load boards right now.");
    } finally {
      setBoardsLoading(false);
    }
  }, [onAuthError]);

  const handleCreateBoard = useCallback(
    async (name) => {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) {
        setBoardCreateError("Board name cannot be empty.");
        return null;
      }
      setBoardCreateError("");
      setIsCreatingBoard(true);
      try {
        const created = await createBoard({ name: trimmedName });
        setBoards((prev) => [
          ...prev,
          { ...created, taskCount: created.taskCount || 0 },
        ]);
        navigate(`/boards/${created.id}`);
        return created;
      } catch (err) {
        if (err?.response?.status === 401) {
          onAuthError();
          return null;
        }
        const message =
          err?.response?.data?.error || "Unable to create board right now.";
        setBoardCreateError(message);
        return null;
      } finally {
        setIsCreatingBoard(false);
      }
    },
    [navigate, onAuthError]
  );

  const handleTaskCountChange = useCallback((boardId, count) => {
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId ? { ...board, taskCount: count } : board
      )
    );
  }, []);

  const handleBoardDetailsChange = useCallback((boardId, updates) => {
    if (!boardId || !updates || typeof updates !== "object") {
      return;
    }
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId ? { ...board, ...updates } : board
      )
    );
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const isBoardActive =
    location.pathname === "/" || location.pathname.startsWith("/boards");

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
                border: hasAvatar ? "2px solid #6366f1" : "2px solid #c7d2fe",
                background: hasAvatar ? "#ffffff" : "#4338ca",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                position: "relative",
                boxShadow: menuOpen
                  ? "0 0 0 4px rgba(99,102,241,0.2)"
                  : "0 6px 16px rgba(17,24,39,0.15)",
                padding: 0,
                overflow: "hidden",
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
            >
              {hasAvatar ? (
                <img
                  src={avatarSrc}
                  alt="User avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                initials
              )}
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
                <BoardList
                  boards={boards}
                  isLoading={boardsLoading}
                  error={boardLoadError}
                  onRetry={refreshBoards}
                  onCreateBoard={handleCreateBoard}
                  isCreating={isCreatingBoard}
                  creationError={boardCreateError}
                />
              }
            />
            <Route
              path="/boards/:boardId"
              element={
                <BoardPage
                  boards={boards}
                  boardsLoading={boardsLoading}
                  setBoards={setBoards}
                  onAuthError={onAuthError}
                  onTaskCountChange={handleTaskCountChange}
                  onBoardDetailsChange={handleBoardDetailsChange}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  user={user}
                  onProfileUpdated={onUserUpdate}
                  onAuthError={onAuthError}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function BoardPage({
  boards,
  boardsLoading,
  setBoards,
  onAuthError,
  onTaskCountChange,
  onBoardDetailsChange,
}) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [fetchingBoard, setFetchingBoard] = useState(false);
  const [boardError, setBoardError] = useState("");

  const board = useMemo(
    () => boards.find((item) => item.id === boardId),
    [boards, boardId]
  );

  useEffect(() => {
    if (board) {
      setBoardError("");
    }
  }, [board]);

  useEffect(() => {
    if (!boardId || board || boardsLoading) {
      return;
    }

    let cancelled = false;
    setFetchingBoard(true);
    setBoardError("");

    async function loadBoard() {
      try {
        const fetched = await getBoard(boardId);
        if (cancelled) {
          return;
        }
        setBoards((prev) => {
          if (prev.some((item) => item.id === fetched.id)) {
            return prev;
          }
          return [...prev, { ...fetched, taskCount: fetched.taskCount || 0 }];
        });
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err?.response?.status === 401) {
          onAuthError();
          return;
        }
        if (err?.response?.status === 404) {
          setBoardError("Board not found.");
        } else {
          setBoardError("Unable to open this board right now.");
        }
      } finally {
        if (!cancelled) {
          setFetchingBoard(false);
        }
      }
    }

    loadBoard();

    return () => {
      cancelled = true;
    };
  }, [board, boardId, boardsLoading, onAuthError, setBoards]);

  if (!boardId) {
    return <Navigate to="/" replace />;
  }

  if (!board && (boardsLoading || fetchingBoard)) {
    return (
      <div
        style={{
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
        }}
      >
        <p style={{ color: "#6b7280", fontSize: 15 }}>Loading board...</p>
      </div>
    );
  }

  if (boardError) {
    return (
      <div
        style={{
          background: "#fff1f2",
          borderRadius: 12,
          padding: "24px 28px",
          border: "1px solid #fecdd3",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, color: "#be123c" }}>
          {boardError}
        </h3>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#be123c",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to boards
        </button>
      </div>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <Board
      boardId={board.id}
      boardName={board.name}
      boardDescription={board.description}
      onAuthError={onAuthError}
      onTaskCountChange={onTaskCountChange}
      onBoardDetailsChange={onBoardDetailsChange}
    />
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

const resolveAvatarUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }
  const normalized = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${API_ORIGIN}${normalized}`;
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
