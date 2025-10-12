# 🗂️ Kanban Board Project

An interactive **Kanban board** that lets you create, move, and organize tasks across multiple columns (e.g., _To Do_, _In Progress_, _Done_).  
The project demonstrates modern React patterns, drag-and-drop functionality, and a lightweight Node.js backend for persistence.

---

## 🚀 Features

- 🧩 Modular React components (Board, Column, Card)
- 🔄 Drag-and-drop task management powered by `@hello-pangea/dnd`
- 💾 Optional persistence layer served by a minimal Express backend
- ⚡ Responsive UI built with functional components and hooks

---

## 🧱 Project Structure

```
kanban-board/
├── backend/   # Express API and database access
└── frontend/  # React client (Create React App)
```

---

## 🛠️ Tech Stack

- **Frontend:** React (Hooks + JSX), Create React App
- **Backend:** Node.js + Express
- **Drag & Drop:** `@hello-pangea/dnd`
- **Version Control:** Git + GitHub

---

## ⚙️ Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-username>/kanban-board.git
   cd kanban-board
   ```

2. **Install dependencies**

   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Start the backend**

   ```bash
   npm start
   ```

4. **Start the frontend (in a new terminal)**

   ```bash
   cd frontend
   npm start
   ```
---

Happy building!
