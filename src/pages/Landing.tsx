import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, BarChart3, ClipboardList, Package, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: ClipboardList, title: "Smart Inventory", desc: "Track stock levels with guided workflows, approval chains, and multi-location support." },
  { icon: Package, title: "Auto Reordering", desc: "PAR-based reorder suggestions that learn from your usage patterns and vendor schedules." },
  { icon: BarChart3, title: "Real-time Reports", desc: "Cost analysis, usage trends, consumption gaps, and actionable procurement dashboards." },
];

const badges = [
  { icon: Shield, text: "Enterprise-grade security" },
  { icon: Zap, text: "Auto vendor detection" },
  { icon: Sparkles, text: "One-click smart orders" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ChefHat className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Resta<span className="text-gradient-amber">rentIQ</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-amber shadow-amber text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 lg:py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Restaurant Operations, Simplified
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Take control of your{" "}
            <span className="text-gradient-amber">restaurant operations</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Inventory tracking, smart ordering, and real-time analytics — all in one platform built for modern restaurants.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-amber shadow-amber gap-2 w-full sm:w-auto">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Log in</Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {badges.map(b => (
              <div key={b.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <b.icon className="h-3.5 w-3.5 text-primary/70" />
                {b.text}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              className="group rounded-xl border border-border/60 bg-card p-6 hover:shadow-card transition-all duration-200"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent group-hover:bg-primary/10 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-[15px]">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          © 2026 RestarentIQ. All rights reserved.
        </div>
      </footer>
    </div>
  );
}