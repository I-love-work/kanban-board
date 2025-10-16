import React, { useEffect, useState } from "react";

const initialState = {
  email: "",
  password: "",
  name: "",
};

export default function AuthForm({
  mode = "login",
  onModeChange,
  onSubmit,
  error,
  isSubmitting,
}) {
  const [formState, setFormState] = useState(initialState);
  const isRegister = mode === "register";

  useEffect(() => {
    setFormState(initialState);
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      email: formState.email,
      password: formState.password,
      name: formState.name,
    });
  };

  return (
    <div
      style={{
        maxWidth: 360,
        margin: "80px auto",
        padding: 24,
        borderRadius: 8,
        background: "#ffffff",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginTop: 0, textAlign: "center" }}>
        {isRegister ? "Create your account" : "Welcome back"}
      </h2>
      <p style={{ textAlign: "center", color: "#6b7280", marginTop: 0 }}>
        {isRegister
          ? "Register to start organizing your tasks"
          : "Log in to continue with your board"}
      </p>
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
              Name
            </span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              placeholder="Optional"
              style={inputStyle}
              autoComplete="name"
            />
          </label>
        )}

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Email
          </span>
          <input
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            style={inputStyle}
            autoComplete={isRegister ? "email" : "username"}
          />
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Password
          </span>
          <input
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            style={inputStyle}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        {error ? (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "8px 12px",
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 6,
            border: "none",
            background: "#4f46e5",
            color: "#ffffff",
            fontSize: 16,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.75 : 1,
            transition: "background 0.2s ease",
          }}
        >
          {isSubmitting
            ? isRegister
              ? "Creating account..."
              : "Signing in..."
            : isRegister
            ? "Sign up"
            : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, textAlign: "center" }}>
        {isRegister ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => onModeChange(isRegister ? "login" : "register")}
          style={{
            border: "none",
            background: "none",
            color: "#4f46e5",
            cursor: "pointer",
            fontWeight: 600,
            padding: 0,
          }}
        >
          {isRegister ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
};
