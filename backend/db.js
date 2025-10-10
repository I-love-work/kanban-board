const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./kanban.db"); // local SQLite database file

// initialize the tasks table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);
});

module.exports = db;
