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
            {/* Professional Header - Light Blue Theme */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl p-10 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                    <p className="text-[10px] text-cyan-100 uppercase tracking-[0.2em] font-black mb-3 opacity-80">Panel de Control Deportivo</p>
                    <h1 className="text-4xl font-black mb-3 tracking-tight">
                        {nombreCompleto || "Atleta"}
                    </h1>
                    <p className="text-blue-50 font-medium text-lg opacity-90">Gestiona tu rendimiento y participación competitiva</p>
                </div>
            </div>

            {/* Stats Grid - Cleaner & Premium */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Pagos */}
                <Link to="/dashboard/vouchers">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <TrendingUp className="h-5 w-5 text-slate-500 group-hover:text-blue-600" />
                            </div>
                            <span className="text-3xl font-black text-slate-900">{stats.pagosPendientes}</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagos Pendientes</h3>
                        <p className="text-xs text-slate-500 mt-1 font-semibold italic">Por revisar</p>
                    </div>
                </Link>

                {/* Competencias */}
                <Link to="/dashboard/convocatorias">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <Trophy className="h-5 w-5 text-slate-500 group-hover:text-blue-600" />
                            </div>
                            <span className="text-3xl font-black text-slate-900">{stats.competenciasActivas}</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competencias</h3>
                        <p className="text-xs text-slate-500 mt-1 font-semibold italic">Abiertas</p>
                    </div>
                </Link>

                {/* Inscripciones */}
                <Link to="/dashboard/convocatorias">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <Medal className="h-5 w-5 text-slate-500 group-hover:text-blue-600" />
                            </div>
                            <span className="text-3xl font-black text-slate-900">{stats.inscripciones}</span>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inscripciones</h3>
                        <p className="text-xs text-slate-500 mt-1 font-semibold italic">Registradas</p>
                    </div>
                </Link>

                {/* Perfil */}
                <Link to="/dashboard/perfil">
                    <div className={`bg-white rounded-2xl p-6 border transition-all group ${stats.perfilCompleto
                        ? 'border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5'
                        : 'border-red-200 bg-red-50/30 hover:bg-red-50 hover:border-red-400'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl transition-colors ${stats.perfilCompleto ? 'bg-slate-50 group-hover:bg-blue-50' : 'bg-red-100/50'}`}>
                                <Target className={`h-5 w-5 ${stats.perfilCompleto ? 'text-slate-500 group-hover:text-blue-600' : 'text-red-600'}`} />
                            </div>
                            <span className={`text-3xl font-black ${stats.perfilCompleto ? 'text-slate-900' : 'text-red-700'}`}>
                                {stats.perfilCompleto ? '✓' : '!'}
                            </span>
                        </div>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest ${stats.perfilCompleto ? 'text-slate-400' : 'text-red-400'}`}>Perfil</h3>
                        <p className={`text-xs mt-1 font-semibold italic ${stats.perfilCompleto ? 'text-slate-500' : 'text-red-600'}`}>
                            {stats.perfilCompleto ? 'Completo' : 'Incompleto'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    Acciones Rápidas
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        to="/dashboard/vouchers"
                        className="p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all border border-transparent"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Subir Comprobante</h3>
                                <p className="text-xs text-slate-500 font-medium">Registra tu pago</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/dashboard/convocatorias"
                        className="p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all border border-transparent"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Ver Competencias</h3>
                                <p className="text-xs text-slate-500 font-medium">Inscríbete ahora</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/dashboard/perfil"
                        className="p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all border border-transparent"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Actualizar Perfil</h3>
                                <p className="text-xs text-slate-500 font-medium">Completa tus datos</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Alert Banner */}
            {!stats.perfilCompleto && (
                <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-red-500/20">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <AlertCircle className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black mb-1 uppercase tracking-tight">¡Atención! Perfil Incompleto</h3>
                            <p className="text-red-50 font-medium opacity-90">
                                Necesitas completar tu información personal para poder inscribirte en las próximas competencias.
                            </p>
                        </div>
                        <Link
                            to="/dashboard/perfil"
                            className="px-8 py-3 bg-white text-red-600 rounded-2xl font-black hover:bg-red-50 transition-all text-sm uppercase tracking-wider shadow-lg"
                        >
                            Completar Ahora
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
