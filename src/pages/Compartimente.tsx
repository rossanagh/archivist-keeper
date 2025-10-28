import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderOpen, ChevronLeft, Search, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Compartiment {
  id: string;
  nume: string;
  created_at: string;
}

const Compartimente = () => {
  const { fondId } = useParams();
  const [compartimente, setCompartimente] = useState<Compartiment[]>([]);
  const [fondNume, setFondNume] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nume, setNume] = useState("");
  const [editingComp, setEditingComp] = useState<Compartiment | null>(null);
  const [deletingComp, setDeletingComp] = useState<Compartiment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, [fondId]);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/");
      return;
    }

    await loadFond();
    await loadCompartimente();
    await checkAdmin(user.id);
    setLoading(false);
  };

  useEffect(() => {
    // Reload admin status periodically
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkAdmin(user.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadFond = async () => {
    const { data } = await supabase
      .from("fonduri")
      .select("nume")
      .eq("id", fondId)
      .single();
    if (data) setFondNume(data.nume);
  };

  const loadCompartimente = async () => {
    const { data, error } = await supabase
      .from("compartimente")
      .select("*")
      .eq("fond_id", fondId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca compartimentele",
      });
    } else {
      setCompartimente(data || []);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("compartimente")
      .insert([{ nume, fond_id: fondId }]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut adăuga compartimentul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Compartiment adăugat cu succes",
      });
      setNume("");
      setOpen(false);
      loadCompartimente();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;

    const { error } = await supabase
      .from("compartimente")
      .update({ nume })
      .eq("id", editingComp.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut actualiza compartimentul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Compartiment actualizat cu succes",
      });
      setNume("");
      setEditOpen(false);
      setEditingComp(null);
      loadCompartimente();
    }
  };

  const handleDelete = async () => {
    if (!deletingComp) return;

    const { error } = await supabase
      .from("compartimente")
      .delete()
      .eq("id", deletingComp.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut șterge compartimentul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Compartiment șters cu succes",
      });
      setDeleteOpen(false);
      setDeletingComp(null);
      loadCompartimente();
    }
  };

  const filteredCompartimente = compartimente.filter((comp) =>
    comp.nume.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button
            variant="ghost"
            onClick={() => navigate("/fonduri")}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Înapoi la Fonduri
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Compartimente</h2>
              <p className="text-muted-foreground">Fond: {fondNume}</p>
            </div>
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă Compartiment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adaugă Compartiment Nou</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nume">Numele Compartimentului</Label>
                      <Input
                        id="nume"
                        value={nume}
                        onChange={(e) => setNume(e.target.value)}
                        placeholder="Introduceți numele compartimentului"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Adaugă
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
          )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Caută compartimente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompartimente.map((comp) => (
            <Card
              key={comp.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative group"
            >
              <div onClick={() => navigate(`/fonduri/${fondId}/compartimente/${comp.id}/inventare`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {comp.nume}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Creat: {new Date(comp.created_at).toLocaleDateString("ro-RO")}
                  </p>
                </CardContent>
              </div>
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingComp(comp);
                      setNume(comp.nume);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingComp(comp);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {filteredCompartimente.length === 0 && compartimente.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nu s-au găsit compartimente care să corespundă căutării.
            </p>
          </div>
        )}

        {compartimente.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nu există compartimente. {isAdmin && "Adaugă primul compartiment!"}
            </p>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează Compartiment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nume">Numele Compartimentului</Label>
              <Input
                id="edit-nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                placeholder="Introduceți numele compartimentului"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Actualizează
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Compartimentul "{deletingComp?.nume}" va fi șters permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Compartimente;
