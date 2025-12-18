import { Instagram } from "lucide-react";
import img1 from "../assets/galeria/Screenshot 2025-12-17 231713.png";
import img2 from "../assets/galeria/Screenshot 2025-12-17 210901.png";
import img3 from "../assets/galeria/Screenshot 2025-12-17 211351.png";
import img4 from "../assets/galeria/Screenshot 2025-12-17 210857.png";
import img5 from "../assets/galeria/Screenshot 2025-12-17 210121.png";
import img6 from "../assets/galeria/Screenshot 2025-12-17 231704.png";

export default function InstagramFeed() {
    const posts = [
        {
            url: "https://www.instagram.com/reel/DMpSJwkOmxL/",
            image: img1
        },
        {
            url: "https://www.instagram.com/master_iquique/reel/DSBMV_GEVrt/",
            image: img2
        },
        {
            url: "https://www.instagram.com/master_iquique/p/DQ4O15FkXk0/",
            image: img3
        },
        {
            url: "https://www.instagram.com/master_iquique/reel/DPxP_k5kf9h/",
            image: img4
        },
        {
            url: "https://www.instagram.com/master_iquique/reel/DPZ0HsAEc0S/",
            image: img5
        },
        {
            url: "https://www.instagram.com/master_iquique/p/DOABXOHEeO8/",
            image: img6
        },
    ];

    return (
        <section className="py-24 bg-sky-50 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl -mr-48 -mt-48"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="p-3 bg-sky-100 rounded-xl mb-6 shadow-sm">
                        <Instagram className="h-8 w-8 text-sky-600" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
                        Instagram Feed
                    </h2>
                    <p className="text-slate-500 font-bold mb-8 max-w-lg">
                        Sigue de cerca nuestros entrenamientos y últimas novedades.
                    </p>
                    <a
                        href="https://www.instagram.com/master_iquique"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-sky-600 text-white font-black text-sm rounded-xl hover:bg-sky-700 transition-all uppercase tracking-widest shadow-xl shadow-sky-100"
                    >
                        Sigue a @master_iquique
                    </a>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {posts.map((post, idx) => (
                        <a
                            key={idx}
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square relative group overflow-hidden rounded-2xl shadow-lg transition-transform duration-500 hover:-translate-y-2"
                        >
                            <img
                                src={post.image}
                                alt={`Instagram post ${idx + 1}`}
                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-sky-600/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                    <Instagram className="text-sky-600 h-6 w-6" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
