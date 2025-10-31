import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authSchema } from "@/lib/validations";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";

const CreateAdmin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullAccess, setFullAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!data) {
        toast({
          variant: "destructive",
          title: "Acces interzis",
          description: "Nu aveți permisiuni de administrator.",
        });
        navigate('/fonduri');
        return;
      }
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/auth');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      authSchema.parse({ username, password });

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Nu sunteți autentificat");
      }

      // Call the edge function to create admin
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { username, password, full_access: fullAccess },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Admin creat cu succes",
        description: data.message || `Utilizatorul ${username} a fost adăugat ca administrator.`,
      });

      setUsername("");
      setPassword("");
      setFullAccess(false);
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
          title: "Eroare la crearea adminului",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div>Se verifică permisiunile...</div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/fonduri")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Înapoi la Fonduri
        </Button>
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Creare Cont Administrator</CardTitle>
            <CardDescription>
              Creați un nou cont de administrator pentru sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fullAccess"
                  checked={fullAccess}
                  onChange={(e) => setFullAccess(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="fullAccess" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Admin cu acces total (Database Management + Creare Admin)
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Se creează..." : "Creare Administrator"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
};

export default CreateAdmin;
