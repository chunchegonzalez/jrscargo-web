import Hero from '@/components/sections/Hero';
import AmazonDeals from '@/components/sections/AmazonDeals';
import TrackingSearch from '@/components/sections/TrackingSearch';
import Rates from '@/components/sections/Rates';
import QuoteCalculator from '@/components/sections/QuoteCalculator';
import HowItWorks from '@/components/sections/HowItWorks';
import CorporateClients from '@/components/sections/CorporateClients';
import ContactSection from '@/components/sections/ContactSection';
import LocationMap from '@/components/sections/LocationMap';

export default function Home() {
  return (
    <>
      <Hero />
      <AmazonDeals />
      <TrackingSearch />
      <Rates />
      <QuoteCalculator />
      <HowItWorks />
      <CorporateClients />
      <ContactSection />
      <LocationMap />
    </>
  );
}
