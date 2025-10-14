const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(path.resolve(__dirname, "./kanban.db"));

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL
    )
  `);

  db.all("PRAGMA table_info(tasks)", (err, columns) => {
    if (err) {
      console.error("Failed to inspect tasks table:", err);
      return;
    }
    const hasDescription = columns.some((column) => column.name === "description");
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
});

module.exports = db;
