import { useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Trophy, TrendingUp, Medal, Target, Users, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardHome() {
    const { user } = useContext(AppContext);
    const [stats, setStats] = useState({
        pagosPendientes: 0,
        competenciasActivas: 0,
        inscripciones: 0,
        perfilCompleto: false
    });
    const [loading, setLoading] = useState(true);
    const [nombreCompleto, setNombreCompleto] = useState("");

    useEffect(() => {
        const loadStats = async () => {
            if (!user?.id) return;

            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("nombre_completo, perfil_completo")
                    .eq("id", user.id)
                    .single();

                setNombreCompleto(profile?.nombre_completo || "");

                const { data: vouchers } = await supabase
                    .from("vouchers")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("estado", "pendiente");

                const { data: competitions } = await supabase
                    .from("competitions")
                    .select("id")
                    .eq("status", "open");

                const { data: enrollments } = await supabase
                    .from("competition_enrollments")
                    .select("id")
                    .eq("user_id", user.id);

                setStats({
                    pagosPendientes: vouchers?.length || 0,
                    competenciasActivas: competitions?.length || 0,
                    inscripciones: enrollments?.length || 0,
                    perfilCompleto: profile?.perfil_completo || false
                });
            } catch (error) {
                console.error("Error loading stats:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Professional Header */}
            <div className="bg-slate-900 rounded-lg p-8 text-white border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Panel de Control Deportivo</p>
                <h1 className="text-3xl font-bold mb-2">
                    {nombreCompleto || "Atleta"}
                </h1>
                <p className="text-slate-300">Gestiona tu rendimiento y participación competitiva</p>
            </div>

            {/* Stats Grid - Minimal & Professional */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Pagos */}
                <Link to="/dashboard/vouchers">
                    <div className="bg-white rounded-lg p-6 border-2 border-slate-200 hover:border-slate-400 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-slate-100 rounded">
                                <TrendingUp className="h-5 w-5 text-slate-700" />
                            </div>
                            <span className="text-3xl font-bold text-slate-900">{stats.pagosPendientes}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pagos Pendientes</h3>
                        <p className="text-xs text-slate-500 mt-1">Por revisar</p>
                    </div>
                </Link>

                {/* Competencias */}
                <Link to="/dashboard/convocatorias">
                    <div className="bg-white rounded-lg p-6 border-2 border-slate-200 hover:border-slate-400 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-slate-100 rounded">
                                <Trophy className="h-5 w-5 text-slate-700" />
                            </div>
                            <span className="text-3xl font-bold text-slate-900">{stats.competenciasActivas}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Competencias</h3>
                        <p className="text-xs text-slate-500 mt-1">Abiertas</p>
                    </div>
                </Link>

                {/* Inscripciones */}
                <Link to="/dashboard/convocatorias">
                    <div className="bg-white rounded-lg p-6 border-2 border-slate-200 hover:border-slate-400 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-slate-100 rounded">
                                <Medal className="h-5 w-5 text-slate-700" />
                            </div>
                            <span className="text-3xl font-bold text-slate-900">{stats.inscripciones}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inscripciones</h3>
                        <p className="text-xs text-slate-500 mt-1">Registradas</p>
                    </div>
                </Link>

                {/* Perfil */}
                <Link to="/dashboard/perfil">
                    <div className={`bg-white rounded-lg p-6 border-2 transition-colors ${stats.perfilCompleto ? 'border-slate-200 hover:border-slate-400' : 'border-red-300 hover:border-red-400'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded ${stats.perfilCompleto ? 'bg-slate-100' : 'bg-red-50'}`}>
                                <Target className={`h-5 w-5 ${stats.perfilCompleto ? 'text-slate-700' : 'text-red-600'}`} />
                            </div>
                            <span className={`text-3xl font-bold ${stats.perfilCompleto ? 'text-slate-900' : 'text-red-600'}`}>
                                {stats.perfilCompleto ? '✓' : '!'}
                            </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Perfil</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats.perfilCompleto ? 'Completo' : 'Incompleto'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">Acciones Rápidas</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link
                        to="/dashboard/vouchers"
                        className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Subir Comprobante</h3>
                                <p className="text-xs text-slate-600">Registra tu pago</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/dashboard/convocatorias"
                        className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded">
                                <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Ver Competencias</h3>
                                <p className="text-xs text-slate-600">Inscríbete ahora</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/dashboard/perfil"
                        className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Actualizar Perfil</h3>
                                <p className="text-xs text-slate-600">Completa tus datos</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Alert Banner */}
            {!stats.perfilCompleto && (
                <div className="bg-white rounded-lg p-5 border-2 border-red-300">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900 mb-1">Perfil Incompleto</h3>
                            <p className="text-sm text-slate-600">
                                Para inscribirte en competencias, necesitas completar tu información personal
                            </p>
                        </div>
                        <Link
                            to="/dashboard/perfil"
                            className="px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition-colors text-sm"
                        >
                            Completar Ahora
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
