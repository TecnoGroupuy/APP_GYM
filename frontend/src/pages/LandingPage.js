import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  Instagram,
  MessageCircle,
  MapPin,
  Menu,
  Phone,
  Star,
  Users,
  X
} from 'lucide-react';
import { plans as fallbackPlans, testimonials } from '../data/mockData';
import BrandLogo from '../components/BrandLogo';

const defaultSchedule = [
  { day: 'Lunes', hours: '07:00 - 12:00 | 17:00 - 21:00' },
  { day: 'Martes', hours: '07:00 - 12:00 | 17:00 - 21:00' },
  { day: 'Miercoles', hours: '07:00 - 12:00 | 17:00 - 21:00' },
  { day: 'Jueves', hours: '07:00 - 12:00 | 17:00 - 21:00' },
  { day: 'Viernes', hours: '07:00 - 12:00 | 17:00 - 21:00' }
];

const LandingPage = ({ onLoginClick, onRegisterClick }) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [logoUrl, setLogoUrl] = useState('');
  const [sitePlans, setSitePlans] = useState(fallbackPlans);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [announcements, setAnnouncements] = useState([]);
  const [landingDataReady, setLandingDataReady] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadLandingData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/landing-data`);
        const data = await response.json();
        if (!response.ok) return;

        if (Array.isArray(data.plans) && data.plans.length > 0) setSitePlans(data.plans);
        if (Array.isArray(data.schedule) && data.schedule.length > 0) setSchedule(data.schedule);
        if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
        setLogoUrl(data.logoUrl || '');
      } catch (_error) {
        // fallback a datos locales
      } finally {
        setLandingDataReady(true);
      }
    };

    loadLandingData();
  }, [API_BASE_URL]);

  const heroStats = useMemo(
    () => [
      { label: 'Minutos', value: "45'" },
      { label: 'Funcional', value: '100%' },
      { label: 'Soporte', value: '24/7' }
    ],
    []
  );

  const heroAnnouncement = useMemo(
    () => announcements.find((a) => a.sector === 'hero-right' && a.active && a.imageUrl),
    [announcements]
  );

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-bootcamp-black overflow-x-hidden">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrollY > 50 ? 'glass py-2 md:py-3' : 'bg-transparent py-2 md:py-6'}`}>
        <div className="max-w-7xl mx-auto px-[0.5cm] md:px-6 lg:px-8 grid grid-cols-[2.5rem_1fr_2.5rem] items-center md:flex md:items-center md:justify-between">
          <div className="col-start-2 justify-self-center md:col-auto md:justify-self-auto flex items-center -mt-1 md:mt-0">
            <BrandLogo
              size="lg"
              logoUrl={logoUrl}
              boxClassName="h-[8.6rem] min-w-[300px] max-w-[420px] md:h-32 md:min-w-[320px] md:max-w-[460px]"
              imgClassName="object-center scale-[1.46] md:scale-[1.2]"
            />
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['inicio', 'horarios', 'planes', 'testimonios', 'contacto'].map((item) => (
              <button key={item} onClick={() => scrollToSection(item)} className="text-sm font-semibold uppercase tracking-wider hover:text-bootcamp-orange transition-colors">
                {item}
              </button>
            ))}
            <button onClick={onLoginClick} className="btn-bootcamp text-sm py-2 px-6">Acceder</button>
          </div>

          <button className="col-start-3 justify-self-end md:hidden text-white" onClick={() => setIsMenuOpen((v) => !v)}>
            {isMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden glass border-t border-bootcamp-orange/20">
              <div className="px-4 py-6 space-y-4">
                {['inicio', 'horarios', 'planes', 'testimonios', 'contacto'].map((item) => (
                  <button key={item} onClick={() => scrollToSection(item)} className="block w-full text-left text-lg font-semibold uppercase py-2 hover:text-bootcamp-orange">
                    {item}
                  </button>
                ))}
                <button onClick={() => { onLoginClick(); setIsMenuOpen(false); }} className="btn-bootcamp w-full text-center mt-4">Acceder</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-bootcamp-black via-transparent to-bootcamp-black" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-bootcamp-orange/10 border border-bootcamp-orange/30 px-4 py-2 mb-6">
              <Flame className="w-4 h-4 text-bootcamp-orange" />
              <span className="text-sm font-bold uppercase tracking-wider text-bootcamp-orange">Entrenamiento Funcional</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-none mb-6">
              <span className="block">TRANSFORMA</span>
              <span className="block text-stroke">TU ENERGIA</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-xl">
              Entrenamientos funcionales para fuerza, movilidad y resistencia real. Comunidad, seguimiento y resultados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onRegisterClick} className="btn-bootcamp text-lg">
                Comenzar Ahora <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
              <button onClick={() => scrollToSection('planes')} className="px-8 py-4 border-2 border-white/20 font-bold uppercase tracking-wider hover:border-bootcamp-orange hover:text-bootcamp-orange transition-all">
                Ver Planes
              </button>
            </div>
            <div className="flex gap-8 mt-12">
              {heroStats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-black text-bootcamp-orange">{s.value}</div>
                  <div className="text-sm text-gray-500 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block card-bootcamp p-0 overflow-hidden min-h-[260px]">
            {!landingDataReady ? (
              <div className="w-full h-full bg-bootcamp-gray/40" />
            ) : heroAnnouncement ? (
              <a
                href={heroAnnouncement.linkUrl || '#'}
                target={heroAnnouncement.linkUrl ? '_blank' : undefined}
                rel={heroAnnouncement.linkUrl ? 'noopener noreferrer' : undefined}
                className="block w-full h-full"
              >
                <img src={heroAnnouncement.imageUrl} alt={heroAnnouncement.title || 'Anuncio'} className="w-full h-full object-cover" />
              </a>
            ) : (
              <div className="p-8 h-full flex flex-col justify-center items-center text-center">
                <Users className="w-20 h-20 text-bootcamp-orange mx-auto mb-4" />
                <p className="text-gray-400 uppercase tracking-widest text-sm">Comunidad Boot Camp</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="horarios" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Nuestros <span className="text-bootcamp-orange">Horarios</span></h2>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {schedule.map((item) => (
              <div key={`${item.day}-${item.hours}`} className="card-bootcamp p-6 text-center">
                <div className="text-bootcamp-orange font-black text-lg uppercase mb-2">{item.day}</div>
                <div className="text-sm text-gray-300 leading-relaxed">{item.hours}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="py-24 bg-bootcamp-dark relative">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Elegi tu <span className="text-bootcamp-orange">Plan</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {sitePlans.map((plan) => (
              <div key={plan.id} className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-bootcamp-orange text-white text-xs font-bold uppercase px-4 py-1 z-10">Mas Popular</div>}
                <div className={`card-bootcamp p-8 h-full flex flex-col ${plan.popular ? 'border-bootcamp-orange/50 bg-bootcamp-gray/50' : ''}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-black uppercase mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>
                  <div className="text-center mb-8">
                    <span className="text-5xl font-black text-bootcamp-orange">${plan.price}</span>
                    <span className="text-gray-500">/mes</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {(plan.features || []).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-bootcamp-orange flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={onRegisterClick} className={`w-full py-4 font-bold uppercase tracking-wider transition-all ${plan.popular ? 'bg-bootcamp-orange text-white hover:bg-bootcamp-orange-light' : 'border-2 border-white/20 hover:border-bootcamp-orange hover:text-bootcamp-orange'}`}>
                    Elegir Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Historias de <span className="text-bootcamp-orange">Exito</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="card-bootcamp p-8">
                <p className="text-gray-300 mb-6">{testimonial.text}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-xs text-bootcamp-orange uppercase">{testimonial.result}</div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-bootcamp-orange text-bootcamp-orange" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="py-24 bg-bootcamp-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-8">Veni a <span className="text-bootcamp-orange">Entrenar</span></h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4"><MapPin className="w-6 h-6 text-bootcamp-orange" /><div><h4 className="font-bold uppercase">Ubicacion</h4><p className="text-gray-400">Av. Uruguay 1532, Montevideo</p></div></div>
              <div className="flex items-start gap-4"><Phone className="w-6 h-6 text-bootcamp-orange" /><div><h4 className="font-bold uppercase">Contacto</h4><p className="text-gray-400">095 512 990</p></div></div>
              <div className="flex items-start gap-4"><Clock className="w-6 h-6 text-bootcamp-orange" /><div><h4 className="font-bold uppercase">Horarios</h4><p className="text-gray-400">Lunes a Viernes: 07:00 - 21:00</p></div></div>
            </div>
            <div className="mt-8 flex gap-4">
              <a href="https://www.instagram.com/bootcampuy?igsh=Y3pxcWlrOWdwY3J6" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-bootcamp-gray flex items-center justify-center hover:bg-bootcamp-orange"><Instagram className="w-6 h-6" /></a>
              <a href="https://wa.me/59895512990?text=Hola%20necesito%20saber%20m%C3%A1s%20de%20bootcamp" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-bootcamp-gray flex items-center justify-center hover:bg-bootcamp-orange"><MessageCircle className="w-6 h-6" /></a>
            </div>
          </div>
          <div className="bg-bootcamp-gray p-8 border border-white/10">
            <h3 className="text-2xl font-bold uppercase mb-6">Envianos un mensaje</h3>
            <form className="space-y-4">
              <input type="text" className="w-full input-bootcamp px-4 py-3 text-white" placeholder="Tu nombre" />
              <input type="email" className="w-full input-bootcamp px-4 py-3 text-white" placeholder="tu@email.com" />
              <textarea rows="4" className="w-full input-bootcamp px-4 py-3 text-white resize-none" placeholder="En que podemos ayudarte?" />
              <button type="submit" className="btn-bootcamp w-full">Enviar Mensaje</button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-bootcamp-black border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto flex justify-center md:justify-start">
            <BrandLogo
              size="sm"
              logoUrl={logoUrl}
              boxClassName="h-32 min-w-[270px] max-w-[380px]"
              imgClassName="scale-[1.9]"
            />
          </div>
          <div className="text-gray-500 text-sm">© 2026 Boot Camp Training. Todos los derechos reservados.</div>
          <div className="flex gap-6">
            <button onClick={onLoginClick} className="text-sm text-gray-400 hover:text-bootcamp-orange">Acceder</button>
            <button onClick={onRegisterClick} className="text-sm text-gray-400 hover:text-bootcamp-orange">Registrarse</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

