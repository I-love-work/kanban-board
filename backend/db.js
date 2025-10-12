const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./kanban.db"); // local SQLite database file

// initialize the tasks table
db.serialize(() => {
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
});

module.exports = db;
