import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderOpen, ChevronLeft, Search } from "lucide-react";
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
  const [nume, setNume] = useState("");
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
      navigate("/auth");
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
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() =>
                navigate(`/fonduri/${fondId}/compartimente/${comp.id}/inventare`)
              }
            >
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
    </Layout>
  );
};

export default Compartimente;
