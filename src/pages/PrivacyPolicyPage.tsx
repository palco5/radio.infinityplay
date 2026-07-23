import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-infinity-green-500" size={32} />
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Politika Privatnosti</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Poslednje ažuriranje: januar 2025.</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Rukovalac podataka</h2>
            <p><strong>Bitrejt d.o.o.</strong>, koji pruža uslugu InfinityPlay Radio („mi", „nas" ili „naša kompanija"), je rukovalac ličnih podataka koje prikupljamo. Kontaktirajte nas na: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">support@infinityplay.rs</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Koji podaci se prikupljaju</h2>
            <p>Prikupljamo sledeće kategorije ličnih podataka:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Podaci o nalogu:</strong> ime, prezime, email adresa, lozinka (u šifrovanom obliku)</li>
              <li><strong>Kontakt podaci:</strong> broj telefona</li>
              <li><strong>Podaci o korišćenju:</strong> informacije o aktivnosti na platformi, minutaža slušanja</li>
              <li><strong>Tehnički podaci:</strong> IP adresa, tip pregledača, tip uređaja, kolačići</li>
              <li><strong>Podaci o plaćanju:</strong> platne transakcije se obrađuju putem PayPal servisa — mi ne čuvamo podatke o platnim karticama</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Svrha obrade podataka</h2>
            <p>Vaše lične podatke koristimo za:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Kreiranje i upravljanje vašim korisničkim nalogom</li>
              <li>Pružanje usluga radio streaminga i upravljanje pretplatama</li>
              <li>Slanje transakcionalnih email poruka (potvrda registracije, fakture)</li>
              <li>Komunikaciju u vezi sa vašim nalogom i uslugama</li>
              <li>Poboljšanje naše platforme i usluga</li>
              <li>Ispunjavanje zakonskih obaveza</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Pravni osnov obrade</h2>
            <p>Vaše podatke obrađujemo na osnovu:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Izvršenja ugovora</strong> — za pružanje usluga koje ste naručili</li>
              <li><strong>Vaše saglasnosti</strong> — za marketinške komunikacije i kolačiće koji nisu nužni</li>
              <li><strong>Legitimnih interesa</strong> — za poboljšanje platforme i bezbednost</li>
              <li><strong>Zakonskih obaveza</strong> — kada to zakon zahteva</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Čuvanje podataka</h2>
            <p>Vaše podatke čuvamo dok vaš nalog postoji i tokom zakonski propisanih rokova. Po brisanju naloga, podaci se uklanjaju u roku od 30 dana, osim ako zakon ne nalaže duže čuvanje.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Deljenje podataka sa trećim stranama</h2>
            <p>Vaše podatke ne prodajemo trećim stranama. Možemo ih podeliti sa:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>PayPal</strong> — za obradu plaćanja</li>
              <li><strong>Loopia</strong> — hosting provajder (serveri u EU)</li>
              <li><strong>Nadležnim organima</strong> — kada to zakon zahteva</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Vaša prava</h2>
            <p>Imate pravo na:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Pristup</strong> — uvid u podatke koje čuvamo o vama</li>
              <li><strong>Ispravku</strong> — izmenu netačnih podataka</li>
              <li><strong>Brisanje</strong> — zahtev za brisanjem naloga i podataka</li>
              <li><strong>Prenosivost</strong> — preuzimanje vaših podataka u mašinski čitljivom formatu</li>
              <li><strong>Prigovor</strong> — na određene vrste obrade</li>
              <li><strong>Povlačenje saglasnosti</strong> — u svakom trenutku</li>
            </ul>
            <p className="mt-3">Zahteve upućujte na: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">support@infinityplay.rs</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Bezbednost podataka</h2>
            <p>Primenjujemo tehničke i organizacione mere zaštite podataka: šifrovanje lozinki, HTTPS protokol, ograničen pristup podacima. Ipak, nijedan sistem nije 100% bezbedan, pa vas molimo da koristite jaku lozinku.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">9. Kolačići</h2>
            <p>Koristimo kolačiće za funkcionisanje platforme i poboljšanje iskustva. Više informacija: <a href="/cookie-policy" className="text-infinity-green-500 hover:underline">Politika kolačića</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">10. Izmene politike</h2>
            <p>Zadržavamo pravo izmene ove politike. O značajnim promenama obavestićemo vas email porukom ili obaveštenjem na platformi. Nastavak korišćenja usluge znači prihvatanje izmenjene politike.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">11. Kontakt</h2>
            <p>Za sva pitanja vezana za privatnost: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">support@infinityplay.rs</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
