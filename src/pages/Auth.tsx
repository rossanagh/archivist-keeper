import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { authSchema } from "@/lib/validations";
import { z } from "zod";

const Auth = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validated = authSchema.parse({ username, password });
      
      const email = `${validated.username}@inventory.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: validated.password,
      });

      if (error) throw error;

      // Log the login event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          username: username,
          action: "LOGIN",
          table_name: null,
          record_id: null,
          details: { timestamp: new Date().toISOString() }
        });
      }

      toast({
        title: "Autentificare reușită",
        description: "Bun venit!",
      });
      navigate("/fonduri");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Eroare de validare",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Eroare la autentificare",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Autentificare Admin</CardTitle>
            <CardDescription>
              Introduceți credențialele pentru a accesa sistemul
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Parolă"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Se autentifică..." : "Autentificare"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;
