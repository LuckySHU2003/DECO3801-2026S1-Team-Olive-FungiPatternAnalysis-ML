// Compact metric card displayed in rows across Dashboard, Preview, Results, etc.
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * @param {string}          title - Metric label
 * @param {string|number}   value - Primary numeric/text value
 * @param {string}          sub   - Optional secondary label below the value
 * @param {React.Component} icon  - Lucide icon component
 */
export default function StatCard({ title, value, sub, icon: Icon }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {/* Icon badge on the right side */}
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}