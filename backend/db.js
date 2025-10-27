const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(path.resolve(__dirname, "./kanban.db"));

const ensureTaskUserIndex = () => {
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)",
    (err) => {
      if (err) {
        if (err.message && err.message.includes("no such column: user_id")) {
          return;
        }
        console.error("Failed to create idx_tasks_user_id index:", err);
      }
    }
  );
};

const ensureTaskBoardIndex = () => {
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id)",
    (err) => {
      if (err) {
        if (err.message && err.message.includes("no such column: board_id")) {
          return;
        }
        console.error("Failed to create idx_tasks_board_id index:", err);
      }
    }
  );
};

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      avatar_url TEXT
    )
  `);

  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error("Failed to inspect users table:", err);
      return;
    }

    const hasAvatarUrl = columns.some(
      (column) => column.name === "avatar_url"
    );

    if (!hasAvatarUrl) {
      db.run(
        "ALTER TABLE users ADD COLUMN avatar_url TEXT",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add avatar_url column:", alterErr);
          }
        }
      );
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(
    "CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)"
  );

  db.all("PRAGMA table_info(boards)", (err, columns) => {
    if (err) {
      console.error("Failed to inspect boards table:", err);
      return;
    }
    const hasDescription = columns.some(
      (column) => column.name === "description"
    );
    if (!hasDescription) {
      db.run(
        "ALTER TABLE boards ADD COLUMN description TEXT DEFAULT ''",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add description column to boards:", alterErr);
          }
        }
      );
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      board_id TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#e3f2fd',
      status TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  db.all("PRAGMA table_info(tasks)", (err, columns) => {
    if (err) {
      console.error("Failed to inspect tasks table:", err);
      return;
    }
    const hasDescription = columns.some(
      (column) => column.name === "description"
    );
    const hasUserId = columns.some((column) => column.name === "user_id");
    const hasBoardId = columns.some((column) => column.name === "board_id");
    const hasColor = columns.some((column) => column.name === "color");
    if (!hasDescription) {
      db.run(
        "ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add description column:", alterErr);
          }
        }
      );
    }
    if (!hasUserId) {
      db.run("ALTER TABLE tasks ADD COLUMN user_id TEXT", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add user_id column:", alterErr);
        } else {
          ensureTaskUserIndex();
        }
      });
    } else {
      ensureTaskUserIndex();
    }
    if (!hasBoardId) {
      db.run("ALTER TABLE tasks ADD COLUMN board_id TEXT", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add board_id column:", alterErr);
        } else {
          ensureTaskBoardIndex();
        }
      });
    } else {
      ensureTaskBoardIndex();
    }
    if (!hasColor) {
      db.run(
        "ALTER TABLE tasks ADD COLUMN color TEXT DEFAULT '#e3f2fd'",
        (alterErr) => {
          if (alterErr) {
            console.error("Failed to add color column:", alterErr);
          }
        }
      );
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  db.run(
    "CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id)"
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_tags_task_id ON tags(task_id)");
});

module.exports = db;
