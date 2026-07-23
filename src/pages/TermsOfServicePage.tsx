import { FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-infinity-green-500" size={32} />
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Uslovi Korišćenja</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Poslednje ažuriranje: januar 2025.</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Prihvatanje uslova</h2>
            <p>Registracijom na platformi InfinityPlay Radio potvrđujete da ste pročitali, razumeli i prihvatili ove Uslove korišćenja u celosti. Ako se ne slažete sa uslovima, molimo vas da ne koristite naše usluge.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Opis usluge</h2>
            <p>InfinityPlay Radio je platforma za online radio streaming namenjena poslovnim korisnicima (kafići, restorani, hoteli, spa centri i sl.) i privatnim licima. Platforma nudi:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Pristup mreži radio stanica različitih žanrova</li>
              <li>Mogućnost personalizacije džinglova i brendiranja radija</li>
              <li>Upravljanje korisničkim profilom i pretplatama</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Korisnički nalog</h2>
            <p>Za korišćenje platforme neophodno je kreirati korisnički nalog. Obavezujete se da:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Navedete tačne i ažurne podatke pri registraciji</li>
              <li>Čuvate tajnost lozinke i ne delite pristup nalogu sa trećim licima</li>
              <li>Odmah obavestite nas o neovlašćenom pristupu vašem nalogu</li>
              <li>Imate najmanje 18 godina ili zakonsku poslovnu sposobnost</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Pretplate i plaćanje</h2>
            <p>InfinityPlay Radio nudi sledeće planove pretplate:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Basic Radio</strong> — mesečna pretplata, automatsko obnavljanje</li>
              <li><strong>Branded Radio</strong> — mesečna pretplata sa dodatnim funkcijama brendiranja</li>
              <li><strong>Host Radio</strong> — godišnja pretplata za napredne korisnike</li>
            </ul>
            <p className="mt-3">
              Plaćanja obrađuje <strong>Paddle.com Market Limited</strong>, naš ovlašćeni prodavac (Merchant of Record) —
              Paddle se pojavljuje na vašem bankovnom izvodu kao prodavac i odgovoran je za naplatu, poresku obradu i
              podršku vezanu za plaćanje. Pretplate se automatski obnavljaju na kraju svakog obračunskog perioda.
              Otkazivanje je moguće u svakom trenutku putem Podešavanja naloga, a pristup traje do kraja plaćenog
              perioda. Detalje o povraćaju novca pogledajte u našoj{' '}
              <a href="/refund-policy" className="text-infinity-green-500 hover:underline">Politici povraćaja novca</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Probni period</h2>
            <p>Novim korisnicima nudimo besplatan probni period. Tokom probnog perioda imate pristup svim funkcijama odabranog plana. Po isteku probnog perioda, potrebno je odabrati i platiti plan kako biste nastavili korišćenje.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Zabranjena upotreba</h2>
            <p>Zabranjeno je:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Koristiti platformu za nezakonite svrhe</li>
              <li>Pokušati neovlašćeno pristupiti sistemu ili podacima</li>
              <li>Distribuirati sadržaj koji krši autorska prava</li>
              <li>Preprodavati pristup platformi trećim licima bez saglasnosti</li>
              <li>Koristiti automatizovane alate za pristup platformi (botovi, scraperi)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Vlasnik usluge i intelektualna svojina</h2>
            <p>
              Uslugu InfinityPlay Radio pruža{' '}
              <strong className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">[PRAVNO IME / PIB — dopuniti]</strong>{' '}
              (u daljem tekstu: "InfinityPlay"). Sav sadržaj na platformi (dizajn, kod, logotipi, naziv) vlasništvo je
              InfinityPlay. Zabranjeno je kopiranje, reprodukovanje ili distribucija bez pisane dozvole. Radio stanice
              emituju sadržaj u skladu sa važećim propisima o autorskim pravima.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Ograničenje odgovornosti</h2>
            <p>InfinityPlay Radio se trudi da obezbedi neprekidnu dostupnost platforme, ali ne garantuje 100% dostupnost. Nismo odgovorni za:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Privremenu nedostupnost usled tehničkih radova</li>
              <li>Gubitak podataka usled više sile</li>
              <li>Indirektnu ili posledičnu štetu nastalu korišćenjem platforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">9. Raskid ugovora</h2>
            <p>InfinityPlay zadržava pravo da deaktivira ili trajno obriše korisnički nalog u slučaju kršenja ovih uslova, bez prethodne najave i bez prava na povraćaj sredstava. Korisnik može otkazati nalog u svakom trenutku putem email zahteva.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">10. Merodavno pravo</h2>
            <p>Na ove uslove primenjuje se pravo Republike Srbije. Sporovi će se rešavati pred nadležnim sudom u Srbiji.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">11. Kontakt</h2>
            <p>Za pitanja vezana za Uslove korišćenja: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">support@infinityplay.rs</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
