import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Trash2, Pencil, Home } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const DatabaseManagement = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [fonduri, setFonduri] = useState<any[]>([]);
  const [compartimente, setCompartimente] = useState<any[]>([]);
  const [inventare, setInventare] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [currentTable, setCurrentTable] = useState("");
  
  const [editFormData, setEditFormData] = useState<any>({});
  
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
    await loadAllData();
    setLoading(false);
  };

  const loadAllData = async () => {
    const { data: fonduriData } = await supabase.from("fonduri").select("*").order("created_at", { ascending: false });
    const { data: compartimenteData } = await supabase.from("compartimente").select("*").order("created_at", { ascending: false });
    const { data: inventareData } = await supabase.from("inventare").select("*").order("created_at", { ascending: false });
    const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    setFonduri(fonduriData || []);
    setCompartimente(compartimenteData || []);
    setInventare(inventareData || []);
    setUsers(usersData || []);
  };

  const handleEdit = (item: any, table: string) => {
    setEditingItem(item);
    setCurrentTable(table);
    setEditFormData(item);
    setEditOpen(true);
  };

  const handleDelete = (item: any, table: string) => {
    setDeletingItem(item);
    setCurrentTable(table);
    setDeleteOpen(true);
  };

  const saveEdit = async () => {
    const { error } = await supabase
      .from(currentTable as any)
      .update(editFormData)
      .eq("id", editingItem.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut actualiza înregistrarea",
      });
    } else {
      toast({
        title: "Succes",
        description: "Înregistrare actualizată cu succes",
      });
      setEditOpen(false);
      loadAllData();
    }
  };

  const confirmDelete = async () => {
    if (currentTable === "profiles") {
      // Call edge function to delete user
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingItem.id }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-a putut șterge utilizatorul",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from(currentTable as any)
        .delete()
        .eq("id", deletingItem.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-a putut șterge înregistrarea",
        });
        return;
      }
    }

    toast({
      title: "Succes",
      description: "Înregistrare ștearsă cu succes",
    });
    setDeleteOpen(false);
    loadAllData();
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              Gestionare Bază de Date
            </h2>
            <p className="text-muted-foreground mt-2">
              Acces: {username} | Editare și ștergere date
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/fonduri")}>
            <Home className="h-4 w-4 mr-2" />
            Înapoi la Fonduri
          </Button>
        </div>

        <Tabs defaultValue="fonduri" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fonduri">Fonduri ({fonduri.length})</TabsTrigger>
            <TabsTrigger value="compartimente">Compartimente ({compartimente.length})</TabsTrigger>
            <TabsTrigger value="inventare">Inventare ({inventare.length})</TabsTrigger>
            <TabsTrigger value="users">Utilizatori ({users.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="fonduri">
            <Card>
              <CardHeader>
                <CardTitle>Fonduri</CardTitle>
              </CardHeader>
              <CardContent>
                <TableComponent>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Creat la</TableHead>
                      <TableHead className="w-32">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fonduri.map((fond) => (
                      <TableRow key={fond.id}>
                        <TableCell>{fond.nume}</TableCell>
                        <TableCell>{new Date(fond.created_at).toLocaleDateString("ro-RO")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => handleEdit(fond, "fonduri")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(fond, "fonduri")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compartimente">
            <Card>
              <CardHeader>
                <CardTitle>Compartimente</CardTitle>
              </CardHeader>
              <CardContent>
                <TableComponent>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Creat la</TableHead>
                      <TableHead className="w-32">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compartimente.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell>{comp.nume}</TableCell>
                        <TableCell>{new Date(comp.created_at).toLocaleDateString("ro-RO")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => handleEdit(comp, "compartimente")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(comp, "compartimente")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventare">
            <Card>
              <CardHeader>
                <CardTitle>Inventare</CardTitle>
              </CardHeader>
              <CardContent>
                <TableComponent>
                  <TableHeader>
                    <TableRow>
                      <TableHead>An</TableHead>
                      <TableHead>Termen Păstrare</TableHead>
                      <TableHead>Nr. Dosare</TableHead>
                      <TableHead>Creat la</TableHead>
                      <TableHead className="w-32">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventare.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.an}</TableCell>
                        <TableCell>{inv.termen_pastrare === 'permanent' ? 'Permanent' : `${inv.termen_pastrare} ani`}</TableCell>
                        <TableCell>{inv.numar_dosare}</TableCell>
                        <TableCell>{new Date(inv.created_at).toLocaleDateString("ro-RO")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={() => handleEdit(inv, "inventare")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(inv, "inventare")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
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
                      <TableHead className="w-32">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString("ro-RO")}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="destructive" onClick={() => handleDelete(user, "profiles")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează înregistrare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentTable === "fonduri" || currentTable === "compartimente" ? (
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input
                  value={editFormData.nume || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, nume: e.target.value })}
                />
              </div>
            ) : currentTable === "inventare" ? (
              <>
                <div className="space-y-2">
                  <Label>An</Label>
                  <Input
                    type="number"
                    value={editFormData.an || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, an: parseInt(e.target.value) || "" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Termen Păstrare</Label>
                  <Input
                    value={editFormData.termen_pastrare || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, termen_pastrare: e.target.value })}
                  />
                </div>
              </>
            ) : null}
            <Button onClick={saveEdit} className="w-full">
              Salvează
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Înregistrarea va fi ștearsă permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default DatabaseManagement;