import { ReactNode, useState, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { AuthContext } from "./auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await apiRequest<User | null>("/api/auth/me", {
          on401: "returnNull"
        });
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const userData = await apiRequest<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      setUser(userData);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const newUser = await apiRequest<User>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData)
      });

      setUser(newUser);
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Error creating account",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
      setUser(null);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};