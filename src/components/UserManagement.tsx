import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Settings, Users, Shield, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  username: string;
  full_access: boolean;
  created_at: string;
}

interface Fond {
  id: string;
  nume: string;
}

interface UserFondAccess {
  id: string;
  user_id: string;
  fond_id: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fonduri, setFonduri] = useState<Fond[]>([]);
  const [userFondAccess, setUserFondAccess] = useState<UserFondAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFullAccess, setCurrentUserFullAccess] = useState(false);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  
  const [accessOpen, setAccessOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedFonds, setSelectedFonds] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Check current user's full_access
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_access")
        .eq("id", user.id)
        .maybeSingle();
      
      setCurrentUserFullAccess(profile?.full_access || false);
    }
    
    // Load all users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    setUsers(usersData || []);
    
    // Load all fonduri
    const { data: fonduriData } = await supabase
      .from("fonduri")
      .select("id, nume")
      .order("nume");
    
    setFonduri(fonduriData || []);
    
    // Load user fond access
    const { data: accessData } = await supabase
      .from("user_fond_access")
      .select("*");
    
    setUserFondAccess(accessData || []);
    
    setLoading(false);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingUser.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast({
        title: "Succes",
        description: `Utilizatorul ${deletingUser.username} a fost șters`,
      });
      
      setDeleteOpen(false);
      setDeletingUser(null);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu s-a putut șterge utilizatorul",
      });
    }
  };

  const handleManageAccess = (user: UserProfile) => {
    setEditingUser(user);
    
    // Get current access for this user
    const currentAccess = userFondAccess
      .filter(a => a.user_id === user.id)
      .map(a => a.fond_id);
    
    setSelectedFonds(currentAccess);
    setAccessOpen(true);
  };

  const toggleFondAccess = (fondId: string) => {
    setSelectedFonds(prev => 
      prev.includes(fondId)
        ? prev.filter(id => id !== fondId)
        : [...prev, fondId]
    );
  };

  const saveAccess = async () => {
    if (!editingUser) return;
    
    try {
      // Get current access for this user
      const currentAccess = userFondAccess
        .filter(a => a.user_id === editingUser.id)
        .map(a => a.fond_id);
      
      // Find what to add and what to remove
      const toAdd = selectedFonds.filter(id => !currentAccess.includes(id));
      const toRemove = currentAccess.filter(id => !selectedFonds.includes(id));
      
      // Remove old access
      if (toRemove.length > 0) {
        await supabase
          .from("user_fond_access")
          .delete()
          .eq("user_id", editingUser.id)
          .in("fond_id", toRemove);
      }
      
      // Add new access
      if (toAdd.length > 0) {
        const newAccess = toAdd.map(fondId => ({
          user_id: editingUser.id,
          fond_id: fondId
        }));
        
        await supabase
          .from("user_fond_access")
          .insert(newAccess);
      }
      
      toast({
        title: "Succes",
        description: "Permisiunile au fost actualizate",
      });
      
      setAccessOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut actualiza permisiunile",
      });
    }
  };

  const getUserFondCount = (userId: string) => {
    return userFondAccess.filter(a => a.user_id === userId).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Se încarcă utilizatorii...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentUserFullAccess) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nu aveți permisiuni pentru gestionarea utilizatorilor.
            Doar administratorii cu acces total pot gestiona utilizatorii.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestionare Utilizatori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Tip Acces</TableHead>
                <TableHead>Fonduri Accesibile</TableHead>
                <TableHead>Creat la</TableHead>
                <TableHead className="w-40">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    {user.full_access ? (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <ShieldCheck className="h-3 w-3" />
                        Acces Total
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Shield className="h-3 w-3" />
                        Acces Limitat
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.full_access ? (
                      <span className="text-muted-foreground">Toate fondurile</span>
                    ) : (
                      <span>
                        {getUserFondCount(user.id)} {getUserFondCount(user.id) === 1 ? 'fond' : 'fonduri'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at || '').toLocaleDateString("ro-RO")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!user.full_access && (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={() => handleManageAccess(user)}
                          title="Gestionează accesul la fonduri"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        onClick={() => handleDeleteUser(user)}
                        title="Șterge utilizator"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for managing fund access */}
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionează accesul pentru {editingUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selectați fondurile la care utilizatorul va avea acces:
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto border rounded-md p-4">
              {fonduri.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nu există fonduri în baza de date
                </p>
              ) : (
                fonduri.map((fond) => (
                  <div 
                    key={fond.id} 
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleFondAccess(fond.id)}
                  >
                    <Checkbox 
                      checked={selectedFonds.includes(fond.id)}
                      onCheckedChange={() => toggleFondAccess(fond.id)}
                    />
                    <span>{fond.nume}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedFonds.length} fonduri selectate
              </span>
              <Button onClick={saveAccess}>
                Salvează permisiunile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi utilizatorul <strong>{deletingUser?.username}</strong>?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;
