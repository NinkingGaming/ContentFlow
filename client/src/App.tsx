import React, { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";
import { AuthProvider } from "./lib/auth";
import { useAuth } from "./lib/auth";
import { PasswordGateway } from "@/components/password-gateway";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Use useEffect to handle navigation after render
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route path="/projects/:id">
        {(params) => <PrivateRoute component={Project} id={params.id} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [hasAccess, setHasAccess] = useState(false);
  
  // If the user hasn't passed the gateway password, show the gateway screen
  if (!hasAccess) {
    return (
      <QueryClientProvider client={queryClient}>
        <PasswordGateway onAccess={() => setHasAccess(true)} />
        <Toaster />
      </QueryClientProvider>
    );
  }
  
  // Only show the main app after passing the gateway
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
