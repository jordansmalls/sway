import Header from "../components/Header"
import Hero from "../components/Hero"

import Footer from "../components/Footer";
import FAQ from "../components/FAQ";
import BentoGrid from "../components/BentoGrid";
import Pricing from "../components/Pricing";
import About from "../components/About"
import Logos from "../components/Logos";
import CTA from "../components/CTA";

export default function Home() {
    return (
        <>
            <Header />
            <Hero />
            <BentoGrid />
            <Logos />
            <About />
            <Pricing />
            <FAQ />
            <CTA />                                                                                                                                  <Footer />
        </>
    )
}