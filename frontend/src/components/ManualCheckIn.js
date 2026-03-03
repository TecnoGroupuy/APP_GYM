import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserPlus, CheckCircle, Phone,
  CreditCard, Clock, AlertCircle, X
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const normalizeUser = (user) => ({
  id: user?._id || user?.id,
  name: user?.name || 'Sin nombre',
  phone: user?.phone || '-',
  email: user?.email || '',
  plan: user?.plan || '8pases',
  classesLeft: Number(user?.classesLeft ?? 0),
  status: user?.status || 'active'
});

const formatPlan = (plan) => {
  if (plan === '12pases') return '12 Pases';
  if (plan === 'libre') return 'Pase Libre';
  return '8 Pases';
};

const ManualCheckIn = ({ classData, onClose, onSuccess }) => {
  const [step, setStep] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    plan: '8pases'
  });
  const [idCardShown, setIdCardShown] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState(false);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('bootcamp_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  }, []);

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Error de servidor');
    return data;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 3) return;
    try {
      setError('');
      setIsLoading(true);
      const users = await apiRequest(`/attendance/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults((Array.isArray(users) ? users : []).map(normalizeUser));
    } catch (err) {
      setError(err.message || 'No se pudo buscar');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (status = 'present') => {
    try {
      setError('');
      setIsLoading(true);

      const payload = selectedUser
        ? {
            userId: selectedUser.id,
            classId: classData.id,
            checkInMethod: 'manual_reception',
            status,
            idCardShown,
            phoneConfirmation
          }
        : {
            newUserData: {
              name: newUserForm.name,
              phone: newUserForm.phone,
              email: newUserForm.email,
              plan: newUserForm.plan
            },
            classId: classData.id,
            checkInMethod: 'manual_reception',
            status,
            idCardShown,
            phoneConfirmation
          };

      const result = await apiRequest('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result?.isNewUser && result?.tempPassword) {
        alert(`Usuario temporal creado. Password temporal: ${result.tempPassword}`);
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'No se pudo registrar asistencia');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-bootcamp-gray w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black uppercase">Asistencia Manual</h3>
            <p className="text-sm text-gray-400">{classData.name} • {classData.time}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>}

          <AnimatePresence mode="wait">
            {step === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nombre, telefono o email..."
                    className="w-full input-bootcamp pl-12 pr-4 py-4 text-white focus:border-bootcamp-orange focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || searchQuery.length < 3}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-bootcamp-orange text-sm font-bold uppercase disabled:opacity-50"
                  >
                    {isLoading ? '...' : 'Buscar'}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-gray-400">Resultados:</p>
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setStep('confirm');
                        }}
                        className="w-full p-4 bg-bootcamp-black border border-white/5 hover:border-bootcamp-orange/50 transition-colors flex items-center justify-between group"
                      >
                        <div className="text-left">
                          <div className="font-bold group-hover:text-bootcamp-orange transition-colors">{user.name}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-bootcamp-orange uppercase">{formatPlan(user.plan)}</div>
                          <div className="text-xs text-gray-500">{user.classesLeft} pases</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => setStep('new-user')}
                    className="w-full p-4 border-2 border-dashed border-white/20 hover:border-bootcamp-orange hover:text-bootcamp-orange transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span className="font-bold uppercase">Registrar nuevo usuario</span>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && selectedUser && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-bootcamp-black p-6 border-l-4 border-bootcamp-orange">
                  <h4 className="font-bold text-lg">{selectedUser.name}</h4>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-400">Telefono:</span>
                      <p>{selectedUser.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Plan:</span>
                      <p className="text-bootcamp-orange">{formatPlan(selectedUser.plan)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Pases restantes:</span>
                      <p className={selectedUser.classesLeft < 3 ? 'text-red-400 font-bold' : ''}>{selectedUser.classesLeft}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Estado:</span>
                      <p className="text-green-400">{selectedUser.status}</p>
                    </div>
                  </div>
                </div>

                {selectedUser.plan !== 'libre' && selectedUser.classesLeft <= 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">Este usuario no tiene pases disponibles.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 bg-bootcamp-black text-sm">
                    <input type="checkbox" checked={idCardShown} onChange={(e) => setIdCardShown(e.target.checked)} className="w-4 h-4 accent-bootcamp-orange" />
                    <CreditCard className="w-4 h-4" />
                    Mostro documento de identidad
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-bootcamp-black text-sm">
                    <input type="checkbox" checked={phoneConfirmation} onChange={(e) => setPhoneConfirmation(e.target.checked)} className="w-4 h-4 accent-bootcamp-orange" />
                    <Phone className="w-4 h-4" />
                    Confirmo telefono
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCheckIn('present')}
                    disabled={isLoading || (selectedUser.plan !== 'libre' && selectedUser.classesLeft <= 0)}
                    className="py-4 bg-green-500/20 border border-green-500 text-green-400 font-bold uppercase hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Presente
                  </button>
                  <button
                    onClick={() => handleCheckIn('late')}
                    disabled={isLoading || (selectedUser.plan !== 'libre' && selectedUser.classesLeft <= 0)}
                    className="py-4 bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-bold uppercase hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Llego tarde
                  </button>
                </div>

                <button
                  onClick={() => setStep('search')}
                  className="w-full py-3 border border-white/20 text-sm uppercase hover:border-white transition-colors"
                >
                  Volver a busqueda
                </button>
              </motion.div>
            )}

            {step === 'new-user' && (
              <motion.div
                key="new-user"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3 text-yellow-400">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">Se creara un usuario temporal.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Nombre completo *</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
                    placeholder="Ej: Maria Gonzalez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Telefono *</label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
                    placeholder="099 123 456"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Email (opcional)</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
                    placeholder="mail@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Plan inicial</label>
                  <select
                    value={newUserForm.plan}
                    onChange={(e) => setNewUserForm({ ...newUserForm, plan: e.target.value })}
                    className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
                  >
                    <option value="8pases">8 Pases</option>
                    <option value="12pases">12 Pases</option>
                    <option value="libre">Pase Libre</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 p-3 bg-bootcamp-black text-sm">
                  <input type="checkbox" checked={idCardShown} onChange={(e) => setIdCardShown(e.target.checked)} className="w-4 h-4 accent-bootcamp-orange" />
                  <CreditCard className="w-4 h-4" />
                  Mostro documento de identidad
                </label>

                <button
                  onClick={() => handleCheckIn('present')}
                  disabled={!newUserForm.name || !newUserForm.phone || isLoading}
                  className="w-full btn-bootcamp disabled:opacity-50"
                >
                  {isLoading ? 'Creando...' : 'Crear usuario y registrar asistencia'}
                </button>

                <button
                  onClick={() => setStep('search')}
                  className="w-full py-3 border border-white/20 text-sm uppercase hover:border-white transition-colors"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ManualCheckIn;

