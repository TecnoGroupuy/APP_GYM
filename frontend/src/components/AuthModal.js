import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { login, register } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep(1);
      setError('');
      setSuccess(false);
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    weight: '',
    height: '',
    goals: [],
    plan: '8pases'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) 
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setStep(1);
        setMode('login');
      }, 1200);
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      weight: '',
      height: '',
      goals: [],
      plan: '8pases'
    });
    setStep(1);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-bootcamp-gray border border-bootcamp-orange/20 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-bootcamp-orange" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-bootcamp-orange" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-bootcamp-orange" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-bootcamp-orange" />

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center hover:bg-bootcamp-orange/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <BrandLogo size="sm" />
            </div>

            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 text-bootcamp-orange mx-auto mb-4" />
                <h3 className="text-2xl font-bold uppercase mb-2">
                  {mode === 'login' ? '¡Bienvenido!' : '¡Registro Exitoso!'}
                </h3>
                <p className="text-gray-400">
                  {mode === 'login' ? 'Redirigiendo a tu dashboard...' : 'Tu cuenta ha sido creada'}
                </p>
              </motion.div>
            ) : mode === 'login' ? (
              <>
                <h2 className="text-3xl font-black uppercase text-center mb-2">Acceder</h2>
                <p className="text-gray-400 text-center mb-8 text-sm">Ingresá a tu cuenta de Boot Camp</p>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Email o documento</label>
                    <input
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                      placeholder="tu@email.com o cedula"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Contraseña</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors pr-12"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-bootcamp w-full disabled:opacity-50"
                  >
                    {isLoading ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    ¿No tenés cuenta?{' '}
                    <button 
                      onClick={() => { setMode('register'); resetForm(); }}
                      className="text-bootcamp-orange font-bold hover:underline"
                    >
                      Registrate
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-6">
                  {step > 1 && (
                    <button 
                      onClick={() => setStep(step - 1)}
                      className="text-gray-400 hover:text-white"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-black uppercase">Crear Cuenta</h2>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3].map(i => (
                        <div 
                          key={i}
                          className={`h-1 flex-1 ${i <= step ? 'bg-bootcamp-orange' : 'bg-white/10'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={step === 3 ? handleRegister : (e) => { e.preventDefault(); setStep(step + 1); }}>
                  {step === 1 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Nombre Completo</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                          placeholder="Tu nombre"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Teléfono</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                          placeholder="099 123 456"
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Peso (kg)</label>
                          <input
                            type="number"
                            name="weight"
                            value={formData.weight}
                            onChange={handleChange}
                            className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                            placeholder="70"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Altura (cm)</label>
                          <input
                            type="number"
                            name="height"
                            value={formData.height}
                            onChange={handleChange}
                            className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                            placeholder="170"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-4 text-gray-400">Objetivos</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Perder peso', 'Ganar músculo', 'Resistencia', 'Tonificar', 'Salud', 'Competir'].map(goal => (
                            <button
                              key={goal}
                              type="button"
                              onClick={() => handleGoalToggle(goal)}
                              className={`p-3 text-sm border transition-all ${
                                formData.goals.includes(goal)
                                  ? 'border-bootcamp-orange bg-bootcamp-orange/20 text-white'
                                  : 'border-white/10 text-gray-400 hover:border-white/30'
                              }`}
                            >
                              {goal}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-4 text-gray-400">Seleccioná tu Plan</label>
                        <div className="space-y-3">
                          {[
                            { id: '8pases', name: '8 PASES', price: '$1300', desc: '2 veces por semana' },
                            { id: '12pases', name: '12 PASES', price: '$1600', desc: '3 veces por semana' },
                            { id: 'libre', name: 'PASE LIBRE', price: '$1900', desc: 'Todos los días' }
                          ].map(plan => (
                            <label
                              key={plan.id}
                              className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${
                                formData.plan === plan.id
                                  ? 'border-bootcamp-orange bg-bootcamp-orange/10'
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="plan"
                                  value={plan.id}
                                  checked={formData.plan === plan.id}
                                  onChange={handleChange}
                                  className="w-4 h-4 accent-bootcamp-orange"
                                />
                                <div>
                                  <div className="font-bold">{plan.name}</div>
                                  <div className="text-xs text-gray-400">{plan.desc}</div>
                                </div>
                              </div>
                              <div className="text-bootcamp-orange font-bold">{plan.price}</div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Contraseña</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Confirmar Contraseña</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none transition-colors"
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    className="btn-bootcamp w-full mt-6"
                  >
                    {step === 3 ? 'Crear Cuenta' : 'Continuar'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    ¿Ya tenés cuenta?{' '}
                    <button 
                      onClick={() => { setMode('login'); resetForm(); }}
                      className="text-bootcamp-orange font-bold hover:underline"
                    >
                      Iniciá sesión
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
