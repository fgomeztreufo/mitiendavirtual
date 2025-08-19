import React, { useState, useEffect } from 'react';
import { Star, Send, User } from 'lucide-react';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { siteConfig } from '../config/siteConfig';

interface Testimonial {
  id?: string;
  name: string;
  message: string;
  rating: number;
  createdAt?: any;
}

const Testimonials: React.FC = () => {
  if (!siteConfig.testimonials.isVisible) {
    return null; // No renderiza la sección si isVisible es false
  }

  // State to manage testimonials and form data
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    rating: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Load testimonials from Firestore
  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loadedTestimonials: Testimonial[] = [];
      querySnapshot.forEach((doc) => {
        loadedTestimonials.push({ id: doc.id, ...doc.data() } as Testimonial);
      });
      setTestimonials(loadedTestimonials);
    } catch (error) {
      console.error('Error loading testimonials:', error);
      // Load default testimonials if Firestore fails
      setTestimonials([
        {
          id: '1',
          name: 'María González',
          message: 'Excelente servicio, mi tienda online está funcionando perfecto. Las ventas han aumentado un 300% desde que la lancé.',
          rating: 5
        },
        {
          id: '2',
          name: 'Carlos Ruiz',
          message: 'Muy profesionales y rápidos. El soporte técnico es excepcional, siempre disponibles cuando los necesito.',
          rating: 5
        },
        {
          id: '3',
          name: 'Ana Morales',
          message: 'La mejor inversión que he hecho para mi negocio. La plataforma es muy fácil de usar y mis clientes están encantados.',
          rating: 4
        }
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      setSubmitMessage('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: formData.name,
        message: formData.message,
        rating: formData.rating,
        createdAt: new Date()
      });
      
      setSubmitMessage('¡Gracias por tu testimonio! Se ha enviado correctamente.');
      setFormData({ name: '', message: '', rating: 5 });
      loadTestimonials(); // Reload testimonials
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      setSubmitMessage('Error al enviar el testimonio. Por favor, intenta nuevamente.');
    }
    setIsSubmitting(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-5 w-5 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <section id="testimonios" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Lo que Dicen Nuestros Clientes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            La satisfacción de nuestros clientes es nuestra mejor carta de presentación.
            Lee lo que tienen que decir sobre nuestros servicios.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <div className="flex">{renderStars(testimonial.rating)}</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed italic">"{testimonial.message}"</p>
            </div>
          ))}
        </div>

        {/* Testimonial form */}
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Comparte tu Experiencia
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tu Nombre
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Ingresa tu nombre"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Tu Experiencia
              </label>
              <textarea
                id="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Cuéntanos sobre tu experiencia con nuestros servicios..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= formData.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <button className="bg-customGold text-black font-semibold py-3 px-20 rounded-lg text-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
            type="submit"
            disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Enviando...'
              ) : (
                <>
                  Enviar Testimonio
                  <Send className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {submitMessage && (
            <div className={`mt-4 p-4 rounded-lg ${
              submitMessage.includes('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {submitMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;