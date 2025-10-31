import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Archive, LogOut, LogIn, History, UserPlus, KeyRound, Database } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [hasFullAccess, setHasFullAccess] = useState(false);
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
      .select("username, full_access")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setUsername(data.username);
      setHasFullAccess(data.full_access || false);
    }
  };

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Deblocare inventare
      await supabase
        .from("inventare")
        .update({ locked_by: null, locked_at: null })
        .eq("locked_by", user.id);
      
      // Log logout
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
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.reload()}
              title="Reîmprospătează pagina"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
            </Button>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{username}</span>
                {isAdmin && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    Admin
                  </span>
                )}
              </div>
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate("/istoric")}>
                    <History className="h-4 w-4 mr-2" />
                    Istoric
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/password-management")}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Gestionare Parole
                  </Button>
                  {hasFullAccess && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => navigate("/database-management")}>
                        <Database className="h-4 w-4 mr-2" />
                        Database
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate("/create-admin")}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Creare Admin
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Deconectare
              </Button>
            </div>
          )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
      <footer className="border-t bg-card py-3 mt-auto">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2025 Silurus - Made by Rossana Ghiciu
        </div>
      </footer>
    </div>
  );
};

export default Layout;
