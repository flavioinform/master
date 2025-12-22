import { useState, useContext, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";

export default function CambioPassword() {
    const { user } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [tipo, setTipo] = useState("");
    const [currentPwd, setCurrentPwd] = useState("");

    const [pwdForm, setPwdForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        const loadCurrentPwd = async () => {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from("profiles")
                .select("password")
                .eq("id", user.id)
                .single();
            if (!error && data) {
                setCurrentPwd(data.password || "");
            }
        };
        loadCurrentPwd();
    }, [user?.id]);

    const onPwdChange = (k, v) => setPwdForm((p) => ({ ...p, [k]: v }));

    const handleCambiar = async (e) => {
        e.preventDefault();
        setMsg("");
        setTipo("");
        setLoading(true);

        if (pwdForm.oldPassword !== currentPwd) {
            setMsg("La contraseña actual es incorrecta.");
            setTipo("error");
            setLoading(false);
            return;
        }

        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            setMsg("Las nuevas contraseñas no coinciden.");
            setTipo("error");
            setLoading(false);
            return;
        }

        if (pwdForm.newPassword.length < 4) {
            setMsg("La nueva contraseña debe tener al menos 4 caracteres.");
            setTipo("error");
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({ password: pwdForm.newPassword })
            .eq("id", user.id);

        if (error) {
            setMsg(error.message);
            setTipo("error");
        } else {
            setMsg("Contraseña actualizada exitosamente ✅");
            setTipo("success");
            setCurrentPwd(pwdForm.newPassword);
            setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-amber-100 rounded-2xl text-amber-600 mb-2">
                    <KeyRound size={32} />
                </div>
                <h1 className="text-3xl font-black text-slate-900">Cambiar Contraseña</h1>
                <p className="text-slate-500 font-medium">Mantén tu cuenta segura actualizando tu contraseña periódicamente</p>
            </div>

            {msg && (
                <div
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 font-bold ${tipo === "error"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-green-50 border-green-200 text-green-700"
                        }`}
                >
                    {tipo === "error" ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
                    {msg}
                </div>
            )}

            <form onSubmit={handleCambiar} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                        <input
                            type="password"
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                            placeholder="••••••••"
                            value={pwdForm.oldPassword}
                            onChange={(e) => onPwdChange("oldPassword", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                placeholder="Mínimo 4 caracteres"
                                value={pwdForm.newPassword}
                                onChange={(e) => onPwdChange("newPassword", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nueva</label>
                            <input
                                type="password"
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-amber-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                placeholder="Repite la contraseña"
                                value={pwdForm.confirmPassword}
                                onChange={(e) => onPwdChange("confirmPassword", e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? "Actualizando..." : "Cambiar Contraseña"}
                </button>
            </form>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h4 className="text-blue-900 font-black uppercase tracking-widest text-[10px] mb-2">Consejo de Seguridad</h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                    Usa contraseñas que no hayas utilizado antes en este sitio. Recuerda que la directiva puede resetear tu contraseña si la olvidas.
                </p>
            </div>
        </div>
    );
}
