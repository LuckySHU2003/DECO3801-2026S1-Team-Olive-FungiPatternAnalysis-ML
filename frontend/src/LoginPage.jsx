// Login page shown before authentication.
// Contains sign-in form with links to signup and forgot-password dialogs.
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import MiniLine from "@/components/shared/MiniLine";
import { smallSignal } from "@/constants/data";

/**
 * @param {Function} onLogin       - Called when the user clicks "Sign in"
 * @param {Function} onOpenSignup  - Opens the Create Account dialog
 * @param {Function} onOpenForgot  - Opens the Forgot Password dialog
 */
export default function LoginPage({ onLogin, onOpenSignup, onOpenForgot }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6">
      <div className="mx-auto grid min-h-[92vh] max-w-6xl items-center gap-6 lg:grid-cols-2">

        {/* ── Left: Hero / Branding panel ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border bg-white p-8 shadow-sm lg:p-12"
        >
          <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Project 19
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Olive</h1>
          <p className="mt-3 max-w-xl text-slate-600">
            A research platform for fungal bioelectric signal upload, preprocessing,
            spike detection, prediction, and interpretation.
          </p>




        </motion.div>

        {/* ── Right: Sign-in form ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-xl shadow-emerald-100/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Enter your research workspace securely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="researcher@uq.edu.au" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>

              {/* Remember me + forgot password row */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <Checkbox /> Remember me
                </label>
                <button
                  onClick={onOpenForgot}
                  className="text-emerald-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                onClick={onLogin}
                className="h-11 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              >
                Sign in
              </Button>
              <Button
                variant="outline"
                onClick={onOpenSignup}
                className="h-11 w-full rounded-2xl"
              >
                Create account
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
