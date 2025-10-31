import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronLeft, Download, Upload, Search, Home } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
  const [inventarTermen, setInventarTermen] = useState<string>("");
  const [fondNume, setFondNume] = useState<string>("");
  const [compartimentNume, setCompartimentNume] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const dosarePerPage = 10;
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
    checkAuthAndLoadData();

    return () => {
      unlockInventar();
    };
  }, [inventarId]);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/");
      return;
    }

    setUserId(user.id);
    await loadInventar();
    await loadFond();
    await loadCompartiment();
    await loadDosare();
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

  const loadInventar = async () => {
    const { data } = await supabase
      .from("inventare")
      .select("an, termen_pastrare")
      .eq("id", inventarId)
      .single();
    if (data) {
      setInventarAn(data.an);
      setInventarTermen(data.termen_pastrare);
    }
  };

  const loadFond = async () => {
    const { data } = await supabase
      .from("fonduri")
      .select("nume")
      .eq("id", fondId)
      .single();
    if (data) setFondNume(data.nume);
  };

  const loadCompartiment = async () => {
    const { data } = await supabase
      .from("compartimente")
      .select("nume")
      .eq("id", compartimentId)
      .single();
    if (data) setCompartimentNume(data.nume);
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
    const nrCrt = parseInt(formData.nr_crt);
    
    // Get existing dosare to validate nr_crt
    const { data: existingDosare } = await supabase
      .from("dosare")
      .select("nr_crt")
      .eq("inventar_id", inventarId)
      .order("nr_crt", { ascending: true });

    // Check if nr_crt already exists
    if (existingDosare?.some(d => d.nr_crt === nrCrt)) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: `Numărul curent ${nrCrt} există deja`,
      });
      return;
    }

    // Check if nr_crt is valid in sequence
    const maxExisting = existingDosare && existingDosare.length > 0 
      ? Math.max(...existingDosare.map(d => d.nr_crt)) 
      : 0;
    
    if (nrCrt !== maxExisting + 1 && nrCrt !== 1) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: `Numărul curent trebuie să fie ${maxExisting > 0 ? maxExisting + 1 : 1}, nu ${nrCrt}`,
      });
      return;
    }
    
    const { error } = await supabase.from("dosare").insert([
      {
        nr_crt: nrCrt,
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
      // Log manual add event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        await supabase.from("audit_logs").insert({
          user_id: user.id,
          username: profile?.username || "unknown",
          action: "INSERT",
          table_name: "dosare",
          record_id: inventarId,
          details: {
            nr_crt: nrCrt,
            inventar_an: inventarAn,
            fond: fondNume,
            compartiment: compartimentNume,
            termen_pastrare: inventarTermen,
          },
        });
      }

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

  const handleExport = async () => {
    try {
      // Create header rows
      const headerData = [
        [`Fond: ${fondNume}`],
        [`Compartiment: ${compartimentNume}`],
        [`An inventar: ${inventarAn}`],
        [`Termen de păstrare: ${inventarTermen} ani`],
        [], // Empty row
      ];

      // Create data rows
      const dosareData = dosare.map((d) => ({
        "Nr. crt": d.nr_crt,
        "Indicativ nomenclator": d.indicativ_nomenclator,
        "Conținut": d.continut,
        "Date extreme": d.date_extreme,
        "Număr file": d.numar_file,
        "Observații": d.observatii || "",
        "Nr. cutie": d.nr_cutie || "",
      }));

      // Convert to worksheet
      const ws = XLSX.utils.aoa_to_sheet(headerData);
      XLSX.utils.sheet_add_json(ws, dosareData, { origin: -1 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dosare");
      XLSX.writeFile(wb, `Inventar_${inventarAn}.xlsx`);

      // Log export event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        const nrCrtList = dosare.map(d => d.nr_crt).sort((a, b) => a - b);
        
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          username: profile?.username || "unknown",
          action: "EXPORT_EXCEL",
          table_name: "dosare",
          record_id: inventarId,
          details: {
            count: dosare.length,
            nr_crt_range: nrCrtList.length > 0 ? `${nrCrtList[0]}-${nrCrtList[nrCrtList.length - 1]}` : "",
            inventar_an: inventarAn,
            fond: fondNume,
            compartiment: compartimentNume,
            termen_pastrare: inventarTermen,
          },
        });
      }

      toast({
        title: "Export reușit",
        description: "Fișierul a fost descărcat",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare la export",
        description: "Nu s-a putut exporta fișierul",
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data.length) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: "Fișierul nu conține date valide",
          });
          return;
        }

        const dosareData = data.map((row: any) => {
          // Handle both column name formats
          const nrCrt = row["__EMPTY"] || row["Nr. crt"] || row["nr_crt"];
          const indicativ = row["Indicativ nomenclator"] || row["indicativ_nomenclator"];
          const continut = row["Conținut"] || row["continut"];
          const dateExtreme = row["Date extreme"] || row["date_extreme"];
          const numarFile = row["Număr file"] || row["numar_file"];
          const observatii = row["Observații"] || row["observatii"];
          const nrCutie = row["Nr. cutie"] || row["nr_cutie"];

          if (!nrCrt || !indicativ || !continut || !dateExtreme || !numarFile) {
            throw new Error(`Lipsesc date obligatorii pe rândul cu nr. crt ${nrCrt || 'necunoscut'}`);
          }

          return {
            nr_crt: Number(nrCrt),
            indicativ_nomenclator: indicativ,
            continut: continut,
            date_extreme: dateExtreme,
            numar_file: Number(numarFile),
            observatii: observatii || null,
            nr_cutie: nrCutie ? Number(nrCutie) : null,
            inventar_id: inventarId,
          };
        });

        // Check for duplicates within the Excel file itself
        const nrCrtInExcel = dosareData.map(d => d.nr_crt);
        const duplicatesInExcel = nrCrtInExcel.filter((nr, index) => nrCrtInExcel.indexOf(nr) !== index);
        
        if (duplicatesInExcel.length > 0) {
          const uniqueDuplicates = [...new Set(duplicatesInExcel)];
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: `Fișierul Excel conține numere curente duplicate: ${uniqueDuplicates.join(', ')}. Fiecare număr curent trebuie să apară o singură dată în Excel.`,
          });
          return;
        }

        // Sort by nr_crt to validate sequence
        const sortedData = [...dosareData].sort((a, b) => a.nr_crt - b.nr_crt);
        
        // Validate no numbers are skipped in the Excel file
        for (let i = 0; i < sortedData.length - 1; i++) {
          const current = sortedData[i].nr_crt;
          const next = sortedData[i + 1].nr_crt;
          
          if (next - current > 1) {
            toast({
              variant: "destructive",
              title: "Eroare la import",
              description: `Lipsesc numerele curente între ${current} și ${next}. Nu se pot sări numere în secvență.`,
            });
            return;
          }
        }

        // Get existing dosare to check which are updates vs inserts
        const { data: existingDosare } = await supabase
          .from("dosare")
          .select("nr_crt, id")
          .eq("inventar_id", inventarId);

        const existingMap = new Map(existingDosare?.map(d => [d.nr_crt, d.id]) || []);
        let updatedCount = 0;
        let insertedCount = 0;
        const errors: string[] = [];

        // Process each dosar from Excel
        for (const dosar of dosareData) {
          const existingId = existingMap.get(dosar.nr_crt);
          
          if (existingId) {
            // Update existing record completely (overwrite all fields)
            const { error } = await supabase
              .from("dosare")
              .update({
                indicativ_nomenclator: dosar.indicativ_nomenclator,
                continut: dosar.continut,
                date_extreme: dosar.date_extreme,
                numar_file: dosar.numar_file,
                observatii: dosar.observatii,
                nr_cutie: dosar.nr_cutie,
              })
              .eq("id", existingId);

            if (error) {
              errors.push(`Nr. crt ${dosar.nr_crt}: ${error.message}`);
            } else {
              updatedCount++;
            }
          } else {
            // Insert new record
            const { error } = await supabase
              .from("dosare")
              .insert(dosar);

            if (error) {
              errors.push(`Nr. crt ${dosar.nr_crt}: ${error.message}`);
            } else {
              insertedCount++;
            }
          }
        }

        // If there were any errors, show them and stop
        if (errors.length > 0) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: errors.join("; "),
          });
          return;
        }

        const sortedNrCrt = dosareData.map(d => d.nr_crt).sort((a, b) => a - b);

        // Log import event
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

          await supabase.from("audit_logs").insert({
            user_id: user.id,
            username: profile?.username || "unknown",
            action: "IMPORT_EXCEL",
            table_name: "dosare",
            record_id: inventarId,
            details: {
              count: dosareData.length,
              updated: updatedCount,
              inserted: insertedCount,
              nr_crt_range: `${sortedNrCrt[0]}-${sortedNrCrt[sortedNrCrt.length - 1]}`,
              inventar_an: inventarAn,
              fond: fondNume,
              compartiment: compartimentNume,
              termen_pastrare: inventarTermen,
            },
          });
        }

        let description = `Total ${dosareData.length} dosare procesate`;
        if (updatedCount > 0 && insertedCount > 0) {
          description += `: ${insertedCount} noi, ${updatedCount} actualizate`;
        } else if (updatedCount > 0) {
          description += `: ${updatedCount} dosare actualizate`;
        } else if (insertedCount > 0) {
          description += `: ${insertedCount} dosare noi adăugate`;
        }

        toast({
          title: "Import reușit",
          description: description,
        });
        loadDosare();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Eroare la import",
          description: error.message || "Verificați formatul fișierului",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredDosare = dosare.filter((dosar) =>
    dosar.nr_crt.toString().includes(searchTerm) ||
    dosar.indicativ_nomenclator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dosar.continut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dosar.date_extreme.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dosar.numar_file.toString().includes(searchTerm) ||
    (dosar.observatii && dosar.observatii.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (dosar.nr_cutie && dosar.nr_cutie.toString().includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredDosare.length / dosarePerPage);
  const indexOfLastDosar = currentPage * dosarePerPage;
  const indexOfFirstDosar = indexOfLastDosar - dosarePerPage;
  const currentDosare = filteredDosare.slice(indexOfFirstDosar, indexOfLastDosar);

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
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              onClick={() => {
                unlockInventar();
                navigate(
                  `/fonduri/${fondId}/compartimente/${compartimentId}/inventare`
                );
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Înapoi la Inventare
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                unlockInventar();
                navigate("/fonduri");
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              Fonduri
            </Button>
          </div>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Caută dosare (nr. crt, indicativ, conținut, date, file, observații, cutie)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {filteredDosare.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Se afișează {indexOfFirstDosar + 1}-{Math.min(indexOfLastDosar, filteredDosare.length)} din {filteredDosare.length} dosare
          </div>
        )}

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
              {currentDosare.map((dosar) => (
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

        {filteredDosare.length > dosarePerPage && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {filteredDosare.length === 0 && dosare.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nu s-au găsit dosare care să corespundă căutării.
            </p>
          </div>
        )}

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
