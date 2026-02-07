import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Clock,
  DollarSign,
  FileText,
  Shield,
  BarChart3,
  CalendarDays,
  FolderKanban,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Employee Management",
    description:
      "Complete 201 file management, employee profiles, and organizational structure tracking.",
  },
  {
    icon: Clock,
    title: "Time & Attendance",
    description:
      "QR-based clock-in with GPS verification, overtime tracking, and shift management.",
  },
  {
    icon: DollarSign,
    title: "Payroll Processing",
    description:
      "Automated payroll computation with SSS, PhilHealth, Pag-IBIG, and tax deductions.",
  },
  {
    icon: CalendarDays,
    title: "Leave Management",
    description:
      "Leave request workflows, balance tracking, and approval management.",
  },
  {
    icon: FolderKanban,
    title: "Project & Task Tracking",
    description:
      "Manage projects, assign employees, and track tasks with Kanban boards.",
  },
  {
    icon: FileText,
    title: "201 File Management",
    description:
      "Digital personnel files with document storage and disciplinary records.",
  },
  {
    icon: Shield,
    title: "Compliance & Audit",
    description:
      "Full audit trail, role-based access control, and Philippine labor law compliance.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Dashboard analytics, payroll summaries, and attendance reports.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl tracking-tight">
              <span className="text-primary font-bold">HRIS</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight mb-6">
            <span className="text-primary">HRIS</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Human Resource Information System
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            A comprehensive workforce management platform built for Philippine
            businesses. Manage employees, payroll, attendance, projects, and
            compliance -- all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              <Button size="lg" className="text-base px-8">
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="text-base px-8">
                Learn More
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From hiring to payroll, manage your entire workforce lifecycle with
              tools designed for Philippine labor standards.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to streamline your HR operations?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Sign in to access your dashboard and start managing your workforce
            more efficiently.
          </p>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <Button size="lg" className="text-base px-10">
              {isAuthenticated ? "Go to Dashboard" : "Sign In Now"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            HRIS - Human Resource Information System. Built for Philippine
            businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
