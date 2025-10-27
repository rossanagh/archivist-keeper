import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Always redirect to fonduri (public access)
    navigate("/fonduri");
  }, [navigate]);

  return null;
};

export default Index;
