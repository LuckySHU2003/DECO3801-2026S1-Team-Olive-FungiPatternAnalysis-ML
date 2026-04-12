// Static application data — nav items and signal sample arrays
import {
  Upload,
  LayoutDashboard,
  Database,
  Settings2,
  Brain,
  LineChart,
  FileText,
  History,
  FolderKanban,
  Cpu,
} from "lucide-react";

/**
 * Sidebar navigation items.
 * Each entry has a unique id (used as the page key), a display label, and an icon component.
 */
export const navItems = [
  { id: "dashboard",      label: "Dashboard",           icon: LayoutDashboard },
  { id: "upload",         label: "Upload Dataset",       icon: Upload },
  { id: "preview",        label: "Dataset Preview",      icon: Database },
  { id: "configure",      label: "Configure Analysis",   icon: Settings2 },
  { id: "processing",     label: "Processing",           icon: Cpu },
  { id: "results",        label: "Results",              icon: LineChart },
  { id: "prediction",     label: "Prediction",           icon: Brain },
  { id: "interpretation", label: "Interpretation",       icon: FileText },
  { id: "models",         label: "Model Manager",        icon: FolderKanban },
  { id: "history",        label: "Experiment History",   icon: History },
];

/**
 * Full-length sample signal in mV — used in most chart previews.
 * Represents a typical fungal bioelectric recording session.
 */
export const sampleSignal = [
  -36, -34, -31, -30, -29, -27, -26, -24, -23, -25, -22, -21, -20, -19, -17, -16, -15,
  -14, -16, -15, 3, -13, -15, -14, -12, -11, -10, -8, -7, 10, -8, -6, -8, -9, -10, -9,
  -8, -7, -6, -5, 18, -7, -8, -9, -10, -12, -11, -10, -30, -76, -28, -26, -24, -21, -19,
  -17, -15, -14, -12, -10, -8, -9, -10, -11, -10, -9, 9, -7, -8, -7, -6, -5, 20, -7, -8,
  -10, -12, -13, -14, -16, -18, -20, -22, -25, -27, -29, -31,
];

/**
 * Short signal used only on the login page hero chart.
 */
export const smallSignal = [
  12, 18, 16, 30, 24, 20, 22, 40, 18, 16, 14, 26,
  24, 20, 16, 28, 18, 16, 24, 22, 18, 15, 14, 26,
];
