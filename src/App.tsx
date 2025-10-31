import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Fonduri from "./pages/Fonduri";
import Compartimente from "./pages/Compartimente";
import Inventare from "./pages/Inventare";
import Dosare from "./pages/Dosare";
import Istoric from "./pages/Istoric";
import CreateAdmin from "./pages/CreateAdmin";
import PasswordManagement from "./pages/PasswordManagement";
import DatabaseManagement from "./pages/DatabaseManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const handleBeforeUnload = async () => {
      await supabase.auth.signOut();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/fonduri" element={<Fonduri />} />
          <Route path="/fonduri/:fondId/compartimente" element={<Compartimente />} />
          <Route path="/fonduri/:fondId/compartimente/:compartimentId/inventare" element={<Inventare />} />
          <Route path="/fonduri/:fondId/compartimente/:compartimentId/inventare/:inventarId/dosare" element={<Dosare />} />
          <Route path="/istoric" element={<Istoric />} />
          <Route path="/create-admin" element={<CreateAdmin />} />
          <Route path="/password-management" element={<PasswordManagement />} />
          <Route path="/database-management" element={<DatabaseManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
