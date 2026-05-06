import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";

interface AuditLog {
  id: string;
  username: string;
  action: string;
  table_name: string | null;
  details: any;
  created_at: string;
}

const Istoric = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", threeMonthsAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getActionLabel = (action: string, tableName: string | null, details: any) => {
    if (action === "LOGIN") return "Autentificare";
    if (action === "LOGOUT") return "Deconectare";
    
    const tableLabels: Record<string, string> = {
      fonduri: "Fond",
      compartimente: "Compartiment",
      inventare: "Inventar",
      dosare: "Dosar"
    };

    const table = tableName ? tableLabels[tableName] || tableName : "";

    // Special handling for different action types
    if (action === "IMPORT_EXCEL") {
      return `Import ${table}`;
    }

    if (action === "EXPORT_EXCEL") {
      return `Export ${table}`;
    }

    if (action === "INSERT") {
      // For manual additions with specific nr_crt
      if (tableName === "dosare" && details?.nr_crt) {
        return `Adăugare manual Dosar nr crt ${details.nr_crt}`;
      }
      return `Adăugare ${table}`;
    }

    if (action === "UPDATE") {
      return `Modificare ${table}`;
    }

    if (action === "DELETE") {
      return `Ștergere ${table}`;
    }

    return action;
  };

  const getDetailsSummary = (action: string, tableName: string | null, details: any) => {
    if (!details) return "";

    const parts: string[] = [];

    // Add nr_crt or nr_crt_range if available
    if (details.nr_crt) {
      parts.push(`nr crt ${details.nr_crt}`);
    } else if (details.nr_crt_range) {
      parts.push(`nr crt ${details.nr_crt_range}`);
    } else if (details.nume) {
      parts.push(details.nume);
    }

    // Add inventory year
    if (details.inventar_an) {
      parts.push(`Inventar ${details.inventar_an}`);
    }

    // Add compartiment
    if (details.compartiment) {
      parts.push(`Compartiment ${details.compartiment}`);
    }

    // Add fond
    if (details.fond) {
      parts.push(`Fond ${details.fond}`);
    }

    // Add termen_pastrare if available
    if (details.termen_pastrare) {
      parts.push(`${details.termen_pastrare} ani`);
    }

    // Add count for bulk operations
    if (details.count) {
      parts.push(`${details.count} înregistrări`);
    }

    return parts.join(" / ");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/fonduri")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Înapoi la Fonduri
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Istoric Modificări</h1>
          <p className="text-muted-foreground">
            Ultimele 3 luni de activitate admin
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jurnal de Activitate</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Se încarcă...</p>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground">Nu există înregistrări în istoric.</p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data și Ora</TableHead>
                      <TableHead>Utilizator</TableHead>
                      <TableHead>Acțiune</TableHead>
                      <TableHead>Detalii</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: ro })}
                        </TableCell>
                        <TableCell className="font-medium">{log.username}</TableCell>
                        <TableCell>{getActionLabel(log.action, log.table_name, log.details)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getDetailsSummary(log.action, log.table_name, log.details)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Istoric;
