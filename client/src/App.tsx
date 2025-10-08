import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudentTest from "@/pages/student-test";
import AdminDashboard from "@/pages/admin-dashboard";
import TestResults from "@/pages/test-results";
import Analytics from "@/pages/analytics";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={StudentTest} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reports" component={Reports} />
      <Route path="/results/:resultId" component={TestResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
