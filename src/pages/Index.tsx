import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        navigate("/fonduri");
      } else {
        navigate("/auth");
      }
      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  if (checking) {
    return null;
  }

  return null;
};

export default Index;
