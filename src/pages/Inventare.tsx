import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, ChevronLeft, Lock, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Inventar {
  id: string;
  an: number;
  numar_dosare: number;
  termen_pastrare: number;
  locked_by: string | null;
  created_at: string;
}

const Inventare = () => {
  const { fondId, compartimentId } = useParams();
  const [inventare, setInventare] = useState<Inventar[]>([]);
  const [compartimentNume, setCompartimentNume] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [an, setAn] = useState("");
  const [termenPastrare, setTermenPastrare] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, [compartimentId]);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/");
      return;
    }

    setUserId(user.id);
    await loadCompartiment();
    await loadInventare();
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

  const loadCompartiment = async () => {
    const { data } = await supabase
      .from("compartimente")
      .select("nume")
      .eq("id", compartimentId)
      .single();
    if (data) setCompartimentNume(data.nume);
  };

  const loadInventare = async () => {
    const { data, error } = await supabase
      .from("inventare")
      .select("*")
      .eq("compartiment_id", compartimentId)
      .order("an", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca inventarele",
      });
    } else {
      setInventare(data || []);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inventare").insert([
      {
        an: parseInt(an),
        termen_pastrare: parseInt(termenPastrare),
        compartiment_id: compartimentId,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut adăuga inventarul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Inventar adăugat cu succes",
      });
      setAn("");
      setTermenPastrare("");
      setOpen(false);
      loadInventare();
    }
  };

  const handleInventarClick = async (inventar: Inventar) => {
    if (!isAdmin) {
      navigate(
        `/fonduri/${fondId}/compartimente/${compartimentId}/inventare/${inventar.id}/dosare`
      );
      return;
    }

    if (inventar.locked_by && inventar.locked_by !== userId) {
      toast({
        variant: "destructive",
        title: "Inventar blocat",
        description: "Un alt administrator lucrează deja pe acest inventar",
      });
      return;
    }

    // Lock the inventory for this admin
    const { error } = await supabase
      .from("inventare")
      .update({ locked_by: userId, locked_at: new Date().toISOString() })
      .eq("id", inventar.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut bloca inventarul",
      });
    } else {
      navigate(
        `/fonduri/${fondId}/compartimente/${compartimentId}/inventare/${inventar.id}/dosare`
      );
    }
  };

  const filteredInventare = inventare.filter((inv) =>
    inv.an.toString().includes(searchTerm) ||
    inv.termen_pastrare.toString().includes(searchTerm) ||
    inv.numar_dosare.toString().includes(searchTerm)
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
            onClick={() => navigate(`/fonduri/${fondId}/compartimente`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Înapoi la Compartimente
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Inventare</h2>
              <p className="text-muted-foreground">
                Compartiment: {compartimentNume}
              </p>
            </div>
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă Inventar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adaugă Inventar Nou</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="an">An</Label>
                      <Input
                        id="an"
                        type="number"
                        value={an}
                        onChange={(e) => setAn(e.target.value)}
                        placeholder="2024"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termen">Termen Păstrare (ani)</Label>
                      <Input
                        id="termen"
                        type="number"
                        value={termenPastrare}
                        onChange={(e) => setTermenPastrare(e.target.value)}
                        placeholder="10"
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
            placeholder="Caută inventare (an, termen păstrare, număr dosare)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventare.map((inv) => (
            <Card
              key={inv.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => handleInventarClick(inv)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Inventar {inv.an}
                  {inv.locked_by && inv.locked_by !== userId && (
                    <Lock className="h-4 w-4 text-destructive ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Dosare:</span> {inv.numar_dosare}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Termen păstrare:</span>{" "}
                  {inv.termen_pastrare} ani
                </p>
                <p className="text-sm text-muted-foreground">
                  Creat: {new Date(inv.created_at).toLocaleDateString("ro-RO")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInventare.length === 0 && inventare.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nu s-au găsit inventare care să corespundă căutării.
            </p>
          </div>
        )}

        {inventare.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nu există inventare. {isAdmin && "Adaugă primul inventar!"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Inventare;
