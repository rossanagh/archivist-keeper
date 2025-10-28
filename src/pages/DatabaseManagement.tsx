import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Trash2, Pencil, Home, ChevronRight, ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type ViewLevel = 'fonduri' | 'compartimente' | 'inventare' | 'dosare';
type ViewMode = 'fonduri-hierarchy' | 'users';

const DatabaseManagement = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<ViewMode>('fonduri-hierarchy');
  const [currentLevel, setCurrentLevel] = useState<ViewLevel>('fonduri');
  const [selectedFond, setSelectedFond] = useState<any>(null);
  const [selectedCompartiment, setSelectedCompartiment] = useState<any>(null);
  const [selectedInventar, setSelectedInventar] = useState<any>(null);
  
  const [data, setData] = useState<any[]>([]);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  
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
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    if (viewMode === 'users') {
      const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setData(usersData || []);
    } else if (currentLevel === 'fonduri') {
      const { data: fonduriData } = await supabase.from("fonduri").select("*").order("created_at", { ascending: false });
      setData(fonduriData || []);
    } else if (currentLevel === 'compartimente' && selectedFond) {
      const { data: compartimenteData } = await supabase.from("compartimente").select("*").eq("fond_id", selectedFond.id).order("created_at", { ascending: false });
      setData(compartimenteData || []);
    } else if (currentLevel === 'inventare' && selectedCompartiment) {
      const { data: inventareData } = await supabase.from("inventare").select("*").eq("compartiment_id", selectedCompartiment.id).order("created_at", { ascending: false });
      setData(inventareData || []);
    } else if (currentLevel === 'dosare' && selectedInventar) {
      const { data: dosareData } = await supabase.from("dosare").select("*").eq("inventar_id", selectedInventar.id).order("nr_crt", { ascending: true });
      setData(dosareData || []);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [viewMode, currentLevel, selectedFond, selectedCompartiment, selectedInventar]);

  const handleRowDoubleClick = (item: any) => {
    if (viewMode === 'users') return; // No drill-down for users
    
    if (currentLevel === 'fonduri') {
      setSelectedFond(item);
      setCurrentLevel('compartimente');
    } else if (currentLevel === 'compartimente') {
      setSelectedCompartiment(item);
      setCurrentLevel('inventare');
    } else if (currentLevel === 'inventare') {
      setSelectedInventar(item);
      setCurrentLevel('dosare');
    }
  };

  const handleEdit = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditFormData(item);
    setEditOpen(true);
  };

  const handleDelete = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const navigateToBreadcrumb = (level: ViewLevel) => {
    setCurrentLevel(level);
    if (level === 'fonduri') {
      setSelectedFond(null);
      setSelectedCompartiment(null);
      setSelectedInventar(null);
    } else if (level === 'compartimente') {
      setSelectedCompartiment(null);
      setSelectedInventar(null);
    } else if (level === 'inventare') {
      setSelectedInventar(null);
    }
  };

  const handleBack = () => {
    if (currentLevel === 'dosare') {
      setCurrentLevel('inventare');
      setSelectedInventar(null);
    } else if (currentLevel === 'inventare') {
      setCurrentLevel('compartimente');
      setSelectedCompartiment(null);
    } else if (currentLevel === 'compartimente') {
      setCurrentLevel('fonduri');
      setSelectedFond(null);
    }
  };

  const saveEdit = async () => {
    const tableName = viewMode === 'users' ? 'profiles' : currentLevel;
    const { error } = await supabase
      .from(tableName as any)
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
      loadData();
    }
  };

  const confirmDelete = async () => {
    if (viewMode === 'users') {
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
        .from(currentLevel as any)
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
    loadData();
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

  const getTableTitle = () => {
    if (viewMode === 'users') return "Utilizatori";
    
    const titles = {
      fonduri: "Fonduri",
      compartimente: `Compartimente - ${selectedFond?.nume}`,
      inventare: `Inventare - ${selectedCompartiment?.nume}`,
      dosare: `Dosare - Inventar ${selectedInventar?.an}`
    };
    return titles[currentLevel];
  };

  const renderTableHeaders = () => {
    if (viewMode === 'users') {
      return (
        <>
          <TableHead>Username</TableHead>
          <TableHead>Creat la</TableHead>
          <TableHead className="w-32">Acțiuni</TableHead>
        </>
      );
    } else if (currentLevel === 'fonduri' || currentLevel === 'compartimente') {
      return (
        <>
          <TableHead>Nume</TableHead>
          <TableHead>Creat la</TableHead>
          <TableHead className="w-32">Acțiuni</TableHead>
        </>
      );
    } else if (currentLevel === 'inventare') {
      return (
        <>
          <TableHead>An</TableHead>
          <TableHead>Termen Păstrare</TableHead>
          <TableHead>Nr. Dosare</TableHead>
          <TableHead>Creat la</TableHead>
          <TableHead className="w-32">Acțiuni</TableHead>
        </>
      );
    } else if (currentLevel === 'dosare') {
      return (
        <>
          <TableHead>Nr. Crt</TableHead>
          <TableHead>Indicativ</TableHead>
          <TableHead>Conținut</TableHead>
          <TableHead>Date Extreme</TableHead>
          <TableHead>Nr. File</TableHead>
          <TableHead>Nr. Cutie</TableHead>
          <TableHead>Observații</TableHead>
          <TableHead className="w-32">Acțiuni</TableHead>
        </>
      );
    }
  };

  const renderTableRow = (item: any) => {
    if (viewMode === 'users') {
      return (
        <TableRow key={item.id}>
          <TableCell>{item.username}</TableCell>
          <TableCell>{new Date(item.created_at).toLocaleDateString("ro-RO")}</TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={(e) => handleEdit(item, e)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={(e) => handleDelete(item, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    } else if (currentLevel === 'fonduri' || currentLevel === 'compartimente') {
      return (
        <TableRow 
          key={item.id} 
          onDoubleClick={() => handleRowDoubleClick(item)}
          className="cursor-pointer hover:bg-muted/50"
        >
          <TableCell>{item.nume}</TableCell>
          <TableCell>{new Date(item.created_at).toLocaleDateString("ro-RO")}</TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={(e) => handleEdit(item, e)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={(e) => handleDelete(item, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    } else if (currentLevel === 'inventare') {
      return (
        <TableRow 
          key={item.id} 
          onDoubleClick={() => handleRowDoubleClick(item)}
          className="cursor-pointer hover:bg-muted/50"
        >
          <TableCell>{item.an}</TableCell>
          <TableCell>{item.termen_pastrare === 'permanent' ? 'Permanent' : `${item.termen_pastrare} ani`}</TableCell>
          <TableCell>{item.numar_dosare}</TableCell>
          <TableCell>{new Date(item.created_at).toLocaleDateString("ro-RO")}</TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={(e) => handleEdit(item, e)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={(e) => handleDelete(item, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    } else if (currentLevel === 'dosare') {
      return (
        <TableRow key={item.id}>
          <TableCell>{item.nr_crt}</TableCell>
          <TableCell>{item.indicativ_nomenclator}</TableCell>
          <TableCell>{item.continut}</TableCell>
          <TableCell>{item.date_extreme}</TableCell>
          <TableCell>{item.numar_file}</TableCell>
          <TableCell>{item.nr_cutie || '-'}</TableCell>
          <TableCell>{item.observatii || '-'}</TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={(e) => handleEdit(item, e)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={(e) => handleDelete(item, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }
  };

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
          <div className="flex gap-2">
            {viewMode === 'fonduri-hierarchy' && currentLevel !== 'fonduri' && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/fonduri")}>
              <Home className="h-4 w-4 mr-2" />
              Înapoi la Fonduri
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'fonduri-hierarchy' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('fonduri-hierarchy');
              setCurrentLevel('fonduri');
              setSelectedFond(null);
              setSelectedCompartiment(null);
              setSelectedInventar(null);
            }}
          >
            Fonduri
          </Button>
          <Button 
            variant={viewMode === 'users' ? 'default' : 'outline'}
            onClick={() => setViewMode('users')}
          >
            Utilizatori
          </Button>
        </div>

        {viewMode === 'fonduri-hierarchy' && (
          <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigateToBreadcrumb('fonduri')} className="cursor-pointer">
                Fonduri
              </BreadcrumbLink>
            </BreadcrumbItem>
            {selectedFond && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {currentLevel === 'compartimente' ? (
                    <BreadcrumbPage>{selectedFond.nume}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink onClick={() => navigateToBreadcrumb('compartimente')} className="cursor-pointer">
                      {selectedFond.nume}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {selectedCompartiment && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {currentLevel === 'inventare' ? (
                    <BreadcrumbPage>{selectedCompartiment.nume}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink onClick={() => navigateToBreadcrumb('inventare')} className="cursor-pointer">
                      {selectedCompartiment.nume}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {selectedInventar && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Inventar {selectedInventar.an}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{getTableTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableComponent>
              <TableHeader>
                <TableRow>
                  {renderTableHeaders()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => renderTableRow(item))}
              </TableBody>
            </TableComponent>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editează înregistrare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewMode === "users" ? (
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={editFormData.username || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                />
              </div>
            ) : currentLevel === "fonduri" || currentLevel === "compartimente" ? (
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input
                  value={editFormData.nume || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, nume: e.target.value })}
                />
              </div>
            ) : currentLevel === "inventare" ? (
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
            ) : currentLevel === "dosare" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nr. Crt</Label>
                    <Input
                      type="number"
                      value={editFormData.nr_crt || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, nr_crt: parseInt(e.target.value) || "" })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Indicativ Nomenclator</Label>
                    <Input
                      value={editFormData.indicativ_nomenclator || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, indicativ_nomenclator: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Conținut</Label>
                  <Input
                    value={editFormData.continut || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, continut: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Extreme</Label>
                    <Input
                      value={editFormData.date_extreme || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, date_extreme: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nr. File</Label>
                    <Input
                      type="number"
                      value={editFormData.numar_file || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, numar_file: parseInt(e.target.value) || "" })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nr. Cutie</Label>
                    <Input
                      type="number"
                      value={editFormData.nr_cutie || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, nr_cutie: parseInt(e.target.value) || null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observații</Label>
                    <Input
                      value={editFormData.observatii || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, observatii: e.target.value })}
                    />
                  </div>
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