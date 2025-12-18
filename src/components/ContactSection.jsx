import { Mail, MapPin, Send, Waves } from "lucide-react";

export default function ContactSection() {
    return (
        <section id="contacto" className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center mb-20 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-lg text-xs font-black uppercase tracking-widest mb-6 border border-sky-100">
                        <Waves className="h-4 w-4" />
                        <span>Forma parte de nosotros</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter uppercase">
                        Contáctanos
                    </h2>
                    <div className="w-20 h-2 bg-sky-600 rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    {/* Info Section */}
                    <div className="space-y-8">
                        <div className="p-10 bg-sky-600 rounded-3xl shadow-2xl shadow-sky-200 relative overflow-hidden group">
                            {/* Decorative water pattern */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/water.png')] group-hover:scale-110 transition-transform duration-1000"></div>

                            <h3 className="text-2xl font-black text-white mb-8 uppercase relative z-10">Información Oficial</h3>
                            <div className="space-y-8 relative z-10">
                                <div className="flex items-start gap-6">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                                        <MapPin className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-sky-100 uppercase mb-1 tracking-widest">Sede de Entrenamiento</p>
                                        <p className="text-lg text-white font-bold">Piscina Godoy, Iquique, Chile</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                                        <Mail className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-sky-100 uppercase mb-1 tracking-widest">Email Corporativo</p>
                                        <p className="text-lg text-white font-bold">clubmasteriquique@gmail.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary info / Catchy box */}
                        <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl">
                            <p className="text-slate-500 font-bold leading-relaxed italic">
                                "La natación no es solo un deporte, es nuestro estilo de vida. Ven a formarte con nosotros en Iquique."
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="w-10 h-1 bg-sky-600 rounded-full"></div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Club Master Iquique</span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white p-10 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-50">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Tu nombre"
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="tu@email.com"
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tu Mensaje</label>
                                <textarea
                                    rows="4"
                                    placeholder="Cuéntanos..."
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold placeholder:text-slate-300 shadow-sm resize-none"
                                ></textarea>
                            </div>
                            <button className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-xl shadow-sky-100 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 uppercase tracking-widest text-sm">
                                <Send className="h-5 w-5" />
                                Enviar Mensaje
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
