import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';

const faqs: { q: string; a: string }[] = [
    {
        q: 'Kako se plaća?',
        a: 'Karticom (Visa/Mastercard) preko bezbednog checkout-a, ili — za firme — po fakturi sa e-fakturom na SEF (plaćanje virmanom).',
    },
    {
        q: 'Postoji li probni period?',
        a: 'Da — 7 dana besplatno da isprobaš sve funkcije.',
    },
    {
        q: 'Mogu li da otkažem bilo kada?',
        a: 'Da, otkazuješ jednim klikom u podešavanjima naloga; pristup ti ostaje do kraja plaćenog perioda.',
    },
    {
        q: 'Mogu li da platim kao firma i dobijem fakturu?',
        a: 'Da. Uneseš PIB, mi izdajemo e-fakturu na SEF, a plaćaš virmanom. Pristup se otključava odmah.',
    },
    {
        q: 'Kako puštam muziku u svom prostoru?',
        a: 'Pustiš stream direktno iz pregledača na telefonu, tabletu ili računaru — bez instalacije.',
    },
    {
        q: 'Mogu li da upravljam muzikom daljinski, sa telefona?',
        a: 'Da. Sa telefona kontrolišeš šta svira u tvom prostoru — menjaš stanicu, preskačeš pesme, podešavaš jačinu i puštaš svoje plejliste, sa bilo kog mesta gde imaš internet.',
    },
];

export default function SubscriptionOptionsSection() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleCta = () => {
        if (user) navigate('/pretplata');
        else setShowAuthModal(true);
    };

    return (
        <section id="faq" className="py-12 md:py-20 px-4 bg-gray-50 dark:bg-[#0F172A] transition-colors duration-300">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-4xl font-serif">
                        Česta pitanja
                    </h2>
                    <p className="mt-2 md:mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400">
                        Sve što treba da znaš pre nego što počneš.
                    </p>
                </div>

                <div className="space-y-3 md:space-y-4">
                    {faqs.map((item, i) => {
                        const open = openIndex === i;
                        return (
                            <div
                                key={i}
                                className="bg-white dark:bg-infinity-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenIndex(open ? null : i)}
                                    aria-expanded={open}
                                    className="w-full flex items-center justify-between gap-4 text-left px-5 md:px-6 py-4 md:py-5 hover:bg-gray-50 dark:hover:bg-infinity-dark-700/50 transition-colors"
                                >
                                    <span className="font-bold text-gray-900 dark:text-white text-base md:text-lg">
                                        {item.q}
                                    </span>
                                    <ChevronDown
                                        className={`text-infinity-green-600 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                                        size={22}
                                    />
                                </button>
                                <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <p className="px-5 md:px-6 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {item.a}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center mt-8 md:mt-10">
                    <button
                        onClick={handleCta}
                        className="inline-flex items-center gap-2 bg-infinity-green-600 hover:bg-infinity-green-700 text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        Započni besplatno
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </section>
    );
}
