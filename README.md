# 🛒 Amazon Reminder Tracker

A personal MERN stack web app to track **Amazon order reviews and refunds** — runs entirely on your laptop using local MongoDB.

---

## 📋 Prerequisites

Make sure these are installed on your laptop:

1. **Node.js** (v18+) → https://nodejs.org
2. **MongoDB Community** (local) → https://www.mongodb.com/try/download/community
3. **MongoDB Compass** (optional, for GUI) → https://www.mongodb.com/try/download/compass

---

## 🚀 Setup & Run

### Step 1 — Install dependencies

Open terminal in the project root folder and run:

```bash
npm run install-all
```

This installs packages for both backend and frontend.

### Step 2 — Start MongoDB

Make sure your local MongoDB is running. On most systems:

**Windows:**
```
net start MongoDB
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### Step 3 — Run the app

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:5000`
- **Frontend** on `http://localhost:5173`

Open your browser at → **http://localhost:5173**

---

## 📁 Project Structure

```
amazon-reminder/
├── backend/
│   ├── controllers/
│   │   └── reminderController.js   ← All business logic
│   ├── models/
│   │   └── Reminder.js             ← MongoDB schema
│   ├── routes/
│   │   └── reminderRoutes.js       ← API endpoints
│   ├── .env                        ← MongoDB URI & port
│   ├── package.json
│   └── server.js                   ← Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── NotificationBanner.jsx
│   │   │   └── ReminderCard.jsx
│   │   ├── context/
│   │   │   └── NotificationContext.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── ReviewReminderPage.jsx
│   │   │   ├── RefundReminderPage.jsx
│   │   │   └── EditReminderPage.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── package.json                    ← Root scripts
└── README.md
```

---

## ✨ Features

### Review Reminder
- Fill in: Order ID, Order Date, Review Date, Amazon Link
- Saves review reminder
- **Auto-creates refund reminder** (Review Date + 2 days) — no manual entry needed

### Refund Reminder
- Manually create or edit refund details
- Fields: Order ID, Order Date, Amazon Link, Review Date, Refund Date, Contact Person, Notes

### Dashboard (Home)
- View all reminders in card layout
- Status color coding:
  - 🟢 **Green** = Completed
  - 🟡 **Yellow** = Upcoming
  - 🔴 **Red** = Overdue
- Days remaining countdown
- Search by Order ID
- Filter by status (upcoming / overdue / completed)
- Filter by type (review / refund)
- Sort by date (newest / oldest)

### In-App Notifications
- Banner appears at top when reminders are due
- Shows: overdue, today, and tomorrow reminders
- Dismiss individual notifications or all at once
- Dismissals remembered in localStorage

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | Get all reminders (with filters) |
| GET | `/api/reminders/notifications` | Get today/overdue/tomorrow alerts |
| GET | `/api/reminders/:id` | Get single reminder |
| POST | `/api/reminders/review` | Create review + auto-refund reminder |
| POST | `/api/reminders/refund` | Create standalone refund reminder |
| PUT | `/api/reminders/:id` | Update reminder |
| DELETE | `/api/reminders/:id` | Delete reminder (+ linked refund if review) |

---

## ⚙️ Configuration

Edit `backend/.env` to change MongoDB URI or port:

```env
MONGO_URI=mongodb://localhost:27017/amazon_reminders
PORT=5000
```

---

## 🗄️ Database

- Database name: `amazon_reminders`
- Collection: `reminders`
- All data stored locally on your laptop
- View/edit data in **MongoDB Compass** by connecting to `mongodb://localhost:27017`

---

## 🛑 Stopping the App

Press `Ctrl + C` in the terminal to stop both servers.
