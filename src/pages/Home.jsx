import Hero from "../components/Hero";
import InstagramFeed from "../components/InstagramFeed";
import ClubsGallery from "../components/ClubsGallery";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";

function Home() {
        return (
                <div className="flex flex-col min-h-screen">
                        <main className="flex-grow">
                                <Hero />
                                <InstagramFeed />
                                <ClubsGallery />
                                <ContactSection />
                        </main>
                        <Footer />
                </div>
        );
}

export default Home;