import { createContext, useContext } from "react";
import { User } from "@shared/schema";
import { AuthProvider } from "./AuthProvider";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => false,
});

export { AuthProvider };
export const useAuth = () => useContext(AuthContext);
