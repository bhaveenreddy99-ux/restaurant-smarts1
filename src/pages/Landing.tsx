import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, BarChart3, ClipboardList, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: ClipboardList, title: "Smart Inventory", desc: "Track stock levels with guided workflows and approval chains." },
  { icon: Package, title: "Auto Reordering", desc: "AI-powered reorder suggestions based on PAR levels and usage." },
  { icon: BarChart3, title: "Real-time Reports", desc: "Cost analysis, usage trends, and consumption dashboards." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Resta<span className="text-gradient-amber">rentIQ</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-amber shadow-amber">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-accent px-3 py-1 text-sm text-accent-foreground">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            Restaurant Management, Simplified
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Take control of your{" "}
            <span className="text-gradient-amber">restaurant operations</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Inventory tracking, smart ordering, and real-time analytics — all in one platform built for modern restaurants.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-amber shadow-amber gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Log in</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 RestarentIQ. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
