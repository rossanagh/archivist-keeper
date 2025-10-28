import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate("/fonduri");
      } else {
        // Not logged in, stay on Auth page (which this is)
      }
    };
    checkAndRedirect();
  }, [navigate]);

  return null;
};

export default Index;
