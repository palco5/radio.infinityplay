import { Cookie } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Cookie className="text-infinity-green-500" size={32} />
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Politika Kolačića</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Poslednje ažuriranje: januar 2025.</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Šta su kolačići?</h2>
            <p>Kolačići (cookies) su male tekstualne datoteke koje se čuvaju na vašem uređaju kada posetite web stranicu. Omogućavaju nam da zapamtimo vaše preference i poboljšamo vaše iskustvo na platformi.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Vrste kolačića koje koristimo</h2>

            <div className="mt-4 space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-infinity-dark-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Nužni kolačići</h3>
                <p className="text-sm">Neophodni za funkcionisanje platforme. Bez njih određene funkcije (kao što je prijava na nalog) ne bi radile. Ne mogu se isključiti.</p>
                <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                  <li><code>auth_token</code> — JWT token za autentifikaciju (sessionStorage)</li>
                  <li><code>theme</code> — Preference svetle/tamne teme</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-infinity-dark-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Funkcionalni kolačići</h3>
                <p className="text-sm">Poboljšavaju iskustvo pamćenjem vaših podešavanja i preference između poseta.</p>
                <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                  <li><code>cookie_consent</code> — Čuva vašu odluku o prihvatanju kolačića</li>
                  <li><code>last_station</code> — Poslednja slušana radio stanica</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-infinity-dark-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Analitički kolačići</h3>
                <p className="text-sm">Pomažu nam da razumemo kako korisnici koriste platformu kako bismo je poboljšali. Svi podaci su anonimni i agregirani.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Upravljanje kolačićima</h2>
            <p>Možete upravljati kolačićima na više načina:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Baner pri prvoj poseti:</strong> Prikazujemo baner kojim možete prihvatiti ili odbiti neobavezne kolačiće.</li>
              <li><strong>Podešavanja pregledača:</strong> Možete blokirati ili obrisati kolačiće u podešavanjima vašeg pregledača (Chrome, Firefox, Safari, Edge). Napomena: blokiranje nužnih kolačića može narušiti funkcionisanje platforme.</li>
              <li><strong>Brisanje podataka naloga:</strong> Putem zahteva na support@infinityplay.rs možete zahtevati brisanje svih podataka vezanih za vaš nalog.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Kolačići trećih strana</h2>
            <p>Naša platforma može uključiti sadržaj ili funkcionalnosti trećih strana koje postavljaju sopstvene kolačiće:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>PayPal</strong> — za obradu plaćanja (Politika privatnosti: paypal.com/privacy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Rokovi čuvanja kolačića</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Sesijski kolačići:</strong> Brišu se zatvaranjem pregledača</li>
              <li><strong>Trajni kolačići:</strong> Čuvaju se do 12 meseci ili do brisanja</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Izmene politike</h2>
            <p>Možemo ažurirati ovu politiku. Datum poslednje izmene uvek je prikazan na vrhu stranice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Kontakt</h2>
            <p>Za pitanja o kolačićima: <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">support@infinityplay.rs</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
