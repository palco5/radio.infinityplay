import { RotateCcw } from 'lucide-react';
import { MERCHANT_OF_RECORD } from '../lib/plans';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-infinity-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <RotateCcw className="text-infinity-green-500" size={32} />
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Politika Povraćaja Novca</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Poslednje ažuriranje: jul 2026.</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Garancija povraćaja novca u roku od 14 dana</h2>
            <p>
              Ako niste zadovoljni InfinityPlay Radio uslugom, možete zatražiti pun povraćaj novca u roku od{' '}
              <strong>14 dana</strong> od datuma prve naplate pretplate, bez potrebe za dodatnim objašnjenjem.
              Zahtev je dovoljno poslati na email naveden u sekciji 4.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Šta se dešava nakon odobrenog povraćaja</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Novac se vraća na isti način plaćanja koji je korišćen prilikom uplate</li>
              <li>Povraćaj se obično obrađuje u roku od 5-10 radnih dana, u zavisnosti od vaše banke ili platnog provajdera</li>
              <li>Pristup pretplaćenim funkcijama se ukida odmah po odobrenju povraćaja</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Obnavljanje pretplate (nakon 14 dana)</h2>
            <p>
              Nakon isteka perioda od 14 dana, pretplate se automatski obnavljaju na kraju svakog obračunskog perioda
              i ta plaćanja se smatraju konačnim, osim ako zakon zemlje u kojoj se nalazite (npr. propisi Evropske unije
              o zaštiti potrošača) ne predviđa drugačije. Otkazivanje pretplate u svakom trenutku sprečava sledeću
              naplatu, ali ne aktivira automatski povraćaj za već naplaćeni period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Kako zatražiti povraćaj</h2>
            <p>
              Pošaljite zahtev na{' '}
              <a href="mailto:support@infinityplay.rs" className="text-infinity-green-500 hover:underline">
                support@infinityplay.rs
              </a>{' '}
              sa email adresom koju koristite za nalog. Odgovaramo u roku od 2 radna dana.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Obrada plaćanja</h2>
            <p>
              Sva plaćanja na InfinityPlay Radio obrađuje{' '}
              <a href={MERCHANT_OF_RECORD.url} target="_blank" rel="noopener noreferrer" className="text-infinity-green-500 hover:underline">
                {MERCHANT_OF_RECORD.name}
              </a>
              , naš ovlašćeni prodavac (Merchant of Record). {MERCHANT_OF_RECORD.name} se pojavljuje na vašem bankovnom izvodu kao prodavac
              i odgovoran je za obradu povraćaja u naše ime.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
