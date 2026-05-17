import { Radio, Mail, Globe, ExternalLink, Shield, FileText, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-infinity-dark-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-infinity rounded-full flex items-center justify-center">
                <Radio className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold">InfinityPlay</h3>
                <p className="text-xs text-infinity-green-400">Radio</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Tvoj zvuk. Tvoj radio. Neograničene mogućnosti online radio platforme.
            </p>
            <a
              href="https://infinityplay.rs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-infinity-green-400 hover:text-infinity-green-300 transition-colors text-sm"
            >
              <Globe size={16} />
              <span>infinityplay.rs</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div>
            <h4 className="font-serif font-bold text-lg mb-4">Navigacija</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://infinityplay.rs" className="text-gray-400 hover:text-infinity-green-400 transition-colors">
                  Početna
                </a>
              </li>
              <li>
                <a href="https://infinityplay.rs#stations" className="text-gray-400 hover:text-infinity-green-400 transition-colors">
                  Naše Stanice
                </a>
              </li>
              <li>
                <a href="https://infinityplay.rs#pricing" className="text-gray-400 hover:text-infinity-green-400 transition-colors">
                  Pretplate
                </a>
              </li>
              <li>
                <a href="https://infinityplay.rs#about" className="text-gray-400 hover:text-infinity-green-400 transition-colors">
                  O Nama
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-lg mb-4">Pretplate</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://infinityplay.rs#pricing" className="text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <span className="font-semibold text-white">Basic Radio</span> - 15€/mes
                </a>
              </li>
              <li>
                <a href="https://infinityplay.rs#pricing" className="text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <span className="font-semibold text-white">Branded Radio</span> - 35€/mes
                </a>
              </li>
              <li>
                <a href="https://infinityplay.rs#pricing" className="text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <span className="font-semibold text-white">Host Radio</span> - 195€/god
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-lg mb-4">Kontakt</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail size={16} className="text-infinity-green-400" />
                <a href="mailto:info@infinityplay.rs" className="text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  info@infinityplay.rs
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Globe size={16} className="text-infinity-green-400" />
                <a href="https://infinityplay.rs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  www.infinityplay.rs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-lg mb-4">Pravna dokumenta</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy-policy" className="flex items-center gap-2 text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <Shield size={14} />
                  Politika privatnosti
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="flex items-center gap-2 text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <FileText size={14} />
                  Uslovi korišćenja
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="flex items-center gap-2 text-gray-400 hover:text-infinity-green-400 transition-colors text-sm">
                  <Cookie size={14} />
                  Politika kolačića
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-infinity-dark-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} InfinityPlay Radio. Sva prava zadržana.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-infinity-green-400 transition-colors">Politika privatnosti</Link>
              <span className="text-gray-700">·</span>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-infinity-green-400 transition-colors">Uslovi korišćenja</Link>
              <span className="text-gray-700">·</span>
              <Link to="/cookie-policy" className="text-gray-400 hover:text-infinity-green-400 transition-colors">Kolačići</Link>
              <span className="text-gray-700">·</span>
              <a href="https://infinityplay.rs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-infinity-green-400 transition-colors inline-flex items-center gap-1">
                <span>Powered by InfinityPlay</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
