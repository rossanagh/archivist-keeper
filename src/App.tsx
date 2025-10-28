import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/fonduri" element={<ProtectedRoute><Fonduri /></ProtectedRoute>} />
          <Route path="/fonduri/:fondId/compartimente" element={<ProtectedRoute><Compartimente /></ProtectedRoute>} />
          <Route path="/fonduri/:fondId/compartimente/:compartimentId/inventare" element={<ProtectedRoute><Inventare /></ProtectedRoute>} />
          <Route path="/fonduri/:fondId/compartimente/:compartimentId/inventare/:inventarId/dosare" element={<ProtectedRoute><Dosare /></ProtectedRoute>} />
          <Route path="/istoric" element={<ProtectedRoute><Istoric /></ProtectedRoute>} />
          <Route path="/create-admin" element={<ProtectedRoute><CreateAdmin /></ProtectedRoute>} />
          <Route path="/password-management" element={<ProtectedRoute><PasswordManagement /></ProtectedRoute>} />
          <Route path="/database-management" element={<ProtectedRoute><DatabaseManagement /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
