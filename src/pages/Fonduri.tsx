import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Archive, Search, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Fond {
  id: string;
  nume: string;
  created_at: string;
}

const Fonduri = () => {
  const [fonduri, setFonduri] = useState<Fond[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nume, setNume] = useState("");
  const [editingFond, setEditingFond] = useState<Fond | null>(null);
  const [deletingFond, setDeletingFond] = useState<Fond | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/");
      return;
    }

    setIsAuthenticated(true);
    await loadFonduri();
    await checkAdmin(user.id);
    setLoading(false);
  };

  useEffect(() => {
    // Reload data when coming back to check for admin status changes
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

  const loadFonduri = async () => {
    const { data, error } = await supabase
      .from("fonduri")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca fondurile",
      });
    } else {
      setFonduri(data || []);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("fonduri").insert([{ nume }]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut adăuga fondul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Fond adăugat cu succes",
      });
      setNume("");
      setOpen(false);
      loadFonduri();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFond) return;

    const { error } = await supabase
      .from("fonduri")
      .update({ nume })
      .eq("id", editingFond.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut actualiza fondul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Fond actualizat cu succes",
      });
      setNume("");
      setEditOpen(false);
      setEditingFond(null);
      loadFonduri();
    }
  };

  const handleDelete = async () => {
    if (!deletingFond) return;

    const { error } = await supabase
      .from("fonduri")
      .delete()
      .eq("id", deletingFond.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut șterge fondul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Fond șters cu succes",
      });
      setDeleteOpen(false);
      setDeletingFond(null);
      loadFonduri();
    }
  };

  const filteredFonduri = fonduri.filter((fond) =>
    fond.nume.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Fonduri Arhivistice</h2>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă Fond
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adaugă Fond Nou</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nume">Numele Fondului</Label>
                    <Input
                      id="nume"
                      value={nume}
                      onChange={(e) => setNume(e.target.value)}
                      placeholder="Introduceți numele fondului"
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Caută fonduri..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFonduri.map((fond) => (
            <Card
              key={fond.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative group"
            >
              <div onClick={() => navigate(`/fonduri/${fond.id}/compartimente`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-primary" />
                    {fond.nume}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Creat: {new Date(fond.created_at).toLocaleDateString("ro-RO")}
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
                      setEditingFond(fond);
                      setNume(fond.nume);
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
                      setDeletingFond(fond);
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

        {filteredFonduri.length === 0 && fonduri.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nu s-au găsit fonduri care să corespundă căutării.
            </p>
          </div>
        )}

        {fonduri.length === 0 && (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nu există fonduri arhivistice. {isAdmin && "Adaugă primul fond!"}
            </p>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează Fond</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nume">Numele Fondului</Label>
              <Input
                id="edit-nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                placeholder="Introduceți numele fondului"
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
              Această acțiune nu poate fi anulată. Fondul "{deletingFond?.nume}" va fi șters permanent.
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

export default Fonduri;
