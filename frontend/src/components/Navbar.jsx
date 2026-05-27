import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

const links = [
  {
    to: "/all-reminders",
    label: "All Reminders",
    active: "bg-green-500/15 text-green-200 border border-green-500/30",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h10"
      />
    ),
  },
  {
    to: "/review-reminder",
    label: "Review",
    desktopLabel: "Review Reminder",
    active: "bg-accent/15 text-accent border border-accent/30",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927l1.519 4.674a1 1 0 00.95.69h4.915l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888 1.518-4.674a1 1 0 00-.363-1.118L3.165 8.291h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    ),
  },
  {
    to: "/refund-form-reminder",
    label: "Refund Form",
    active: "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6M7 4h7l3 3v13H7V4z"
      />
    ),
  },
  {
    to: "/refund-reminder",
    label: "Refund",
    active: "bg-blue-500/15 text-blue-200 border border-blue-500/30",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    ),
  },
  {
    to: "/order-stats",
    label: "Order Stats",
    active: "bg-purple-500/15 text-purple-200 border border-purple-500/30",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h10"
      />
    ),
  },
];

function NavItem({ link, compact = false, onClick }) {
  return (
    <NavLink
      to={link.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg text-sm font-display font-medium transition-all duration-200 whitespace-nowrap ${
          compact ? "px-3 py-3" : "px-4 py-2"
        } ${isActive ? link.active : "text-gray-300 hover:text-white hover:bg-card"}`
      }
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {link.icon}
      </svg>
      {compact ? link.label : link.desktopLabel || link.label}
    </NavLink>
  );
}

export default function Navbar() {
  const { notifications } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <span className="truncate font-display text-base font-bold tracking-tight text-white sm:text-lg">
              Amazon<span className="text-accent">Tracker</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavItem key={link.to} link={link} />
            ))}

            {notifications.length > 0 && (
              <Link
                to="/"
                className="relative ml-2 rounded-lg p-2 text-gray-300 transition-all hover:bg-card hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                  {notifications.length}
                </span>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-gray-200 hover:border-accent/50 hover:text-white lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7h16M4 12h16M4 17h16"
                />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="border-t border-border py-3 lg:hidden">
            <div className="grid gap-2 sm:grid-cols-2">
              {links.map((link) => (
                <NavItem
                  key={link.to}
                  link={link}
                  compact
                  onClick={() => setOpen(false)}
                />
              ))}
              {notifications.length > 0 && (
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-display font-medium text-gray-300 hover:bg-card hover:text-white sm:col-span-2"
                >
                  <span>Active Reminders</span>
                  <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
                    {notifications.length}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
