// Main authenticated layout: collapsible sidebar + sticky topbar + content area.
// On mobile the sidebar is off-canvas and toggled via the hamburger button.
import React from "react";
import {
  Brain, Bell, Search, User, CheckCircle2, Menu, GitCompare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { navItems } from "@/constants/data";

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

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r bg-white p-4 transition-transform lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand logo area */}
          <div className="mb-6 flex items-center gap-3 px-2 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">Olive</div>
              <div className="text-xs text-slate-500">Fungal Bioelectric Signal Processor</div>
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
          <Card className="mt-6 rounded-2xl border-emerald-100 bg-emerald-50 shadow-none">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-900">Active Workspace</p>
              <p className="mt-1 text-xs text-emerald-800">Project 19 · Mycelium Network Dataset</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> API connected
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* ── Main content column ──────────────────────────────────── */}
        <div className="flex-1 lg:ml-0">

          {/* Sticky top navigation bar */}
          <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger button — hidden on desktop */}
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {/* Global search bar */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="w-80 rounded-2xl pl-9"
                    placeholder="Search datasets, models, experiments..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
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
