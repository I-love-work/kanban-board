import React, { useMemo, useRef, useState } from "react";
import { API_ORIGIN } from "../api/client";
import { uploadAvatar } from "../api/profileApi";

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

const avatarButtonStyle = (hasAvatar, uploading) => ({
  width: 92,
  height: 92,
  borderRadius: "50%",
  border: "2px solid #c7d2fe",
  background: hasAvatar ? "#ffffff" : "#4f46e5",
  color: "#ffffff",
  fontSize: 32,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: uploading ? "not-allowed" : "pointer",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(79, 70, 229, 0.25)",
  opacity: uploading ? 0.85 : 1,
  transition: "box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
});

const avatarUploadingOverlay = {
  position: "absolute",
  inset: 0,
  background: "rgba(79,70,229,0.55)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 600,
};

const avatarHintStyle = {
  marginTop: 10,
  fontSize: 12,
  color: "#6366f1",
};

const uploadErrorStyle = {
  marginTop: 16,
  background: "#fee2e2",
  color: "#b91c1c",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 14,
};

export default function ProfilePage({
  user,
  onAvatarUpdated,
  onAuthError,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const avatarSrc = useMemo(
    () => resolveAvatarUrl(user?.avatarUrl),
    [user?.avatarUrl]
  );
  const hasAvatar = Boolean(avatarSrc);

  if (!user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Unknown";

  const displayName = user.name || "No display name";

  const emailProvider =
    typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[1]
      : "Email";

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || (user.email ? user.email[0].toUpperCase() : "?");

  const handleAvatarClick = () => {
    if (uploading || !fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    setUploadError("");

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Please choose an image smaller than 5MB.");
      input.value = "";
      return;
    }

    setUploading(true);

    try {
      const { user: updatedUser } = await uploadAvatar(file);
      if (typeof onAvatarUpdated === "function") {
        onAvatarUpdated(updatedUser);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        if (typeof onAuthError === "function") {
          onAuthError();
        }
      } else {
        const message =
          err?.response?.data?.error ||
          "Failed to upload avatar. Please try again.";
        setUploadError(message);
      }
    } finally {
      setUploading(false);
      if (input) {
        input.value = "";
      }
    }
  };

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
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploading}
              style={avatarButtonStyle(hasAvatar, uploading)}
              aria-label="Update avatar"
            >
              {hasAvatar ? (
                <img
                  src={avatarSrc}
                  alt="Profile avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
              {uploading ? (
                <div style={avatarUploadingOverlay}>Uploading…</div>
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div style={avatarHintStyle}>
              {uploading ? "Uploading avatar…" : "Click avatar to update"}
            </div>
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

        {uploadError ? (
          <div style={uploadErrorStyle}>{uploadError}</div>
        ) : null}

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

function resolveAvatarUrl(rawUrl) {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }
  const normalized = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${API_ORIGIN}${normalized}`;
}
