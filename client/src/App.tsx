import { Suspense, lazy } from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "./hooks/use-auth";
import { Sidebar } from "./components/sidebar";
import { ThemeToggle } from "./components/theme-toggle";
import { Toaster } from "./components/ui/toaster";

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const EmployeeForm = lazy(() => import("./pages/EmployeeForm"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Attendance = lazy(() => import("./pages/Attendance"));
const ClockIn = lazy(() => import("./pages/ClockIn"));
const Payroll = lazy(() => import("./pages/Payroll"));
const PayrollDetail = lazy(() => import("./pages/PayrollDetail"));
const Payslip = lazy(() => import("./pages/Payslip"));
const TwoOhOneFiles = lazy(() => import("./pages/TwoOhOneFiles"));
const Disciplinary = lazy(() => import("./pages/Disciplinary"));
const DisciplinaryDetail = lazy(() => import("./pages/DisciplinaryDetail"));
const LeaveRequests = lazy(() => import("./pages/LeaveRequests"));
const LeaveForm = lazy(() => import("./pages/LeaveForm"));
const CashAdvances = lazy(() => import("./pages/CashAdvances"));
const CashAdvanceForm = lazy(() => import("./pages/CashAdvanceForm"));
const HRSettings = lazy(() => import("./pages/HRSettings"));
const Devotionals = lazy(() => import("./pages/Devotionals"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/Landing"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-[272px] min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-end h-14 px-6 bg-background/80 backdrop-blur border-b">
          <ThemeToggle />
        </header>
        <div className="p-6">
          <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/" component={Landing} />
          <Route>
            <Redirect to="/login" />
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/employees" component={Employees} />
        <Route path="/employees/new" component={EmployeeForm} />
        <Route path="/employees/:id" component={EmployeeDetail} />
        <Route path="/employees/:id/edit" component={EmployeeForm} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/tasks/:id" component={TaskDetail} />
        <Route path="/schedules" component={Schedules} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/clock-in" component={ClockIn} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/payroll/:id" component={PayrollDetail} />
        <Route path="/payslip/:id" component={Payslip} />
        <Route path="/201-files" component={TwoOhOneFiles} />
        <Route path="/disciplinary" component={Disciplinary} />
        <Route path="/disciplinary/:id" component={DisciplinaryDetail} />
        <Route path="/leave-requests" component={LeaveRequests} />
        <Route path="/leave-requests/new" component={LeaveForm} />
        <Route path="/cash-advances" component={CashAdvances} />
        <Route path="/cash-advances/new" component={CashAdvanceForm} />
        <Route path="/hr-settings" component={HRSettings} />
        <Route path="/devotionals" component={Devotionals} />
        <Route path="/audit-trail" component={AuditTrail} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}
