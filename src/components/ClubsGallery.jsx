import img1 from "../assets/galeria/Screenshot 2025-12-17 205431.png";
import img2 from "../assets/galeria/Screenshot 2025-12-17 205518.png";
import img3 from "../assets/galeria/Screenshot 2025-12-17 205632.png";
import img4 from "../assets/galeria/Screenshot 2025-12-17 205732.png";
import img5 from "../assets/galeria/Screenshot 2025-12-17 205807.png";
import img6 from "../assets/galeria/Screenshot 2025-12-17 205845.png";
import img7 from "../assets/galeria/Screenshot 2025-12-17 205906.png";
import img8 from "../assets/galeria/Screenshot 2025-12-17 205915.png";
import img9 from "../assets/galeria/Screenshot 2025-12-17 205953.png";
import img10 from "../assets/galeria/Screenshot 2025-12-17 210045.png";
import img11 from "../assets/galeria/Screenshot 2025-12-17 210059.png";
import img12 from "../assets/galeria/Screenshot 2025-12-17 210121.png";
import img13 from "../assets/galeria/Screenshot 2025-12-17 210857.png";
import img14 from "../assets/galeria/Screenshot 2025-12-17 210901.png";
import img15 from "../assets/galeria/Screenshot 2025-12-17 211307.png";
import img16 from "../assets/galeria/Screenshot 2025-12-17 211351.png";
import img17 from "../assets/galeria/Screenshot 2025-12-17 231704.png";
import img18 from "../assets/galeria/Screenshot 2025-12-17 231713.png";

export default function ClubsGallery() {
    const galleryImages = [
        { src: img1 },
        { src: img2 },
        { src: img3 },
        { src: img4 },
        { src: img5 },
        { src: img6 },
        { src: img7 },
        { src: img8 },
        { src: img9 },
        { src: img10 },
        { src: img11 },
        { src: img12 },
        { src: img13 },
        { src: img14 },
        { src: img15 },
        { src: img16 },
        { src: img17 },
        { src: img18 },
    ];

    return (
        <section className="py-24 bg-white relative">
            <div className="container mx-auto px-6">
                <div className="flex flex-col items-center mb-16 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 uppercase tracking-tight">
                        Vida del Club
                    </h2>
                    <div className="w-20 h-2 bg-sky-500 rounded-full mb-8"></div>
                    <p className="text-xl text-slate-600 font-bold max-w-2xl leading-relaxed">
                        Momentos compartidos por nuestra comunidad en la Piscina Godoy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {galleryImages.map((item, idx) => (
                        <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-sky-200/50 transition-all duration-500">
                            <div className="aspect-[4/3] overflow-hidden">
                                <img
                                    src={item.src}
                                    alt={`Momento del club ${idx + 1}`}
                                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110"
                                    loading="lazy"
                                />
                            </div>
                            <div className="absolute inset-0 bg-sky-600/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 flex justify-center">
                    <a
                        href="https://www.instagram.com/master_iquique"
                        target="_blank"
                        className="px-8 py-3 bg-sky-50 text-sky-600 font-black rounded-xl border-2 border-sky-100 hover:bg-sky-600 hover:text-white transition-all uppercase tracking-widest text-sm"
                    >
                        Ver más momentos
                    </a>
                </div>
            </div>
        </section>
    );
}
