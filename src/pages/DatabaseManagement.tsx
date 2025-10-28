import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Table, Lock, Users, FileText, FolderOpen, Archive, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface TableInfo {
  name: string;
  count: number;
  icon: React.ReactNode;
}

const DatabaseManagement = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; username: string } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.username !== "ghitaoarga") {
      toast({
        variant: "destructive",
        title: "Acces interzis",
        description: "Nu aveți permisiunea de a accesa această pagină",
      });
      navigate("/fonduri");
      return;
    }

    setUsername(profile.username);
    await loadTableCounts();
    await loadUsers();
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, created_at")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    const { error } = await supabase.auth.admin.deleteUser(deletingUser.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut șterge utilizatorul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Utilizator șters cu succes",
      });
      setDeleteOpen(false);
      setDeletingUser(null);
      loadUsers();
      loadTableCounts();
    }
  };

  const loadTableCounts = async () => {
    const tableNames = [
      { name: "fonduri", icon: <Archive className="h-5 w-5 text-primary" /> },
      { name: "compartimente", icon: <FolderOpen className="h-5 w-5 text-primary" /> },
      { name: "inventare", icon: <FileText className="h-5 w-5 text-primary" /> },
      { name: "dosare", icon: <Table className="h-5 w-5 text-primary" /> },
      { name: "profiles", icon: <Users className="h-5 w-5 text-primary" /> },
      { name: "user_roles", icon: <Lock className="h-5 w-5 text-primary" /> },
      { name: "audit_logs", icon: <Database className="h-5 w-5 text-primary" /> },
    ];

    const counts: TableInfo[] = [];
    
    for (const table of tableNames) {
      const { count } = await supabase
        .from(table.name as any)
        .select("*", { count: "exact", head: true });
      counts.push({ name: table.name, count: count || 0, icon: table.icon });
    }

    setTables(counts);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Gestionare Bază de Date
          </h2>
          <p className="text-muted-foreground mt-2">
            Acces: {username} | Informații despre structura bazei de date
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Card key={table.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  {table.icon}
                  {table.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{table.count}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {table.count === 1 ? "înregistrare" : "înregistrări"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informații Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Total înregistrări:</span>
              <span className="text-primary font-bold">
                {tables.reduce((acc, table) => acc + table.count, 0)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Tabele active:</span>
              <span className="text-primary font-bold">{tables.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium">Versiune:</span>
              <span className="text-muted-foreground">v1.0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilizatori</CardTitle>
          </CardHeader>
          <CardContent>
            <TableComponent>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Creat la</TableHead>
                  <TableHead className="w-24">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString("ro-RO")}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setDeletingUser({ id: user.id, username: user.username });
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableComponent>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Utilizatorul "{deletingUser?.username}" va fi șters permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default DatabaseManagement;
