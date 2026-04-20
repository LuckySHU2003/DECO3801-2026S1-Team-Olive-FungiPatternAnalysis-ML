// Page-level section header with optional action slot (buttons on the right)
import React from "react";

/**
 * @param {string}      title  - Page heading
 * @param {string}      desc   - Subtitle / description
 * @param {React.Node}  action - Optional JSX for action buttons rendered on the right
 */
export default function SectionTitle({ title, desc, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  );
}