import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Archive, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

interface Fond {
  id: string;
  nume: string;
  created_at: string;
}

interface Inventar {
  id: string;
  an: number;
  termen_pastrare: string;
  numar_dosare: number;
  compartiment_id: string;
  compartimente: {
    nume: string;
    fond_id: string;
  };
}

const Fonduri = () => {
  const [fonduri, setFonduri] = useState<Fond[]>([]);
  const [inventare, setInventare] = useState<Inventar[]>([]);
  const [totalInventare, setTotalInventare] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedFondId, setSelectedFondId] = useState<string>("");
  const [nume, setNume] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingInventare, setLoadingInventare] = useState(false);
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

  const loadInventareForFond = async (fondId: string) => {
    setLoadingInventare(true);
    const { data, error } = await supabase
      .from("inventare")
      .select(`
        id,
        an,
        termen_pastrare,
        numar_dosare,
        compartiment_id,
        compartimente!inner (
          nume,
          fond_id
        )
      `)
      .eq("compartimente.fond_id", fondId)
      .order("an", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca inventarele",
      });
      setInventare([]);
      setTotalInventare(0);
    } else {
      setInventare(data || []);
      setTotalInventare(data?.length || 0);
    }
    setLoadingInventare(false);
  };

  const handleDownloadEvidenta = async () => {
    if (!selectedFondId) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Selectează un fond",
      });
      return;
    }

    try {
      // Query inventare directly to ensure we have ALL of them
      const { data: allInventare, error } = await supabase
        .from("inventare")
        .select(`
          id,
          an,
          termen_pastrare,
          numar_dosare,
          compartiment_id,
          compartimente!inner (
            nume,
            fond_id
          )
        `)
        .eq("compartimente.fond_id", selectedFondId)
        .order("an", { ascending: true });

      if (error) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-au putut încărca inventarele",
        });
        return;
      }

      if (!allInventare || allInventare.length === 0) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu există inventare pentru acest fond",
        });
        return;
      }
      
      console.log(`Procesare evidență pentru ${allInventare.length} inventare...`);

      // Import the template file
      const templateUrl = new URL('../assets/registru-evidenta-template.xlsx', import.meta.url).href;
      const response = await fetch(templateUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Add fond arhivistic on first row
      const selectedFond = fonduri.find(f => f.id === selectedFondId);
      worksheet['A1'] = { t: 's', v: `Fond arhivistic: ${selectedFond?.nume || ''}` };
      
      // Fill in the data for each inventar, starting from row 7
      let rowIndex = 7;
      let nrCrt = 1;
      
      for (const inventar of allInventare) {
        console.log(`Procesare inventar ${nrCrt}: An ${inventar.an}, Compartiment ${inventar.compartimente.nume}`);
        
        // Load dosare for this inventar
        const { data: dosare } = await supabase
          .from("dosare")
          .select("*")
          .eq("inventar_id", inventar.id);
        
        console.log(`  - Găsite ${dosare?.length || 0} dosare pentru inventar ${inventar.an}`);
        
        worksheet[`A${rowIndex}`] = { t: 'n', v: nrCrt }; // Nr. crt
        worksheet[`B${rowIndex}`] = { t: 's', v: '' }; // Data intrarii - empty
        worksheet[`C${rowIndex}`] = { t: 's', v: inventar.compartimente.nume }; // Denumirea compartimentului
        worksheet[`D${rowIndex}`] = { t: 's', v: `Inventarul documentelor din anul ${inventar.an}` }; // Nume Inventar
        worksheet[`E${rowIndex}`] = { t: 's', v: inventar.an.toString() }; // Date extreme - doar anul
        worksheet[`F${rowIndex}`] = { t: 'n', v: dosare?.length || 0 }; // Nr. Total dosare
        worksheet[`G${rowIndex}`] = { t: 'n', v: dosare?.length || 0 }; // Nr. Dosare primite efectiv
        worksheet[`H${rowIndex}`] = { t: 'n', v: 0 }; // Nr. Dosare ramase la compartim
        worksheet[`I${rowIndex}`] = { t: 's', v: inventar.termen_pastrare === 'permanent' ? 'permanent' : `${inventar.termen_pastrare} ani` }; // Termen de pastrare
        worksheet[`J${rowIndex}`] = { t: 's', v: '' }; // Data iesirii - empty
        worksheet[`K${rowIndex}`] = { t: 's', v: '' }; // Unde s-au predat - empty
        worksheet[`L${rowIndex}`] = { t: 's', v: '' }; // Act de predare - empty
        worksheet[`M${rowIndex}`] = { t: 's', v: '' }; // Total dosare iesite - empty
        worksheet[`N${rowIndex}`] = { t: 's', v: '' }; // Obs - empty
        
        rowIndex++;
        nrCrt++;
      }
      
      console.log(`Total ${nrCrt - 1} rânduri procesate în evidență.`);
      
      // Update worksheet range to include all new rows
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      range.e.r = rowIndex - 1; // Set end row to last row we wrote
      worksheet['!ref'] = XLSX.utils.encode_range(range);
      
      console.log(`Worksheet range actualizat la: ${worksheet['!ref']}`);
      
      // Generate the file
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Evidenta_${selectedFond?.nume || 'Fond'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Succes",
        description: "Evidența a fost descărcată cu succes",
      });
      
      setEvidenceDialogOpen(false);
      setSelectedFondId("");
    } catch (error) {
      console.error("Error downloading evidenta:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut descărca evidența",
      });
    }
  };

  useEffect(() => {
    if (selectedFondId) {
      loadInventareForFond(selectedFondId);
    } else {
      setInventare([]);
    }
  }, [selectedFondId]);

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
          <div className="flex gap-2">
            <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descarcă Evidență
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[50vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Descarcă Evidență</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fond-select">Selectează Fond</Label>
                    <Select value={selectedFondId} onValueChange={setSelectedFondId}>
                      <SelectTrigger id="fond-select">
                        <SelectValue placeholder="Alege un fond" />
                      </SelectTrigger>
                      <SelectContent side="bottom">
                        {fonduri.map((fond) => (
                          <SelectItem key={fond.id} value={fond.id}>
                            {fond.nume}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedFondId && (
                    <div className="space-y-4">
                      {loadingInventare ? (
                        <p className="text-muted-foreground text-sm">Se încarcă inventarele...</p>
                      ) : totalInventare === 0 ? (
                        <p className="text-muted-foreground text-sm">Nu există inventare pentru acest fond.</p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Se vor descărca automat toate cele {totalInventare} inventare din acest fond.
                          </p>
                          <Button 
                            onClick={handleDownloadEvidenta} 
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descarcă Evidența
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/fonduri/${fond.id}/compartimente`)}
            >
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
    </Layout>
  );
};

export default Fonduri;
