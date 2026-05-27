import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/Navbar";
import NotificationBanner from "./components/NotificationBanner";
import HomePage from "./pages/HomePage";
import AllRemindersPage from "./pages/AllRemindersPage";
import ReviewReminderPage from "./pages/ReviewReminderPage";
import RefundFormReminderPage from "./pages/RefundFormReminderPage";
import RefundReminderPage from "./pages/RefundReminderPage";
import OrderStatsPage from "./pages/OrderStatsPage";
import EditReminderPage from "./pages/EditReminderPage";

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <div className="min-h-screen bg-ink">
          <Navbar />
          <NotificationBanner />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/all-reminders" element={<AllRemindersPage />} />
              <Route path="/review-reminder" element={<ReviewReminderPage />} />
              <Route
                path="/refund-form-reminder"
                element={<RefundFormReminderPage />}
              />
              <Route path="/refund-reminder" element={<RefundReminderPage />} />
              <Route path="/order-stats" element={<OrderStatsPage />} />
              <Route path="/edit/:id" element={<EditReminderPage />} />
            </Routes>
          </main>
        </div>
      </NotificationProvider>
    </BrowserRouter>
  );
}
