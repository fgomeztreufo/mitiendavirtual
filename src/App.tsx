import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import PricingPlans from './components/PricingPlans';
import Technologies from './components/Technologies';
import AboutUs from './components/AboutUs';
import Testimonials from './components/Testimonials';
import Clients from './components/Clients';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import GoogleAnalytics from './components/GoogleAnalytics';
import VideoSection from './components/VideoSection';
import PricingPlansAutomation from './components/PricingPlansAutomation';

function App() {
  return (
    <div className="App">
      <GoogleAnalytics />
      <Header />
      <main>
        <Hero />
        <VideoSection />
        <Services />
        <PricingPlans />
        <PricingPlansAutomation />
        <Technologies />
        <AboutUs />
        <Testimonials />
        <Clients />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;