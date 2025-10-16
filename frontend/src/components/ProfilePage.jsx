import React from "react";

const cardStyle = {
  maxWidth: 640,
  margin: "40px auto",
  background: "#ffffff",
  borderRadius: 12,
  padding: "32px 36px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
};

const sectionTitleStyle = {
  margin: "24px 0 12px",
  fontSize: 18,
  fontWeight: 600,
  color: "#1f2937",
};

const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const labelStyle = {
  fontSize: 15,
  color: "#6b7280",
};

const valueStyle = {
  fontSize: 16,
  fontWeight: 500,
  color: "#1f2937",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#eef2ff",
  color: "#4338ca",
  borderRadius: 9999,
  padding: "8px 14px",
  fontSize: 14,
  fontWeight: 600,
};

export default function ProfilePage({ user }) {
  if (!user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Unknown";

  const displayName = user.name || "No display name";

  const emailProvider =
    typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[1]
      : "Email";

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || (user.email ? user.email[0].toUpperCase() : "?");

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#4f46e5",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {initials}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: "#1e1b4b" }}>
              {displayName}
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Welcome back! Stay on top of your personal kanban.
            </p>
            <div style={{ marginTop: 12 }}>
              <span style={badgeStyle}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4338ca",
                  }}
                />
                Signed in
              </span>
            </div>
          </div>
        </div>

        <section>
          <h2 style={sectionTitleStyle}>Account details</h2>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Email</span>
            <span style={valueStyle}>{user.email}</span>
          </div>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Email provider</span>
            <span style={valueStyle}>{emailProvider}</span>
          </div>
          <div style={infoRowStyle}>
            <span style={labelStyle}>Joined</span>
            <span style={valueStyle}>{joinDate}</span>
          </div>
        </section>

        <section>
          <h2 style={sectionTitleStyle}>Board tips</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#475569" }}>
            <li style={{ marginBottom: 8 }}>
              Drag tasks on the board to adjust priority and workflow quickly.
            </li>
            <li style={{ marginBottom: 8 }}>
              Add tags and attachments so teammates understand the context faster.
            </li>
            <li>Keep task descriptions clear to raise completion rates.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
