import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BoardList({
  boards,
  isLoading,
  error,
  onRetry,
  onCreateBoard,
  isCreating,
  creationError,
}) {
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = boardName.trim();
    if (!trimmed) return;
    const created = await onCreateBoard(trimmed);
    if (created) {
      setBoardName("");
    }
  };

  const hasBoards = Array.isArray(boards) && boards.length > 0;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "24px 28px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Your boards</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            Create separate boards to organize different projects or teams.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            placeholder="Board name"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              minWidth: 220,
            }}
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={!boardName.trim() || isCreating}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#4338ca",
              color: "#ffffff",
              fontWeight: 600,
              cursor:
                !boardName.trim() || isCreating ? "not-allowed" : "pointer",
              opacity: !boardName.trim() || isCreating ? 0.65 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {isCreating ? "Creating..." : "Create board"}
          </button>
        </form>
      </div>

      {creationError ? (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          {creationError}
        </div>
      ) : null}

      {isLoading ? (
        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            color: "#6b7280",
            fontSize: 15,
          }}
        >
          Loading boards...
        </div>
      ) : error ? (
        <div
          style={{
            marginTop: 28,
            padding: "18px",
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #cbd5f5",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 12px 0", color: "#475569", fontSize: 15 }}>
            {error}
          </p>
          {typeof onRetry === "function" ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : hasBoards ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
            marginTop: 28,
          }}
        >
          {boards.map((board) => {
            const description =
              typeof board.description === "string"
                ? board.description.trim()
                : "";
            const displayDescription = description || "No description yet";
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => navigate(`/boards/${board.id}`)}
                style={{
                  textAlign: "left",
                  background: "#f8fafc",
                  borderRadius: 12,
                  padding: "18px 20px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 10px 20px rgba(15,23,42,0.08)",
                }}
              >
                <h3 style={{ margin: "0 0 8px 0", fontSize: 18 }}>
                  {board.name || "Untitled board"}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: 14,
                    fontStyle: description ? "normal" : "italic",
                  }}
                >
                  {displayDescription}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            marginTop: 32,
            padding: "32px 24px",
            borderRadius: 12,
            border: "1px dashed #c7d2fe",
            textAlign: "center",
            color: "#6366f1",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>You do not have any boards yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Give your first board a name and start organizing tasks.
          </p>
        </div>
      )}
    </div>
  );
}
