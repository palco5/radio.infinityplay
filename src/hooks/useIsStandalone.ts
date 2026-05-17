import { useState, useEffect } from 'react';

export function useIsStandalone() {
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone
                || document.referrer.includes('android-app://');
            setIsStandalone(!!isStandaloneMode);
        };

        checkStandalone();
    }, []);

    return isStandalone;
}
