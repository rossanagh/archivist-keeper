import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Archive, LogOut, LogIn, History, UserPlus } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        loadUsername(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        loadUsername(session.user.id);
      } else {
        setIsAdmin(false);
        setUsername("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadUsername = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setUsername(data.username);
    }
  };

  const handleLogout = async () => {
    // Log the logout event before signing out
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        username: username,
        action: "LOGOUT",
        table_name: null,
        record_id: null,
        details: { timestamp: new Date().toISOString() }
      });
    }
    
    await supabase.auth.signOut();
    window.location.href = "/fonduri";
  };

  const handleLoginClick = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/fonduri")}>
            <Archive className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Inventory App</h1>
              <p className="text-sm text-muted-foreground">
                Gestionarea fondurilor arhivistice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && isAdmin ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{username}</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    Admin
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/istoric")}>
                  <History className="h-4 w-4 mr-2" />
                  Istoric
                </Button>
                {username === "ghitaoarga" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/create-admin")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Creare Admin
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Deconectare
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" onClick={handleLoginClick}>
                <LogIn className="h-4 w-4 mr-2" />
                Login Admin
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default Layout;
