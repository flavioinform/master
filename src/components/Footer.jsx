import { Mail, MapPin, Instagram, Facebook, Twitter, Waves } from "lucide-react";
import logo from "../assets/galeria/master12.png";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 pt-24 pb-12 relative overflow-hidden">
            {/* Top Border Accent - Intense Sky Blue */}
            <div className="absolute top-0 left-0 w-full h-1 bg-sky-600 shadow-[0_4px_10px_rgba(14,165,233,0.5)]"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
                    {/* Brand & Mission */}
                    <div className="space-y-8">
                        <div className="bg-white p-2 rounded-xl w-fit shadow-xl">
                            <img src={logo} alt="Club Master Iquique" className="h-14 w-auto" />
                        </div>
                        <p className="text-slate-400 font-bold leading-relaxed text-sm">
                            Formando nadadores de alto nivel y promoviendo la natación master en Iquique desde el 23 de Agosto del 2008. Pasión, disciplina y comunidad.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { Icon: Instagram, url: "https://www.instagram.com/master_iquique" },
                                { Icon: Facebook, url: "#" },
                                { Icon: Twitter, url: "#" }
                            ].map((social, idx) => (
                                <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800 text-sky-500 rounded-xl hover:bg-sky-600 hover:text-white transition-all transform hover:-translate-y-1 border border-slate-700">
                                    <social.Icon className="h-5 w-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white text-lg font-black uppercase tracking-widest mb-10 relative inline-block">
                            Institucional
                            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-sky-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-4 text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                            <li><a href="#" className="hover:text-sky-500 transition-all block">Inicio</a></li>
                            <li><a href="#" className="hover:text-sky-500 transition-all block">Nuestra Historia</a></li>
                            <li><a href="#" className="hover:text-sky-500 transition-all block">Instalaciones</a></li>
                            <li><a href="/login" className="text-sky-500 hover:text-white transition-all block">Portal de Socios</a></li>
                        </ul>
                    </div>

                    {/* Design Feature: Motto */}
                    <div className="lg:block hidden">
                        <div className="p-10 border-2 border-slate-800 rounded-3xl relative overflow-hidden group hover:border-sky-600/30 transition-colors">
                            <Waves className="h-24 w-24 text-slate-800 absolute -bottom-8 -right-8 transform group-hover:scale-110 transition-transform group-hover:text-sky-600/10" />
                            <h5 className="text-white text-4xl font-black uppercase leading-tight mb-4 relative z-10">
                                Nacer <br />
                                <span className="text-sky-600">Para</span> <br />
                                Nadar
                            </h5>
                            <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Iquique Master Club</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white text-lg font-black uppercase tracking-widest mb-10 relative inline-block">
                            Casa Matriz
                            <span className="absolute -bottom-2 left-0 w-12 h-1 bg-sky-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-8 text-slate-400 font-bold">
                            <li className="flex gap-5">
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                                    <MapPin className="h-5 w-5 text-sky-500" />
                                </div>
                                <span className="text-sm">Iquique, Chile <br /><span className="text-white">Piscina Godoy</span></span>
                            </li>
                            <li className="flex gap-5">
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                                    <Mail className="h-5 w-5 text-sky-500" />
                                </div>
                                <span className="text-sm truncate">clubmasteriquique@gmail.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-600 text-[9px] font-black uppercase tracking-[0.5em]">
                    <p>© {currentYear} CLUB DEPORTIVO MASTER IQUIQUE. TODOS LOS DERECHOS RESERVADOS.</p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-white transition-colors">Normativa</a>
                        <Waves className="h-5 w-5 text-sky-600" />
                        <span className="text-slate-800">Tarapacá</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
