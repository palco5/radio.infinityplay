export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export const countries: Country[] = [
  { code: 'RS', name: 'Srbija', flag: '🇷🇸', dialCode: '+381' },
  { code: 'BA', name: 'Bosna i Hercegovina', flag: '🇧🇦', dialCode: '+387' },
  { code: 'HR', name: 'Hrvatska', flag: '🇭🇷', dialCode: '+385' },
  { code: 'ME', name: 'Crna Gora', flag: '🇲🇪', dialCode: '+382' },
  { code: 'SI', name: 'Slovenija', flag: '🇸🇮', dialCode: '+386' },
  { code: 'MK', name: 'Severna Makedonija', flag: '🇲🇰', dialCode: '+389' },
  { code: 'AT', name: 'Austrija', flag: '🇦🇹', dialCode: '+43' },
  { code: 'DE', name: 'Nemačka', flag: '🇩🇪', dialCode: '+49' },
  { code: 'CH', name: 'Švajcarska', flag: '🇨🇭', dialCode: '+41' },
  { code: 'IT', name: 'Italija', flag: '🇮🇹', dialCode: '+39' },
  { code: 'FR', name: 'Francuska', flag: '🇫🇷', dialCode: '+33' },
  { code: 'GB', name: 'Velika Britanija', flag: '🇬🇧', dialCode: '+44' },
  { code: 'US', name: 'SAD', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'AU', name: 'Australija', flag: '🇦🇺', dialCode: '+61' },
];
