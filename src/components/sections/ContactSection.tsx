import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <section id="contact" className="py-20 bg-white dark:bg-infinity-dark-900">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4">
              Kontaktirajte Nas
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Imate pitanja? Želite da postanete sponzor? Javite nam se!
            </p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="bg-infinity-green-50 dark:bg-infinity-dark-800 rounded-3xl p-8 w-full max-w-md">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-infinity rounded-xl flex items-center justify-center">
                  <Mail className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                    Email
                  </h3>
                  <a href="mailto:radio@infinityplay.rs" className="text-infinity-green-600 hover:underline">
                    radio@infinityplay.rs
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-infinity-green-50 dark:bg-infinity-dark-800 rounded-3xl p-8 md:p-12">
            <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6 text-center">
              Pošaljite Nam Poruku
            </h3>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="text-white" size={40} />
                </div>
                <h4 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                  Hvala na poruci!
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Odgovorićemo vam u najkraćem mogućem roku.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Vaše Ime"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ime Prezime"
                  required
                />

                <Input
                  label="Email Adresa"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vas.email@primer.com"
                  required
                />

                <div>
                  <label className="block text-sm font-roboto font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vaša Poruka
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 rounded-infinity border-2 border-gray-300 dark:border-infinity-dark-700 bg-white dark:bg-infinity-dark-900 text-gray-900 dark:text-white focus:border-infinity-green-500 focus:ring-2 focus:ring-infinity-green-200 transition-all duration-200"
                    placeholder="Vaša poruka..."
                    required
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth>
                  <Send size={20} className="mr-2" />
                  Pošalji Poruku
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
