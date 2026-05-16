// Main authenticated layout: collapsible sidebar + sticky topbar + content area.
// On mobile the sidebar is off-canvas and toggled via the hamburger button.
import React from "react";
import {
  Sprout, Bell, Search, User, CheckCircle2, Menu, GitCompare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { navItems } from "@/constants/data";
import { HealthCard } from "@/components/ui/healthcard";

/**
 * @param {string}   page          - Currently active page id
 * @param {Function} setPage       - Page navigation setter
 * @param {boolean}  mobileOpen    - Whether the mobile sidebar is visible
 * @param {Function} setMobileOpen - Sidebar toggle setter
 * @param {React.Node} children    - Page content rendered in <main>
 */
export default function AppShell({ page, setPage, mobileOpen, setMobileOpen, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Backdrop: click outside sidebar to close */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`fixed left-0 z-40 w-72 border-r h-screen bg-white overflow-y-auto p-4 transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand logo area */}
          <div className="mb-6 flex items-start justify-between gap-3 px-2 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Sprout className="h-5 w-5" />
              </div>

              <div>
                <div className="text-lg font-semibold">MycoSignal</div>
                <div className="text-xs text-slate-500">
                  ML Platform for Fungal Bioelectrical Analysis
                </div>
              </div>
            </div>
          </div>

          {/* Navigation items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setMobileOpen(false); // auto-close sidebar on mobile after navigation
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active workspace card */}
          <HealthCard />
        </aside>

        {/* ── Main content column ──────────────────────────────────── */}
        <div className={`flex-1 transition-all ${ mobileOpen ? "lg:ml-72" : "lg:ml-0" }`}>

          {/* Sticky top navigation bar */}
          <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                {/* Hamburger button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Notification chip */}
                <Button variant="outline" size="icon" className="rounded-2xl">
                  <Bell className="h-4 w-4" />
                </Button>
                {/* User profile chip */}
                <div className="flex items-center gap-3 rounded-2xl border px-3 py-2">
                  <div className="rounded-full bg-slate-100 p-2">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium">Allison</div>
                    <div className="text-xs text-slate-500">Research Analyst</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page-specific content injected here */}
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
