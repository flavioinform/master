import { useEffect, useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function DirectivaRoute({ children }) {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [isDirectiva, setIsDirectiva] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) {
        setLoading(false);
        setIsDirectiva(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (!error && data?.rol === "directiva") {
        setIsDirectiva(true);
      } else {
        setIsDirectiva(false);
      }

      setLoading(false);
    };

    checkRole();
  }, [user?.id]);

  if (!user?.id) return <Navigate to="/login" replace />;
  if (loading) return <div className="p-6">Verificando permisos...</div>;
  if (!isDirectiva) return <Navigate to="/dashboard" replace />;

  return children;
}
