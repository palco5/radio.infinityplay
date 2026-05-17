import { useState, useEffect, useRef } from 'react';
import { Play, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import AuthModal from '../auth/AuthModal';
import { stations as stationsApi } from '../../lib/api';
import { RadioStation } from '../../types';
import StationCard from '../StationCard';
import { getGenreStyle } from '../../lib/genreBackgrounds';
import { useAuth } from '../../contexts/AuthContext';

export default function Hero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'login' | 'register'>('login');

  const handleStationClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };
  const [tabletStations, setTabletStations] = useState<RadioStation[]>([]);
  const [topStations, setTopStations] = useState<RadioStation[]>([]);
  const [_loading, setLoading] = useState(true);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenAuthModal = (event: any) => {
      const tab = event.detail?.defaultTab || 'login';
      setDefaultTab(tab);
      setShowAuthModal(true);
    };

    window.addEventListener('OPEN_AUTH_MODAL', handleOpenAuthModal);

    const loadStations = async () => {
      try {
        const data = await stationsApi.getAll();
        const activeStations = data
          .filter((s: RadioStation) => s.is_active)
          .sort((a: RadioStation, b: RadioStation) => a.name.localeCompare(b.name));

        // Mobile marquee: only stations with hero_mobile enabled
        const mobileStations = activeStations.filter((s: RadioStation) => Number(s.hero_mobile) !== 0);
        setTopStations(mobileStations.slice(0, 12)); // up to 12 for a full loop

        // Desktop: only stations with hero_desktop enabled
        const desktopStations = activeStations.filter((s: RadioStation) => Number(s.hero_desktop) !== 0);
        const tabletData = desktopStations.length > 0 ? desktopStations : activeStations;
        const tabletSlice = tabletData.slice(0, 8);
        if (tabletSlice.length < 8 && tabletSlice.length > 0) {
          const filled = [...tabletSlice];
          while (filled.length < 8) filled.push(tabletSlice[filled.length % tabletSlice.length]);
          setTabletStations(filled);
        } else {
          setTabletStations(tabletSlice);
        }

      } catch (err) {
        console.error('Failed to load stations', err);
      } finally {
        setLoading(false);
      }
    };
    loadStations();

    return () => window.removeEventListener('OPEN_AUTH_MODAL', handleOpenAuthModal);
  }, []);

  // Force animation restart once stations load — fixes iOS/Android "stuck" issue
  useEffect(() => {
    const el = marqueeRef.current;
    if (!el || topStations.length === 0) return;
    el.style.animationName = 'none';
    el.getBoundingClientRect(); // force reflow
    el.style.animationName = '';
    el.style.animationPlayState = 'running';
  }, [topStations]);

  const scrollToPricing = () => {
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white pt-24 pb-12 md:py-20 transition-colors duration-300">

      {/* === BACKGROUNDS (Stremio Style) === */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Section */}
        <div className="absolute top-0 left-0 w-full h-[65%] bg-gray-50 dark:bg-[#0B1120] z-0 transition-colors duration-300">
          <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-purple-100/30 dark:from-[#1e1b4b]/30 to-transparent"></div>
        </div>

        {/* Bottom Section - Diagonal Blue/Purple */}
        <div className="absolute bottom-[-10%] left-0 w-[110%] h-[50%] bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-[#4f46e5] dark:to-[#312e81] transform -rotate-3 origin-bottom-right scale-110 z-0 shadow-[0_-50px_100px_rgba(0,0,0,0.3)] dark:shadow-[0_-50px_100px_rgba(0,0,0,0.5)] transition-colors duration-300"></div>

        {/* Glows */}
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-purple-300/20 dark:bg-purple-500/10 blur-[100px] rounded-full z-0 transition-colors duration-300"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8">

        {/* === MOBILE VIEW (Preserved) === */}
        <div className="lg:hidden flex flex-col space-y-8 text-center max-w-2xl mx-auto pt-4 relative z-20">
          <h1 className="text-4xl sm:text-5xl font-extrabold font-serif leading-[1.1] tracking-tight text-gray-900 dark:text-white">
            Tvoj Zvuk. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-infinity-green-600 to-emerald-500 dark:from-infinity-green-400 dark:to-emerald-300">
              Tvoj Radio.
            </span> <br />
            <span className="text-gray-900 dark:text-white">
              InfinityPlay.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-slate-300 max-w-lg font-light leading-relaxed mx-auto">
            Vaš poslovni ili privatni prostor zaslužuje najbolje. Pristupite <strong>mreži radio stanica</strong> prilagođenih vašem biznisu ili kreirajte <strong>sopstveni brendirani radio</strong> sa vašim džinglovima.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mx-auto max-w-lg opacity-90">
            <span className="font-semibold text-infinity-green-600 dark:text-infinity-green-500">Radio za vaš:</span> kafić, restoran, hotel, spa centar...
          </p>

          {/* Mobile Marquee */}
          <div className="relative w-screen -ml-4 md:-ml-8 overflow-hidden my-6 z-0">
            <style>{`
               @keyframes ip-marquee {
                 0%   { transform: translate3d(0, 0, 0); }
                 100% { transform: translate3d(-50%, 0, 0); }
               }
               .ip-marquee {
                 animation: ip-marquee 20s linear infinite;
                 animation-play-state: running;
                 will-change: transform;
               }
               @media (hover: hover) {
                 .ip-marquee:hover {
                   animation-play-state: paused;
                 }
               }
             `}</style>
            <div className="absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-white dark:from-[#0B1120] to-transparent z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-white dark:from-[#0B1120] to-transparent z-20 pointer-events-none"></div>
            <div ref={marqueeRef} className="ip-marquee flex gap-4 w-max px-4">
              {[...topStations, ...topStations].map((station, index) => {
                const style = getGenreStyle(station.genre);
                return (
                  <div key={`${station.id}-${index}`} onClick={handleStationClick} className="w-44 bg-white dark:bg-[#182135] rounded-xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden shrink-0">
                    <div className="h-28 relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`}></div>
                      {station.logo_url && <img src={station.logo_url} alt={`${station.name} - Online Radio Stanica`} className="w-full h-full object-cover relative z-10" />}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{station.name}</h3>
                      <span className="text-[10px] text-gray-500">{station.genre}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="xl" onClick={() => setShowAuthModal(true)} className="shadow-xl w-full sm:w-auto">
              <span className="flex items-center justify-center gap-2">Započni Besplatno <Play size={20} fill="currentColor" /></span>
            </Button>
            <Button variant="outline" size="xl" onClick={scrollToPricing} className="border-2 w-full sm:w-auto">
              Pretplate
            </Button>
          </div>
        </div>


        {/* === DESKTOP VIEW (Stremio Layout) === */}
        <div className="hidden lg:flex flex-col w-full max-w-[1400px] mx-auto pt-8">

          {/* --- TOP ROW: Heading + 3D Cards --- */}
          <div className="flex justify-between items-center mb-0 relative h-[500px]">

            {/* Left: Heading Text (Restored) */}
            <div className="w-5/12 z-20 pl-8">


              <h1 className="text-7xl font-extrabold font-serif mb-6 text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                Tvoj Zvuk. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400">Tvoj Radio.</span> <br />
                <span className="text-gray-900 dark:text-white">InfinityPlay.</span>
              </h1>
              <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 font-light max-w-xl leading-relaxed">
                Vodeći sistem za poslovni radio. Birajte između desetina tematskih stanica ili kreirajte personalizovanu stanicu sa sopstvenim brendingom i džinglovima.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="lg" onClick={() => setShowAuthModal(true)} className="bg-[#84cc16] hover:bg-[#65a30d] text-white border-none rounded-full px-8 py-3 text-lg font-bold shadow-lg shadow-lime-900/20">
                  <span className="flex items-center gap-2 mr-1"><LogIn size={18} /> Uloguj se</span>
                </Button>
                <Button variant="outline" size="lg" onClick={scrollToPricing} className="border border-gray-400 dark:border-white/30 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full px-8 py-3 text-lg">
                  <span className="flex items-center gap-2"><Play size={18} /> Započni Besplatno</span>
                </Button>
              </div>
            </div>

            {/* Right: 3D Station Cards (Absolute to break layout bounds) */}
            <div className="absolute top-[50px] right-[-200px] w-[65%] h-full flex items-center perspective-1000 z-10">
              <div
                className="flex gap-8 transform transition-transform duration-1000 hover:-translate-x-8"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateY(-25deg) rotateX(10deg) rotateZ(-4deg) translateX(50px)',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                  width: '120%'
                }}
              >
                {tabletStations.slice(0, 8).map((station, i) => {
                  const style = getGenreStyle(station.genre);
                  return (
                    <div
                      key={`${station.id}-${i}`}
                      className="w-56 h-[340px] bg-[#1e293b] rounded-xl shadow-2xl border border-white/10 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:-translate-y-4 hover:z-50 cursor-pointer group hover:shadow-emerald-500/20 shrink-0"
                      style={{ zIndex: 20 - i }}
                      onClick={handleStationClick}
                    >
                      <div className="h-full relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-60 mix-blend-overlay`}></div>
                        {station.logo_url ? (
                          <img src={station.logo_url} alt={`${station.name} - InfinityPlay Radio`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-6xl">{station.icon_emoji}</span></div>
                        )}

                        {/* Card Text Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-20">
                          <h3 className="text-white font-bold text-xl leading-tight mb-2 drop-shadow-md">{station.name}</h3>
                          <span className="inline-block px-2 py-1 rounded bg-white/10 backdrop-blur-md text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-white/10">
                            {station.genre}
                          </span>
                        </div>

                        {/* Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[1px]">
                          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-2xl">
                            <Play size={32} className="text-white ml-2" fill="white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>


          {/* --- BOTTOM ROW: Tablet + Text --- */}
          <div className="flex items-center gap-20 relative z-20 pt-20 pl-8">

            {/* Left: Tilted Tablet (Restored Station Cards) */}
            <div className="w-1/2 perspective-2000 group">
              <div
                className="relative bg-[#0F172A] border-[8px] border-gray-800 rounded-[2rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden aspect-[16/10] transform transition-transform duration-700 group-hover:rotate-y-2 group-hover:scale-[1.02]"
                style={{ transform: 'rotateY(12deg) rotateX(6deg)' }}
              >
                {/* Tablet Content */}
                <div className="absolute inset-0 bg-[#0B1120] flex flex-col">
                  {/* Header */}
                  <div className="h-10 bg-[#1e293b] flex items-center px-4 justify-between border-b border-white/5">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">infinityplay.com</div>
                  </div>
                  {/* Grid of StationCards */}
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-hidden h-full">
                    {tabletStations.map(station => (
                      <div key={station.id} className="w-full h-full">
                        <StationCard
                          station={station}
                          isCurrentlyPlaying={false}
                          onClick={handleStationClick}
                          className="h-full shadow-lg hover:shadow-emerald-500/20 bg-gray-800 border-white/5 text-xs"
                          variant="compact"
                        />
                      </div>
                    ))}
                    {/* Overlay on tablet bottom to fade out */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B1120] to-transparent pointer-events-none z-30"></div>
                  </div>
                </div>
              </div>
              {/* Reflection */}
              <div className="absolute -bottom-16 left-10 right-10 h-16 bg-black/60 blur-[60px] rounded-[100%] transform scale-x-90 pointer-events-none"></div>
            </div>

            {/* Right: Feature Text (Restored) */}
            <div className="w-1/2 text-gray-900 dark:text-white pt-10">
              <h2 className="text-3xl font-serif font-bold mb-6 leading-tight text-gray-900 dark:text-white">
                Najbolje rešenje za puštanje muzike u vašim poslovnim objektima.
              </h2>
              <p className="text-xl text-emerald-600 dark:text-emerald-400 font-medium mb-6">
                Kafići • Restorani • Hoteli • Teretane • Spa Centri • Prodavnice
              </p>
              <p className="text-lg text-gray-700 dark:text-indigo-100/80 leading-relaxed mb-8 max-w-lg font-light">
                Stvorite savršenu atmosferu za svoje klijente uz našu pažljivo odabranu kolekciju radio stanica. Bez reklama, bez prekida, samo čista energija koja pokreće vaš biznis.
              </p>

              <div className="p-6 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 backdrop-blur-sm">
                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-2 uppercase tracking-wide text-sm">Vaš Brend, Vaš Zvuk – Brendirani Radio</span>
                  Nudimo ekskluzivnu uslugu izrade <span className="text-gray-900 dark:text-white font-bold underline decoration-emerald-500/50">potpuno brendiranog radija</span> sa vašim džinglovima i reklamnim porukama. Istaknite se u odnosu na konkurenciju i komunicirajte direktno sa vašim kupcima kroz muziku.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        selectedPlan={null}
        defaultTab={defaultTab}
      />
    </section >
  );
}
