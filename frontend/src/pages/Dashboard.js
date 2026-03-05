import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Calendar, TrendingUp, User, LogOut, 
  Clock, MapPin, ChevronRight, CheckCircle, XCircle,
  Flame, Target, Award, CreditCard, MessageSquare,
  Settings, Bell, Menu, X, ChevronLeft, ChevronDown,
  Plus, Minus, Play, Pause, RotateCcw, Save, Zap,
  Instagram, Phone, Mail, Home, BookOpen, Activity,
  Utensils, Camera, Edit3, Lock, HelpCircle, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import BrandLogo from '../components/BrandLogo';
import { API_BASE_URL } from '../utils/apiBase';

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedAction, setSelectedAction] = useState('book');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...user });
  const [availableClasses, setAvailableClasses] = useState([]);
  const [classesLeft, setClassesLeft] = useState(user?.classesLeft ?? 0);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [routinesData, setRoutinesData] = useState([]);
  const [progressChart, setProgressChart] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [nutritionData, setNutritionData] = useState(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState('');
  const [nutritionRequesting, setNutritionRequesting] = useState(false);
  const [nutritionMessage, setNutritionMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    setEditForm({ ...user });
    setClassesLeft(user?.classesLeft ?? 0);
  }, [user]);

  const apiRequest = async (path, options = {}) => {
    const token = localStorage.getItem('bootcamp_token');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'Error de servidor');
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  };

  const apiRequestWithFallback = async (paths, options = {}) => {
    let lastError;
    for (const path of paths) {
      try {
        return await apiRequest(path, options);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Error de servidor');
  };

  const loadAvailableClasses = async () => {
    try {
      setClassesLoading(true);
      setClassesError('');
      const data = await apiRequestWithFallback([
        '/classes/available',
        '/user/classes/available'
      ]);
      setAvailableClasses(Array.isArray(data.classes) ? data.classes : []);
      if (data.summary?.classesLeft !== undefined) {
        setClassesLeft(data.summary.classesLeft);
      }
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('no autorizado')) {
        setClassesError('Usuario no autorizado para reservar. Verifica en admin que el alumno tenga acceso activo.');
      } else {
        setClassesError(error.message || 'No se pudieron cargar las clases');
      }
    } finally {
      setClassesLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const data = await apiRequest('/user/dashboard');
      setDashboardData(data);
      if (data?.user) updateUser(data.user);
    } catch (_error) {
      // no bloquea UI
    }
  };

  const loadRoutines = async () => {
    try {
      const data = await apiRequest('/user/routines');
      setRoutinesData(Array.isArray(data.routines) ? data.routines : []);
    } catch (_error) {
      setRoutinesData([]);
    }
  };

  const loadProgress = async () => {
    try {
      const data = await apiRequest('/user/progress');
      setProgressChart(Array.isArray(data.chart) ? data.chart : []);
    } catch (_error) {
      setProgressChart([]);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await apiRequest('/user/payments');
      setPaymentsData(Array.isArray(data.payments) ? data.payments : []);
    } catch (_error) {
      setPaymentsData([]);
    }
  };

  const loadNutrition = async () => {
    try {
      setNutritionLoading(true);
      setNutritionError('');
      const data = await apiRequest('/user/nutrition');
      setNutritionData(data);
    } catch (error) {
      setNutritionError(error.message || 'No se pudo cargar el plan nutricional');
      setNutritionData(null);
    } finally {
      setNutritionLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadRoutines();
    loadProgress();
    loadPayments();
    loadNutrition();
  }, []);

  useEffect(() => {
    if (activeTab === 'classes') {
      loadAvailableClasses();
    }
    if (activeTab === 'nutrition') {
      loadNutrition();
    }
  }, [activeTab]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBookClass = async (classId) => {
    try {
      setClassesError('');
      setSelectedAction('book');
      setSelectedClass(classId);
      await apiRequestWithFallback([
        `/classes/${classId}/book`,
        `/user/classes/${classId}/book`
      ], { method: 'POST' });

      setBookingSuccess(true);
      await loadAvailableClasses();

      const me = await apiRequest('/auth/me');
      if (me?.user) {
        updateUser(me.user);
      }

      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedClass(null);
      }, 1800);
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('no autorizado')) {
        setClassesError('No autorizado para reservar. Solicita activacion de acceso en admin.');
      } else {
        setClassesError(error.message || 'No se pudo reservar la clase');
      }
      setSelectedClass(null);
      setBookingSuccess(false);
    }
  };

  const handleCancelBooking = async (classId) => {
    try {
      setClassesError('');
      setSelectedAction('cancel');
      setSelectedClass(classId);
      await apiRequestWithFallback([
        `/classes/${classId}/book`,
        `/user/classes/${classId}/book`
      ], { method: 'DELETE' });

      setBookingSuccess(true);
      await loadAvailableClasses();

      const me = await apiRequest('/auth/me');
      if (me?.user) {
        updateUser(me.user);
      }

      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedClass(null);
      }, 1800);
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('no autorizado')) {
        setClassesError('No autorizado para cancelar. Solicita activacion de acceso en admin.');
      } else {
        setClassesError(error.message || 'No se pudo cancelar la reserva');
      }
      setSelectedClass(null);
      setBookingSuccess(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      const payload = {
        name: editForm.name,
        phone: editForm.phone,
        stats: editForm.stats,
        goals: editForm.goals || []
      };
      const data = await apiRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (data?.user) updateUser(data.user);
      setShowProfileEdit(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRequestNutritionPlan = async () => {
    try {
      setNutritionRequesting(true);
      setNutritionError('');
      setNutritionMessage('');
      const data = await apiRequest('/user/nutrition/request', { method: 'POST' });
      setNutritionMessage(data?.message || 'Solicitud enviada');
      await loadNutrition();
    } catch (error) {
      setNutritionError(error.message || 'No se pudo solicitar el plan nutricional');
    } finally {
      setNutritionRequesting(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: Home },
    { id: 'classes', label: 'Clases', icon: Calendar },
    { id: 'routines', label: 'Rutinas', icon: Dumbbell },
    { id: 'progress', label: 'Progreso', icon: TrendingUp },
    { id: 'nutrition', label: 'Nutrición', icon: Utensils },
    { id: 'billing', label: 'Pagos', icon: CreditCard },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return <OverviewTab user={user} nextClass={dashboardData?.nextClass} onTabChange={setActiveTab} />;
      case 'classes':
        return (
          <ClassesTab
            classesData={availableClasses}
            classesLeft={classesLeft}
            loading={classesLoading}
            error={classesError}
            onBook={handleBookClass}
            onCancel={handleCancelBooking}
            selectedAction={selectedAction}
            bookingSuccess={bookingSuccess}
            selectedClass={selectedClass}
          />
        );
      case 'routines':
        return <RoutinesTab 
          routinesData={routinesData}
          activeRoutine={activeRoutine} 
          setActiveRoutine={setActiveRoutine}
          timer={timer}
          setTimer={setTimer}
          isTimerRunning={isTimerRunning}
          setIsTimerRunning={setIsTimerRunning}
          formatTime={formatTime}
        />;
      case 'progress':
        return <ProgressTab data={progressChart} />;
      case 'nutrition':
        return (
          <NutritionTab
            data={nutritionData}
            loading={nutritionLoading}
            error={nutritionError}
            message={nutritionMessage}
            requesting={nutritionRequesting}
            onRequestPlan={handleRequestNutritionPlan}
          />
        );
      case 'billing':
        return <BillingTab user={user} payments={paymentsData} nextPayment={dashboardData?.user?.planExpires} />;
      case 'profile':
        return <ProfileTab 
          user={user} 
          showProfileEdit={showProfileEdit}
          setShowProfileEdit={setShowProfileEdit}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSaveProfile}
          saving={profileSaving}
        />;
      default:
        return <OverviewTab user={user} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-bootcamp-black flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 bg-bootcamp-gray border-r border-white/5 flex-col">
        <div className="p-6 border-b border-white/5">
          <BrandLogo size="sm" />
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bootcamp-orange/20 rounded flex items-center justify-center">
              <User className="w-6 h-6 text-bootcamp-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{user?.name}</p>
              <p className="text-xs text-bootcamp-orange uppercase">{user?.plan}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                activeTab === item.id 
                  ? 'bg-bootcamp-orange text-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="glass border-b border-white/5 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 lg:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-10 h-10 flex items-center justify-center"
              >
                <Menu className="w-6 h-6" />
              </button>
              <BrandLogo size="sm" />
            </div>

            <div className="hidden lg:block">
              <h1 className="text-2xl font-bold uppercase">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-bootcamp-orange rounded" />
              </button>
              <div className="w-10 h-10 bg-bootcamp-orange/20 rounded flex items-center justify-center lg:hidden">
                <User className="w-5 h-5 text-bootcamp-orange" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-bootcamp-gray z-50 lg:hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-white/5">
                <span className="font-black uppercase">Menú</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                      activeTab === item.id 
                        ? 'bg-bootcamp-orange text-white' 
                        : 'text-gray-400'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-components
const OverviewTab = ({ user, nextClass, onTabChange }) => (
  <div className="space-y-6">
    {/* Welcome */}
    <div className="card-bootcamp p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase mb-2">
            ¡Hola, <span className="text-bootcamp-orange">{user?.name?.split(' ')[0]}</span>!
          </h2>
          <p className="text-gray-400">Acá está tu resumen de hoy</p>
        </div>
        <div className="flex items-center gap-2 bg-bootcamp-orange/10 px-4 py-2 border border-bootcamp-orange/20">
          <Flame className="w-5 h-5 text-bootcamp-orange" />
          <span className="font-bold">Racha: {user?.progress?.streak} días</span>
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Clases este mes', value: user?.progress?.workoutsThisMonth, icon: Calendar, color: 'text-blue-400' },
        { label: 'Total entrenos', value: user?.progress?.totalWorkouts, icon: Dumbbell, color: 'text-green-400' },
        { label: 'Peso actual', value: `${user?.stats?.weight}kg`, icon: Activity, color: 'text-yellow-400' },
        { label: '% Grasa', value: `${user?.stats?.bodyFat}%`, icon: Target, color: 'text-blue-400' },
      ].map((stat, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="card-bootcamp p-4 lg:p-6"
        >
          <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
          <div className="text-2xl lg:text-3xl font-black">{stat.value}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>

    {/* Next Class & Quick Actions */}
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-bootcamp p-6">
        <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-bootcamp-orange" />
          Próxima Clase
        </h3>
        {nextClass ? (
          <div className="bg-bootcamp-black p-4 border-l-4 border-bootcamp-orange">
            <div className="text-lg font-bold">{nextClass.name || 'Clase reservada'}</div>
            <div className="text-bootcamp-orange">{nextClass.day} {nextClass.time}</div>
            <div className="text-sm text-gray-400 mt-1">Entrenador: {nextClass.trainer || '-'}</div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            No tenés clases reservadas
          </div>
        )}
        <button 
          onClick={() => onTabChange('classes')}
          className="w-full mt-4 py-3 border border-white/10 text-sm font-bold uppercase hover:border-bootcamp-orange hover:text-bootcamp-orange transition-colors"
        >
          Reservar Clase
        </button>
      </div>

      <div className="card-bootcamp p-6">
        <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-bootcamp-orange" />
          Accesos Rápidos
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Ver mi rutina de hoy', tab: 'routines' },
            { label: 'Registrar progreso', tab: 'progress' },
            { label: 'Ver plan nutricional', tab: 'nutrition' },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={() => onTabChange(action.tab)}
              className="w-full flex items-center justify-between p-3 bg-bootcamp-black hover:bg-bootcamp-orange/10 transition-colors group"
            >
              <span className="text-sm">{action.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-bootcamp-orange" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ClassesTab = ({ classesData, classesLeft, loading, error, onBook, onCancel, selectedAction, bookingSuccess, selectedClass }) => {
  const days = Array.from(new Set((classesData || []).map((c) => c.day))).filter(Boolean);
  const [selectedDay, setSelectedDay] = useState(days[0] || "Lunes");

  useEffect(() => {
    if (days.length === 0) return;
    if (!days.includes(selectedDay)) {
      setSelectedDay(days[0]);
    }
  }, [days, selectedDay]);

  const filteredClasses = (classesData || []).filter((c) => c.day === selectedDay);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h2 className="text-2xl font-black uppercase">Reservar Clase</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>
            {classesLeft === "Ilimitadas" ? "Clases ilimitadas disponibles" : `${classesLeft} clases disponibles este mes`}
          </span>
        </div>
      </div>

      {error ? <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div> : null}
      {loading ? <div className="card-bootcamp p-6 text-center text-gray-400">Cargando clases...</div> : null}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-3 font-bold uppercase text-sm whitespace-nowrap transition-all ${
              selectedDay === day
                ? "bg-bootcamp-orange text-white"
                : "bg-bootcamp-gray text-gray-400 hover:text-white"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {!loading && filteredClasses.length === 0 ? (
          <div className="card-bootcamp p-6 text-center text-gray-400">No hay clases disponibles para este dia.</div>
        ) : null}

        {filteredClasses.map((cls, idx) => (
          <motion.div
            key={cls.id || cls._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="card-bootcamp p-4 lg:p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-bootcamp-orange/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-8 h-8 text-bootcamp-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{cls.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {cls.time}
                    </span>
                    <span>•</span>
                    <span>{cls.duration || "45 min"}</span>
                    <span>•</span>
                    <span>Prof: {cls.trainer}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-[200px] h-2 bg-bootcamp-black rounded overflow-hidden">
                      <div
                        className="h-full bg-bootcamp-orange"
                        style={{ width: `${(cls.booked / cls.spots) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{cls.booked}/{cls.spots} cupos</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => (cls.isBooked ? onCancel(cls.id || cls._id) : onBook(cls.id || cls._id))}
                disabled={(cls.isFull && !cls.isBooked) || selectedClass === (cls.id || cls._id)}
                className={`px-6 py-3 font-bold uppercase text-sm transition-all ${
                  cls.isFull && !cls.isBooked
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : cls.isBooked
                    ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    : selectedClass === (cls.id || cls._id) && bookingSuccess
                    ? "bg-green-500 text-white"
                    : "bg-bootcamp-orange text-white hover:bg-bootcamp-orange-light"
                }`}
              >
                {selectedClass === (cls.id || cls._id) && bookingSuccess && selectedAction === "cancel"
                  ? "Cancelada"
                  : selectedClass === (cls.id || cls._id) && bookingSuccess && selectedAction === "book"
                  ? "Reservada"
                  : cls.isFull && !cls.isBooked
                  ? "Lleno"
                  : cls.isBooked
                  ? "Cancelar"
                  : "Reservar"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const RoutinesTab = ({ routinesData, activeRoutine, setActiveRoutine, timer, setTimer, isTimerRunning, setIsTimerRunning, formatTime }) => {
  if (activeRoutine) {
    const levels = Array.isArray(activeRoutine.levels) ? activeRoutine.levels : [];
    const currentLevel = Number(activeRoutine.currentLevel || 1);
    const currentLevelData = levels.find((level) => Number(level.level) === currentLevel);
    const currentWeek = Number(activeRoutine?.progress?.currentWeek || 1);
    const totalWeeks = Number(activeRoutine?.progress?.totalWeeks || 1);
    const progressPercent = totalWeeks > 0 ? Math.min(Math.round((currentWeek / totalWeeks) * 100), 100) : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveRoutine(null)}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black uppercase">{activeRoutine.name}</h2>
        </div>

        {/* Timer */}
        <div className="card-bootcamp p-8 text-center">
          <div className="text-6xl font-black font-mono mb-6">{formatTime(timer)}</div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="w-16 h-16 bg-bootcamp-orange rounded flex items-center justify-center hover:bg-bootcamp-orange-light transition-colors"
            >
              {isTimerRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button
              onClick={() => { setTimer(0); setIsTimerRunning(false); }}
              className="w-16 h-16 bg-bootcamp-gray rounded flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {activeRoutine.isProgressive ? (
          <div className="card-bootcamp p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold uppercase">Progresion</h3>
                <p className="text-sm text-bootcamp-orange">
                  Nivel {currentLevel}
                  {currentLevelData?.name ? `: ${currentLevelData.name}` : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">{currentWeek}/{totalWeeks}</div>
                <div className="text-xs text-gray-500 uppercase">Semanas</div>
              </div>
            </div>
            <div className="h-2 bg-bootcamp-black overflow-hidden rounded">
              <div className="h-full bg-bootcamp-orange" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              {levels.map((level) => {
                const isActive = Number(level.level) === currentLevel;
                const isCompleted = Number(level.level) < currentLevel;
                return (
                  <div key={`${level.level}-${level.name}`} className={`p-3 border ${isActive ? 'border-bootcamp-orange bg-bootcamp-orange/10' : isCompleted ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-bootcamp-black'}`}>
                    <div className="text-xs uppercase text-gray-400">Nivel {level.level}</div>
                    <div className="font-bold text-sm">{level.name || `Nivel ${level.level}`}</div>
                    <div className="text-xs text-gray-400 mt-1">{level?.config?.frequency || '-'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Exercises */}
        <div className="space-y-4">
          {activeRoutine.exercises.map((exercise, idx) => (
            <div key={idx} className="card-bootcamp p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-bootcamp-orange/20 rounded flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold">{exercise.name}</div>
                  <div className="text-sm text-gray-400">
                    {exercise.sets} series × {exercise.reps} | Descanso: {exercise.rest}
                  </div>
                </div>
              </div>
              <button className="w-8 h-8 border border-white/20 rounded flex items-center justify-center hover:border-bootcamp-orange hover:text-bootcamp-orange">
                <CheckCircle className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button className="btn-bootcamp w-full">
          <Save className="w-5 h-5 inline-block mr-2" />
          Completar Rutina
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Mis Rutinas</h2>

      <div className="grid gap-4">
        {routinesData.map((routine, idx) => (
          <motion.div
            key={routine.id || routine._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-bootcamp p-6 cursor-pointer group"
            onClick={() => setActiveRoutine(routine)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg group-hover:text-bootcamp-orange transition-colors">{routine.name}</h3>
                  {routine.completed && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-bold uppercase">Completada</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-3">{routine.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" /> {routine.duration}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Dumbbell className="w-4 h-4" /> {routine.exercises.length} ejercicios
                  </span>
                  <span className="px-2 py-1 bg-bootcamp-orange/10 text-bootcamp-orange text-xs">{routine.difficulty}</span>
                  {routine.isProgressive ? (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs">
                      Nivel {routine.currentLevel || 1}/{routine.totalLevels || (Array.isArray(routine.levels) ? routine.levels.length : 1)}
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-bootcamp-orange group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
        {routinesData.length === 0 && (
          <div className="card-bootcamp p-6 text-center text-gray-400">No tienes rutinas asignadas aún.</div>
        )}
      </div>
    </div>
  );
};

const ProgressTab = ({ data }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-black uppercase">Mi Progreso</h2>

    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-bootcamp p-6">
        <h3 className="font-bold uppercase mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-bootcamp-orange" />
          Evolución de Peso
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.length ? data : []}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff6b00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                labelStyle={{ color: '#ff6b00' }}
              />
              <Area type="monotone" dataKey="weight" stroke="#ff6b00" fillOpacity={1} fill="url(#colorWeight)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-bootcamp p-6">
        <h3 className="font-bold uppercase mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-bootcamp-orange" />
          % Grasa Corporal
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.length ? data : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                labelStyle={{ color: '#ff6b00' }}
              />
              <Line type="monotone" dataKey="bodyFat" stroke="#ff6b00" strokeWidth={2} dot={{ fill: '#ff6b00' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* Progress Photos */}
    <div className="card-bootcamp p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold uppercase flex items-center gap-2">
          <Camera className="w-5 h-5 text-bootcamp-orange" />
          Fotos de Progreso
        </h3>
        <button className="text-sm text-bootcamp-orange hover:underline">+ Agregar foto</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {['Enero', 'Marzo', 'Junio'].map((month, idx) => (
          <div key={idx} className="aspect-[3/4] bg-bootcamp-black border border-white/10 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <span className="text-xs text-gray-500">{month}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NutritionTab = ({ data, loading, error, message, requesting, onRequestPlan }) => {
  const plan = data?.nutritionPlan;
  const meals = Array.isArray(plan?.meals) ? plan.meals : [];
  const hasPlan = data?.hasPlan && meals.length > 0;
  const isPending = plan?.status === 'pending';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Plan Nutricional</h2>

      {error ? <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div> : null}
      {message ? <div className="p-3 border border-green-500/30 bg-green-500/10 text-green-300">{message}</div> : null}

      {loading ? (
        <div className="card-bootcamp p-6 text-center text-gray-400">Cargando plan nutricional...</div>
      ) : (
        <div className="card-bootcamp p-8 text-center">
          <Utensils className="w-16 h-16 text-bootcamp-orange mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Plan Personalizado</h3>
          {hasPlan ? (
            <div className="space-y-2 text-sm text-gray-300">
              {plan.goal ? <p>Objetivo: <span className="text-white font-medium">{plan.goal}</span></p> : null}
              {plan.dailyCalories ? <p>Calorias diarias: <span className="text-white font-medium">{plan.dailyCalories} kcal</span></p> : null}
              {plan.notes ? <p className="text-gray-400">{plan.notes}</p> : null}
            </div>
          ) : (
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Tu entrenador te asignara un plan nutricional adaptado a tus objetivos.
            </p>
          )}
          {!hasPlan ? (
            <button
              className="btn-bootcamp"
              onClick={onRequestPlan}
              disabled={requesting || isPending}
            >
              {isPending ? 'Solicitud pendiente' : requesting ? 'Enviando...' : 'Solicitar Plan Nutricional'}
            </button>
          ) : null}
        </div>
      )}

      {hasPlan ? (
        <div className="grid md:grid-cols-3 gap-4">
          {meals.map((meal, idx) => (
            <div key={`${meal.title || 'meal'}-${idx}`} className="card-bootcamp p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{meal.title || `Comida ${idx + 1}`}</span>
                <span className="text-xs text-bootcamp-orange">{meal.time || '-'}</span>
              </div>
              <div className="text-sm text-gray-400">{meal.calories ? `${meal.calories} kcal` : '-'}</div>
              {meal.description ? <p className="text-sm text-gray-400 mt-2">{meal.description}</p> : null}
              {Array.isArray(meal.items) && meal.items.length > 0 ? (
                <ul className="mt-2 text-sm text-gray-300 space-y-1">
                  {meal.items.map((item, itemIdx) => (
                    <li key={`${item}-${itemIdx}`}>- {item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BillingTab = ({ user, payments, nextPayment }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-black uppercase">Pagos y Facturación</h2>

    <div className="card-bootcamp p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg">Plan Actual</h3>
          <p className="text-3xl font-black text-bootcamp-orange">{user?.plan}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Próximo pago</div>
          <div className="font-bold">{nextPayment ? new Date(nextPayment).toLocaleDateString() : '-'}</div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 py-3 bg-bootcamp-orange font-bold uppercase hover:bg-bootcamp-orange-light transition-colors">
          Pagar Ahora
        </button>
        <button className="flex-1 py-3 border border-white/20 font-bold uppercase hover:border-bootcamp-orange hover:text-bootcamp-orange transition-colors">
          Cambiar Plan
        </button>
      </div>
    </div>

    <div className="card-bootcamp p-6">
      <h3 className="font-bold uppercase mb-4">Historial de Pagos</h3>
      <div className="space-y-3">
        {(payments || []).map((payment, idx) => (
          <div key={payment._id || idx} className="flex items-center justify-between p-3 bg-bootcamp-black">
            <div>
              <div className="font-medium">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}</div>
              <div className="text-xs text-gray-500">{payment.method}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">${payment.amount}</div>
              <div className={`text-xs ${payment.status === 'paid' ? 'text-green-500' : payment.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>{payment.status}</div>
            </div>
          </div>
        ))}
        {(payments || []).length === 0 && <div className="text-gray-400 text-sm">No hay pagos registrados.</div>}
      </div>
    </div>
  </div>
);

const ProfileTab = ({ user, showProfileEdit, setShowProfileEdit, editForm, setEditForm, onSave, saving }) => {
  if (showProfileEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowProfileEdit(false)}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black uppercase">Editar Perfil</h2>
        </div>

        <div className="card-bootcamp p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Nombre</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Peso (kg)</label>
              <input
                type="number"
                value={editForm.stats?.weight}
                onChange={(e) => setEditForm({...editForm, stats: {...editForm.stats, weight: e.target.value}})}
                className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-gray-400">Altura (cm)</label>
              <input
                type="number"
                value={editForm.stats?.height}
                onChange={(e) => setEditForm({...editForm, stats: {...editForm.stats, height: e.target.value}})}
                className="w-full input-bootcamp px-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="btn-bootcamp w-full"
          >
            <Save className="w-5 h-5 inline-block mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase">Mi Perfil</h2>

      <div className="card-bootcamp p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-bootcamp-orange/20 rounded flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-bootcamp-orange" />
          </div>
          <h3 className="text-2xl font-bold">{user?.name}</h3>
          <p className="text-bootcamp-orange">{user?.plan}</p>
          <p className="text-sm text-gray-500 mt-1">Alumno desde {user?.memberSince}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center p-4 bg-bootcamp-black">
            <div className="text-2xl font-black text-bootcamp-orange">{user?.stats?.weight}kg</div>
            <div className="text-xs text-gray-500 uppercase">Peso</div>
          </div>
          <div className="text-center p-4 bg-bootcamp-black">
            <div className="text-2xl font-black text-bootcamp-orange">{user?.stats?.height}cm</div>
            <div className="text-xs text-gray-500 uppercase">Altura</div>
          </div>
          <div className="text-center p-4 bg-bootcamp-black">
            <div className="text-2xl font-black text-bootcamp-orange">{user?.stats?.bodyFat}%</div>
            <div className="text-xs text-gray-500 uppercase">% Grasa</div>
          </div>
          <div className="text-center p-4 bg-bootcamp-black">
            <div className="text-2xl font-black text-bootcamp-orange">{user?.progress?.totalWorkouts}</div>
            <div className="text-xs text-gray-500 uppercase">Entrenos</div>
          </div>
        </div>

        <button 
          onClick={() => setShowProfileEdit(true)}
          className="w-full py-3 border border-white/20 font-bold uppercase hover:border-bootcamp-orange hover:text-bootcamp-orange transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Editar Perfil
        </button>
      </div>

      <div className="grid gap-4">
        {[
          { icon: Lock, label: 'Cambiar Contraseña', action: () => {} },
          { icon: CreditCard, label: 'Métodos de Pago', action: () => {} },
          { icon: HelpCircle, label: 'Ayuda y Soporte', action: () => {} },
          { icon: FileText, label: 'Términos y Condiciones', action: () => {} },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            className="card-bootcamp p-4 flex items-center justify-between hover:border-bootcamp-orange/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-bootcamp-orange" />
              <span>{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;


