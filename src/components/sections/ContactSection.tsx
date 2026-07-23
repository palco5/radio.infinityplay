import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/api';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Send email to admin
      await api.emails.send(
        'support@infinityplay.rs', // Destination email
        `Nova poruka od: ${formData.name}`, // Subject
        `
          <h3>Nova poruka sa sajta</h3>
          <p><strong>Ime:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Poruka:</strong></p>
          <p>${formData.message}</p>
        ` // HTML Content
      );

      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);

    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Došlo je do greške prilikom slanja poruke. Molimo pokušajte ponovo.');
    }
  };

  return (
    <section id="contact" className="py-12 md:py-20 bg-white dark:bg-[#0F172A] transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
              Kontaktirajte Nas
            </h2>
            <p className="text-base md:text-xl text-gray-600 dark:text-gray-400">
              Imate pitanja? Želite da postanete sponzor? Javite nam se!
            </p>
          </div>

          <div className="flex justify-center mb-8 md:mb-12">
            <div className="bg-infinity-green-50 dark:bg-infinity-dark-800 rounded-2xl md:rounded-3xl p-6 md:p-8 w-full max-w-md">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-infinity rounded-lg md:rounded-xl flex items-center justify-center">
                  <Mail className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-serif font-bold text-gray-900 dark:text-white">
                    Email
                  </h3>
                  <a href="mailto:support@infinityplay.rs" className="text-sm md:text-base text-infinity-green-600 hover:underline">
                    support@infinityplay.rs
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-infinity-green-50 dark:bg-infinity-dark-800 rounded-2xl md:rounded-3xl p-6 md:p-12">
            <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4 md:mb-6 text-center">
              Pošaljite Nam Poruku
            </h3>

            {submitted ? (
              <div className="text-center py-8 md:py-12">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-infinity rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="text-white" size={32} />
                </div>
                <h4 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">
                  Hvala na poruci!
                </h4>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  Odgovorićemo vam u najkraćem mogućem roku.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
