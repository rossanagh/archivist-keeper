import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Parola actuală este obligatorie"),
  newPassword: z.string().min(6, "Parola nouă trebuie să aibă minim 6 caractere"),
  confirmPassword: z.string().min(6, "Confirmarea parolei este obligatorie")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Parolele noi nu coincid",
  path: ["confirmPassword"],
});

const PasswordManagement = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        navigate("/");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        toast({
          variant: "destructive",
          title: "Acces interzis",
          description: "Doar administratorii pot accesa această pagină",
        });
        navigate("/fonduri");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message,
      });
      navigate("/fonduri");
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = passwordSchema.parse({ 
        currentPassword, 
        newPassword, 
        confirmPassword 
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Nu sunteți autentificat");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            currentPassword: validated.currentPassword,
            newPassword: validated.newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Eroare la actualizarea parolei");
      }

      toast({
        title: "Succes",
        description: "Parola a fost actualizată cu succes",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
          title: "Eroare",
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
          <p>Se verifică autentificarea...</p>
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
            <CardTitle>Schimbare Parolă</CardTitle>
            <CardDescription>
              Actualizați parola pentru contul dvs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Parola Actuală"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Parolă Nouă"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirmă Parola Nouă"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Se actualizează..." : "Actualizează Parola"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
};

export default PasswordManagement;
