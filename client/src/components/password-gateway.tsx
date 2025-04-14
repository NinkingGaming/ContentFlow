import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

// The actual gateway password - in a production app, this would be stored in an environment variable
// and properly hashed/secured on the server
const GATEWAY_PASSWORD = "bluevision";
const LOCAL_STORAGE_KEY = "gateway_access";

interface PasswordGatewayProps {
  onAccess: () => void;
}

export function PasswordGateway({ onAccess }: PasswordGatewayProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Check if we already have access on component mount
  useEffect(() => {
    const hasAccess = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
    if (hasAccess) {
      onAccess();
    }
  }, [onAccess]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a slight delay for UX
    setTimeout(() => {
      if (password === GATEWAY_PASSWORD) {
        // Store access in localStorage so users don't have to enter it every time
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
        toast({
          title: "Access granted",
          description: "Welcome to Blue Vision Media",
        });
        onAccess();
      } else {
        setError(true);
        toast({
          title: "Access denied",
          description: "The password you entered is incorrect",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 800);
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary/20 to-primary/5">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl text-center">Blue Vision Media</CardTitle>
          <CardDescription className="text-center">
            Enter the access password to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid gap-4">
              <Input
                type="password"
                placeholder="Access password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`${error ? "border-red-500" : ""}`}
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm">Incorrect password</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password}
            >
              {loading ? "Verifying..." : "Access Site"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}