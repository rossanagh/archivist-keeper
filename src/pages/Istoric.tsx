import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

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

    const actionLabels: Record<string, string> = {
      INSERT: "Adăugare",
      UPDATE: "Modificare",
      DELETE: "Ștergere",
      IMPORT_EXCEL: "Import Excel",
      EXPORT_EXCEL: "Export Excel"
    };

    const table = tableName ? tableLabels[tableName] || tableName : "";
    const actionLabel = actionLabels[action] || action;

    // Special formatting for dosare actions
    if (tableName === "dosare" && details) {
      if (action === "INSERT" && details.nr_crt) {
        return `Adăugare Dosar nr. crt ${details.nr_crt}`;
      }
      if (action === "IMPORT_EXCEL" && details.nr_crt_range) {
        return `Import Excel Dosare nr. crt ${details.nr_crt_range}`;
      }
      if (action === "EXPORT_EXCEL" && details.nr_crt_range) {
        return `Export Excel Dosare nr. crt ${details.nr_crt_range}`;
      }
    }

    return table ? `${actionLabel} ${table}` : actionLabel;
  };

  return (
    <Layout>
      <div className="space-y-6">
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
                          <div className="space-y-1">
                            {log.details?.nume && <div>Nume: {log.details.nume}</div>}
                            {log.details?.inventar_an && (
                              <div className="font-medium text-foreground">
                                din Inventar {log.details.inventar_an}
                                {log.details?.compartiment && `, Compartiment: ${log.details.compartiment}`}
                                {log.details?.fond && `, Fond: ${log.details.fond}`}
                                {log.details?.termen_pastrare && ` (${log.details.termen_pastrare} ani)`}
                              </div>
                            )}
                            {log.details?.count && <div>{log.details.count} înregistrări</div>}
                          </div>
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
