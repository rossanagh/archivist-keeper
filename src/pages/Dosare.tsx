import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronLeft, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Dosar {
  id: string;
  nr_crt: number;
  indicativ_nomenclator: string;
  continut: string;
  date_extreme: string;
  numar_file: number;
  observatii: string | null;
  nr_cutie: number | null;
}

const Dosare = () => {
  const { fondId, compartimentId, inventarId } = useParams();
  const [dosare, setDosare] = useState<Dosar[]>([]);
  const [inventarAn, setInventarAn] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nr_crt: "",
    indicativ_nomenclator: "",
    continut: "",
    date_extreme: "",
    numar_file: "",
    observatii: "",
    nr_cutie: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadInventar();
    loadDosare();
    checkAdmin();

    return () => {
      unlockInventar();
    };
  }, [inventarId]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }
  };

  const loadInventar = async () => {
    const { data } = await supabase
      .from("inventare")
      .select("an")
      .eq("id", inventarId)
      .single();
    if (data) setInventarAn(data.an);
  };

  const loadDosare = async () => {
    const { data, error } = await supabase
      .from("dosare")
      .select("*")
      .eq("inventar_id", inventarId)
      .order("nr_crt", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-au putut încărca dosarele",
      });
    } else {
      setDosare(data || []);
    }
  };

  const unlockInventar = async () => {
    if (isAdmin && userId) {
      await supabase
        .from("inventare")
        .update({ locked_by: null, locked_at: null })
        .eq("id", inventarId)
        .eq("locked_by", userId);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("dosare").insert([
      {
        nr_crt: parseInt(formData.nr_crt),
        indicativ_nomenclator: formData.indicativ_nomenclator,
        continut: formData.continut,
        date_extreme: formData.date_extreme,
        numar_file: parseInt(formData.numar_file),
        observatii: formData.observatii || null,
        nr_cutie: formData.nr_cutie ? parseInt(formData.nr_cutie) : null,
        inventar_id: inventarId,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message.includes("duplicate")
          ? "Numărul curent există deja"
          : "Nu s-a putut adăuga dosarul",
      });
    } else {
      toast({
        title: "Succes",
        description: "Dosar adăugat cu succes",
      });
      setFormData({
        nr_crt: "",
        indicativ_nomenclator: "",
        continut: "",
        date_extreme: "",
        numar_file: "",
        observatii: "",
        nr_cutie: "",
      });
      setOpen(false);
      loadDosare();
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      dosare.map((d) => ({
        "Nr. crt": d.nr_crt,
        "Indicativ nomenclator": d.indicativ_nomenclator,
        "Conținut": d.continut,
        "Date extreme": d.date_extreme,
        "Număr file": d.numar_file,
        "Observații": d.observatii || "",
        "Nr. cutie": d.nr_cutie || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosare");
    XLSX.writeFile(wb, `Inventar_${inventarAn}.xlsx`);
    toast({
      title: "Export reușit",
      description: "Fișierul a fost descărcat",
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const dosareData = data.map((row: any) => ({
        nr_crt: row["Nr. crt"] || row["nr_crt"],
        indicativ_nomenclator:
          row["Indicativ nomenclator"] || row["indicativ_nomenclator"],
        continut: row["Conținut"] || row["continut"],
        date_extreme: row["Date extreme"] || row["date_extreme"],
        numar_file: row["Număr file"] || row["numar_file"],
        observatii: row["Observații"] || row["observatii"] || null,
        nr_cutie: row["Nr. cutie"] || row["nr_cutie"] || null,
        inventar_id: inventarId,
      }));

      const { error } = await supabase.from("dosare").insert(dosareData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Eroare la import",
          description: "Verificați formatul fișierului",
        });
      } else {
        toast({
          title: "Import reușit",
          description: `${dosareData.length} dosare au fost importate`,
        });
        loadDosare();
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              unlockInventar();
              navigate(
                `/fonduri/${fondId}/compartimente/${compartimentId}/inventare`
              );
            }}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Înapoi la Inventare
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Dosare</h2>
              <p className="text-muted-foreground">Inventar {inventarAn}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImport}
                    />
                  </label>
                </Button>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă Dosar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adaugă Dosar Nou</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nr_crt">Nr. Crt *</Label>
                          <Input
                            id="nr_crt"
                            type="number"
                            value={formData.nr_crt}
                            onChange={(e) =>
                              setFormData({ ...formData, nr_crt: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="indicativ">Indicativ Nomenclator *</Label>
                          <Input
                            id="indicativ"
                            value={formData.indicativ_nomenclator}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                indicativ_nomenclator: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="continut">Conținut *</Label>
                        <Input
                          id="continut"
                          value={formData.continut}
                          onChange={(e) =>
                            setFormData({ ...formData, continut: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date">Date Extreme *</Label>
                          <Input
                            id="date"
                            value={formData.date_extreme}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                date_extreme: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="file">Număr File *</Label>
                          <Input
                            id="file"
                            type="number"
                            value={formData.numar_file}
                            onChange={(e) =>
                              setFormData({ ...formData, numar_file: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="observatii">Observații</Label>
                          <Input
                            id="observatii"
                            value={formData.observatii}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                observatii: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cutie">Nr. Cutie</Label>
                          <Input
                            id="cutie"
                            type="number"
                            value={formData.nr_cutie}
                            onChange={(e) =>
                              setFormData({ ...formData, nr_cutie: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Adaugă
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr. Crt</TableHead>
                <TableHead>Indicativ</TableHead>
                <TableHead>Conținut</TableHead>
                <TableHead>Date Extreme</TableHead>
                <TableHead>Nr. File</TableHead>
                <TableHead>Observații</TableHead>
                <TableHead>Nr. Cutie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dosare.map((dosar) => (
                <TableRow key={dosar.id}>
                  <TableCell>{dosar.nr_crt}</TableCell>
                  <TableCell>{dosar.indicativ_nomenclator}</TableCell>
                  <TableCell className="max-w-md">{dosar.continut}</TableCell>
                  <TableCell>{dosar.date_extreme}</TableCell>
                  <TableCell>{dosar.numar_file}</TableCell>
                  <TableCell>{dosar.observatii || "-"}</TableCell>
                  <TableCell>{dosar.nr_cutie || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {dosare.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nu există dosare. {isAdmin && "Adaugă primul dosar sau importă din Excel!"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dosare;
