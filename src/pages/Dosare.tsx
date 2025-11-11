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
  const [dateExtreme, setDateExtreme] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const dosarePerPage = 10;
  const [nextNrCrt, setNextNrCrt] = useState<number>(1);
  const [formData, setFormData] = useState({
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

  // Inactivity timeout - 15 minutes
  useEffect(() => {
    if (!isAdmin) return;

    let lastActivity = Date.now();
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Check inactivity every minute
    const checkInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        toast({
          title: "Sesiune expirată",
          description: "Ai fost inactiv 15 minute. Revii la fonduri.",
        });
        unlockInventar();
        navigate("/fonduri");
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInterval);
    };
  }, [isAdmin, userId, inventarId, navigate, toast]);

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
    await checkFullAccess(user.id);
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

  const checkFullAccess = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_access")
      .eq("id", userId)
      .maybeSingle();
    setHasFullAccess(data?.full_access || false);
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
      
      // Calculate next nr_crt
      const maxExisting = data && data.length > 0 
        ? Math.max(...data.map(d => d.nr_crt)) 
        : 0;
      setNextNrCrt(maxExisting + 1);
      
      // Calculate date extreme range from all dosare
      if (data && data.length > 0) {
        const dateRanges = data.map(d => d.date_extreme).filter(d => d);
        if (dateRanges.length > 0) {
          // Extract all years from date ranges (handles formats like "2020-2025" or "2020")
          const allYears: number[] = [];
          dateRanges.forEach(range => {
            const years = range.match(/\d{4}/g);
            if (years) {
              years.forEach(y => allYears.push(parseInt(y)));
            }
          });
          
          if (allYears.length > 0) {
            const minYear = Math.min(...allYears);
            const maxYear = Math.max(...allYears);
            setDateExtreme(minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`);
          }
        }
      }
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
    
    // Get existing dosare to calculate next nr_crt
    const { data: existingDosare } = await supabase
      .from("dosare")
      .select("nr_crt")
      .eq("inventar_id", inventarId)
      .order("nr_crt", { ascending: true });

    // Auto-calculate next nr_crt
    const maxExisting = existingDosare && existingDosare.length > 0 
      ? Math.max(...existingDosare.map(d => d.nr_crt)) 
      : 0;
    const nrCrt = maxExisting + 1;
    
    const { error } = await supabase.from("dosare").insert([
      {
        nr_crt: nrCrt,
        indicativ_nomenclator: formData.indicativ_nomenclator,
        continut: formData.continut,
        date_extreme: formData.date_extreme,
        numar_file: formData.numar_file ? parseInt(formData.numar_file) : null,
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

  const handleDownloadEvidenta = async () => {
    try {
      // Import the template file
      const templateUrl = new URL('../assets/registru-evidenta-template.xlsx', import.meta.url).href;
      const response = await fetch(templateUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Fill in the data in row 7 (index 6) based on the template structure
      // Row 7 is where the first data entry should be
      const rowIndex = 7;
      
      // Column mapping based on the Excel structure
      worksheet[`B${rowIndex}`] = { t: 's', v: '' }; // Data intrarii - empty
      worksheet[`C${rowIndex}`] = { t: 's', v: compartimentNume }; // Denumirea compartimentului
      worksheet[`D${rowIndex}`] = { t: 's', v: `Inventarul documentelor din anul ${inventarAn}` }; // Nume Inventar
      worksheet[`E${rowIndex}`] = { t: 's', v: inventarAn.toString() }; // Date extreme - doar anul
      worksheet[`F${rowIndex}`] = { t: 'n', v: dosare.length }; // Nr. Total dosare
      worksheet[`G${rowIndex}`] = { t: 'n', v: dosare.length }; // Nr. Dosare primite efectiv
      worksheet[`H${rowIndex}`] = { t: 'n', v: 0 }; // Nr. Dosare ramase la compartim
      worksheet[`I${rowIndex}`] = { t: 's', v: `${inventarTermen} ani` }; // Termen de pastrare
      worksheet[`J${rowIndex}`] = { t: 's', v: '' }; // Data iesirii - empty
      worksheet[`K${rowIndex}`] = { t: 's', v: '' }; // Unde s-au predat - empty
      worksheet[`L${rowIndex}`] = { t: 's', v: '' }; // Act de predare - empty
      worksheet[`M${rowIndex}`] = { t: 's', v: '' }; // Total dosare iesite - empty
      worksheet[`N${rowIndex}`] = { t: 's', v: '' }; // Obs - empty
      
      // Generate the file
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Evidenta_${compartimentNume}_${inventarAn}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Evidența a fost descărcată cu succes",
      });
    } catch (error) {
      console.error("Error downloading evidenta:", error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut descărca evidența",
      });
    }
  };

  const handleDownloadLabels = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      // Load Roboto fonts that support Romanian diacritics
      const fontUrlNormal = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf';
      const fontUrlBold = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Bold.ttf';
      
      const [fontResponseNormal, fontResponseBold] = await Promise.all([
        fetch(fontUrlNormal),
        fetch(fontUrlBold)
      ]);
      
      const fontBlobNormal = await fontResponseNormal.arrayBuffer();
      const fontBlobBold = await fontResponseBold.arrayBuffer();
      
      const fontBase64Normal = btoa(
        new Uint8Array(fontBlobNormal).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const fontBase64Bold = btoa(
        new Uint8Array(fontBlobBold).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'cm',
        format: 'a4'
      });
      
      // Add Romanian-compatible fonts
      doc.addFileToVFS('Roboto-Regular.ttf', fontBase64Normal);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Bold.ttf', fontBase64Bold);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      doc.setFont('Roboto', 'normal');

      // Helper function to fit text in available width
      const fitText = (text: string, maxWidth: number, startFontSize: number, minFontSize: number = 4) => {
        let fontSize = startFontSize;
        doc.setFontSize(fontSize);
        
        while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
          fontSize -= 0.3; // Reduce more aggressively
          doc.setFontSize(fontSize);
        }
        
        return fontSize;
      };

      const pageWidth = 29.7; // A4 landscape width in cm
      const pageHeight = 21; // A4 landscape height in cm
      const labelWidth = 2; // 2 cm width for each spine
      const spineLabelsPerPage = Math.floor(pageWidth / labelWidth); // 14 labels per page
      
      let labelIndex = 0;
      
      for (const dosar of dosare) {
        const pageIndex = Math.floor(labelIndex / spineLabelsPerPage);
        const positionInPage = labelIndex % spineLabelsPerPage;
        
        // Add new page if needed
        if (labelIndex > 0 && positionInPage === 0) {
          doc.addPage();
        }
        
        const xPos = positionInPage * labelWidth;
        
        // Draw border for each spine
        doc.setDrawColor(200, 200, 200);
        doc.rect(xPos, 0, labelWidth, pageHeight);
        
        // Nr. Crt - top, horizontal, small
        doc.setFontSize(10);
        doc.text(dosar.nr_crt.toString(), xPos + labelWidth / 2, 1, { 
          align: 'center' 
        });
        
        // An - below nr crt, horizontal, small
        doc.setFontSize(10);
        doc.text(inventarAn?.toString() || '', xPos + labelWidth / 2, 2, { 
          align: 'center' 
        });
        
        // Continut - middle, VERTICAL (rotated 90 degrees), larger
        doc.setFontSize(12);
        const content = dosar.continut.length > 80 
          ? dosar.continut.substring(0, 77) + '...' 
          : dosar.continut;
        
        // Rotate text 90 degrees counterclockwise for vertical text
        doc.text(content, xPos + labelWidth / 2 + 0.3, pageHeight - 3, { 
          angle: 90,
          align: 'left',
          maxWidth: pageHeight - 6
        });
        
        // Termen pastrare - bottom, horizontal, small
        doc.setFontSize(9);
        const termenText = inventarTermen === 'permanent' ? 'permanent' : `${inventarTermen} ani`;
        doc.text(termenText || '', xPos + labelWidth / 2, pageHeight - 0.8, { 
          align: 'center' 
        });
        
        labelIndex++;
      }
      
      // Add document labels (10 per page) after spines
      doc.addPage();
      
      const docLabelWidth = 14; // 14 cm width
      const docLabelHeight = 3.8; // Height for each label
      const docLabelsPerRow = 2; // 2 labels per row
      const docLabelsPerPage = 10; // 5 rows x 2 columns = 10 labels per page
      const marginX = 0.5;
      const marginY = 0.5;
      
      for (let i = 0; i < dosare.length; i++) {
        const dosar = dosare[i];
        const row = Math.floor(i / docLabelsPerRow);
        const col = i % docLabelsPerRow;
        
        // Add new page if needed (10 labels per page max - 5x2)
        if (i > 0 && i % docLabelsPerPage === 0) {
          doc.addPage();
        }
        
        const adjustedRow = row % 5; // Reset row for each page (5 rows per page)
        const xPos = marginX + col * (docLabelWidth + 0.5);
        const yPos = marginY + adjustedRow * (docLabelHeight + 0.3); // Reduced spacing to fit 5 rows
        
        // Draw outer border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.03);
        doc.rect(xPos, yPos, docLabelWidth, docLabelHeight);
        
        // Draw table structure
        const cellHeight = docLabelHeight / 5;
        
        // Row 1: Fond
        doc.line(xPos, yPos + cellHeight, xPos + docLabelWidth, yPos + cellHeight);
        doc.setFontSize(7);
        doc.setFont('Roboto', 'bold');
        doc.text('Fond:', xPos + 0.2, yPos + 0.3);
        doc.setFont('Roboto', 'normal');
        const fondLines = doc.splitTextToSize(fondNume, docLabelWidth - 1.5);
        doc.text(fondLines.slice(0, 2), xPos + 1.2, yPos + 0.3, { lineHeightFactor: 1.2 });
        
        // Row 2: Compartiment
        doc.line(xPos, yPos + cellHeight * 2, xPos + docLabelWidth, yPos + cellHeight * 2);
        doc.setFontSize(7);
        doc.setFont('Roboto', 'bold');
        doc.text('Compartiment:', xPos + 0.2, yPos + cellHeight + 0.3);
        doc.setFont('Roboto', 'normal');
        const compartimentLines = doc.splitTextToSize(compartimentNume, docLabelWidth - 2.5);
        doc.text(compartimentLines.slice(0, 2), xPos + 2.3, yPos + cellHeight + 0.3, { lineHeightFactor: 1.2 });
        
        // Row 3: Indicativ | Nr Crt (split in two)
        doc.line(xPos, yPos + cellHeight * 3, xPos + docLabelWidth, yPos + cellHeight * 3);
        const midX = xPos + docLabelWidth / 2;
        doc.line(midX, yPos + cellHeight * 2, midX, yPos + cellHeight * 3);
        doc.setFontSize(7);
        doc.setFont('Roboto', 'bold');
        doc.text('Indicativ:', xPos + 0.2, yPos + cellHeight * 2 + 0.3);
        doc.setFont('Roboto', 'normal');
        const indicativLines = doc.splitTextToSize(dosar.indicativ_nomenclator, (docLabelWidth / 2) - 1.8);
        doc.text(indicativLines.slice(0, 2), xPos + 1.5, yPos + cellHeight * 2 + 0.3, { lineHeightFactor: 1.2 });
        doc.setFont('Roboto', 'bold');
        doc.text('Nr. Crt:', midX + 0.2, yPos + cellHeight * 2 + 0.3);
        doc.setFont('Roboto', 'normal');
        doc.text(dosar.nr_crt.toString(), midX + 1.3, yPos + cellHeight * 2 + 0.3);
        
        // Row 4: Continut
        doc.line(xPos, yPos + cellHeight * 4, xPos + docLabelWidth, yPos + cellHeight * 4);
        doc.setFontSize(7);
        doc.setFont('Roboto', 'bold');
        doc.text('Continut pe scurt:', xPos + 0.2, yPos + cellHeight * 3 + 0.3);
        doc.setFont('Roboto', 'normal');
        const continutLines = doc.splitTextToSize(dosar.continut, docLabelWidth - 2.8);
        doc.text(continutLines.slice(0, 2), xPos + 2.5, yPos + cellHeight * 3 + 0.3, { lineHeightFactor: 1.2 });
        
        // Row 5: Date extreme | Termen pastrare (split in two)
        doc.line(midX, yPos + cellHeight * 4, midX, yPos + cellHeight * 5);
        doc.setFontSize(7);
        doc.setFont('Roboto', 'bold');
        doc.text('Date extreme:', xPos + 0.2, yPos + cellHeight * 4 + 0.3);
        doc.setFont('Roboto', 'normal');
        const dateLines = doc.splitTextToSize(dosar.date_extreme, (docLabelWidth / 2) - 2.3);
        doc.text(dateLines.slice(0, 2), xPos + 2, yPos + cellHeight * 4 + 0.3, { lineHeightFactor: 1.2 });
        doc.setFont('Roboto', 'bold');
        doc.text('TP:', midX + 0.2, yPos + cellHeight * 4 + 0.3);
        doc.setFont('Roboto', 'normal');
        const termenText = inventarTermen === 'permanent' ? 'permanent' : `${inventarTermen} ani`;
        doc.text(termenText, midX + 0.7, yPos + cellHeight * 4 + 0.3);
      }
      
      // Save the PDF
      const fileName = `Etichete_${fondNume || 'fond'}_${compartimentNume || 'compartiment'}_${inventarAn || 'an'}.pdf`;
      doc.save(fileName);
      
      // Log audit
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
          action: "DOWNLOAD_LABELS",
          table_name: "dosare",
          record_id: inventarId,
          details: {
            count: dosare.length,
            inventar_an: inventarAn,
            fond: fondNume,
            compartiment: compartimentNume,
          },
        });
      }
      
      toast({
        title: "Etichete generate",
        description: `${dosare.length} cotoare și etichete generate în format PDF`,
      });
    } catch (error) {
      console.error("Error generating spines:", error);
      toast({
        variant: "destructive",
        title: "Eroare la generare",
        description: "Nu s-au putut genera cotoarele PDF",
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Import started for file:", file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        console.log("File read successfully, processing data...");
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays to find where the table starts
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        console.log("Raw Excel data:", rawData.length, "rows");

        // Find the header row by looking for key column names
        let headerRowIndex = -1;
        let headerMapping: { [key: string]: number } = {};
        
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          // Look for "Nr. crt" or "nr_crt" or similar variations
          const nrCrtIndex = row.findIndex((cell: any) => {
            const cellStr = String(cell).toLowerCase().trim();
            return cellStr.includes("nr") && (cellStr.includes("crt") || cellStr.includes("curent"));
          });
          
          if (nrCrtIndex !== -1) {
            headerRowIndex = i;
            // Map all headers
            row.forEach((header: any, index: number) => {
              const headerStr = String(header).toLowerCase().trim();
              if (headerStr.includes("nr") && (headerStr.includes("crt") || headerStr.includes("curent"))) {
                headerMapping["nr_crt"] = index;
              } else if (headerStr.includes("indicativ") || headerStr.includes("nomenclator")) {
                headerMapping["indicativ_nomenclator"] = index;
              } else if (headerStr.includes("conținut") || headerStr.includes("continut")) {
                headerMapping["continut"] = index;
              } else if (headerStr.includes("date") && headerStr.includes("extreme")) {
                headerMapping["date_extreme"] = index;
              } else if (headerStr.includes("număr") && headerStr.includes("file") || headerStr.includes("numar") && headerStr.includes("file")) {
                headerMapping["numar_file"] = index;
              } else if (headerStr.includes("observații") || headerStr.includes("observatii")) {
                headerMapping["observatii"] = index;
              } else if (headerStr.includes("cutie")) {
                headerMapping["nr_cutie"] = index;
              }
            });
            break;
          }
        }

        if (headerRowIndex === -1) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: "Nu s-a găsit tabelul cu date. Asigurați-vă că fișierul conține coloanele necesare.",
          });
          return;
        }

        console.log("Found header row at index:", headerRowIndex);
        console.log("Header mapping:", headerMapping);

        // Parse data rows starting after the header
        const dataRows = rawData.slice(headerRowIndex + 1);
        const dosareData = dataRows
          .filter((row: any[]) => {
            // Skip completely empty rows
            if (!row || row.every((cell: any) => !cell || String(cell).trim() === "")) {
              return false;
            }
            // Skip rows where nr_crt is empty
            const nrCrtValue = row[headerMapping["nr_crt"]];
            return nrCrtValue !== undefined && nrCrtValue !== null && String(nrCrtValue).trim() !== "";
          })
          .map((row: any[]) => {
            const nrCrt = row[headerMapping["nr_crt"]];
            const indicativ = row[headerMapping["indicativ_nomenclator"]];
            const continut = row[headerMapping["continut"]];
            const dateExtreme = row[headerMapping["date_extreme"]];
            const numarFile = row[headerMapping["numar_file"]];
            const observatii = row[headerMapping["observatii"]];
            const nrCutie = row[headerMapping["nr_cutie"]];

            // Check if required fields are present and not empty
            const hasNrCrt = nrCrt !== undefined && nrCrt !== null && String(nrCrt).trim() !== "";
            const hasIndicativ = indicativ !== undefined && indicativ !== null && String(indicativ).trim() !== "";
            const hasContinut = continut !== undefined && continut !== null && String(continut).trim() !== "";
            const hasDateExtreme = dateExtreme !== undefined && dateExtreme !== null && String(dateExtreme).trim() !== "";

            if (!hasNrCrt || !hasIndicativ || !hasContinut || !hasDateExtreme) {
              throw new Error(`Lipsesc date obligatorii pe rândul cu nr. crt ${nrCrt || 'necunoscut'}`);
            }

            return {
              nr_crt: Number(nrCrt),
              indicativ_nomenclator: String(indicativ).trim(),
              continut: String(continut).trim(),
              date_extreme: String(dateExtreme).trim(),
              numar_file: numarFile !== undefined && numarFile !== null && String(numarFile).trim() !== "" ? Number(numarFile) : null,
              observatii: observatii !== undefined && observatii !== null && String(observatii).trim() !== "" ? String(observatii).trim() : null,
              nr_cutie: nrCutie !== undefined && nrCutie !== null && String(nrCutie).trim() !== "" ? Number(nrCutie) : null,
              inventar_id: inventarId,
            };
          });

        console.log("Parsed dosare data:", dosareData.length, "rows");

        if (!dosareData.length) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: "Fișierul nu conține date valide după antetul tabelului",
          });
          return;
        }

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
        
        // Validate sequence starts from 1
        if (sortedData.length > 0 && sortedData[0].nr_crt !== 1) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: `Numerotarea trebuie să înceapă de la 1, nu de la ${sortedData[0].nr_crt}.`,
          });
          return;
        }
        
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
        const { data: existingDosare, error: fetchError } = await supabase
          .from("dosare")
          .select("nr_crt, id")
          .eq("inventar_id", inventarId);

        if (fetchError) {
          toast({
            variant: "destructive",
            title: "Eroare la import",
            description: `Nu s-au putut încărca dosarele existente: ${fetchError.message}`,
          });
          return;
        }

        const existingMap = new Map(existingDosare?.map(d => [d.nr_crt, d.id]) || []);
        let insertedCount = 0;
        let skippedCount = 0;
        let updatedCount = 0;

        // Process all dosare - insert new ones, update or skip existing based on checkbox
        for (const dosar of dosareData) {
          const existingId = existingMap.get(dosar.nr_crt);
          
          if (existingId) {
            if (overwriteExisting && hasFullAccess) {
              // Update existing record if overwrite is enabled and user has full access
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
                toast({
                  variant: "destructive",
                  title: "Eroare la actualizare",
                  description: `Eroare la dosarul nr. crt ${dosar.nr_crt}: ${error.message}`,
                });
                return;
              }
              updatedCount++;
            } else {
              // Skip existing record
              skippedCount++;
            }
          } else {
            // Insert new record
            const { error } = await supabase
              .from("dosare")
              .insert(dosar);

            if (error) {
              toast({
                variant: "destructive",
                title: "Eroare la inserare",
                description: `Eroare la dosarul nr. crt ${dosar.nr_crt}: ${error.message}`,
              });
              return;
            }
            insertedCount++;
          }
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
              skipped: skippedCount,
              inserted: insertedCount,
              updated: updatedCount,
              overwrite_enabled: overwriteExisting,
              nr_crt_range: `${sortedNrCrt[0]}-${sortedNrCrt[sortedNrCrt.length - 1]}`,
              inventar_an: inventarAn,
              fond: fondNume,
              compartiment: compartimentNume,
              termen_pastrare: inventarTermen,
            },
          });
        }

        let description = `Total ${dosareData.length} dosare procesate`;
        const parts = [];
        if (insertedCount > 0) parts.push(`${insertedCount} noi`);
        if (updatedCount > 0) parts.push(`${updatedCount} actualizate`);
        if (skippedCount > 0) parts.push(`${skippedCount} sărite`);
        
        if (parts.length > 0) {
          description += `: ${parts.join(', ')}`;
        }

        console.log("Import successful:", { skippedCount, insertedCount, updatedCount });
        toast({
          title: "Import reușit",
          description: description,
        });
        
        // Reset the file input so the same file can be imported again
        e.target.value = "";
        
        loadDosare();
      } catch (error: any) {
        console.error("Import error:", error);
        toast({
          variant: "destructive",
          title: "Eroare la import",
          description: error.message || "Verificați formatul fișierului",
        });
        
        // Reset the file input even on error
        e.target.value = "";
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
              <div className="flex flex-col gap-3">
                {hasFullAccess && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="overwrite"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                      Suprascrie dosare existente la import
                    </Label>
                  </div>
                )}
                <div className="flex gap-2">
                  {hasFullAccess && (
                    <>
                      <Button variant="outline" onClick={handleDownloadLabels}>
                        <Download className="h-4 w-4 mr-2" />
                        Descarcă Etichete
                      </Button>
                      <Button variant="outline" onClick={handleDownloadEvidenta}>
                        <Download className="h-4 w-4 mr-2" />
                        Descarcă Evidență
                      </Button>
                    </>
                  )}
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
                      <div className="space-y-2">
                        <Label>Nr. Curent (Auto)</Label>
                        <Input
                          value={nextNrCrt}
                          disabled
                          className="bg-muted"
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
                          <Label htmlFor="date">An (Date Extreme) *</Label>
                          <Input
                            id="date"
                            type="number"
                            placeholder="2005"
                            min="1900"
                            max="2100"
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
                          <Label htmlFor="file">Număr File</Label>
                          <Input
                            id="file"
                            type="number"
                            value={formData.numar_file}
                            onChange={(e) =>
                              setFormData({ ...formData, numar_file: e.target.value })
                            }
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
