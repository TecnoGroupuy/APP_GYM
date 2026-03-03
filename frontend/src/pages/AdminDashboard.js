import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  LogOut,
  Mail,
  Menu,
  Smartphone,
  Plus,
  Upload,
  FileSpreadsheet,
  Save,
  Send,
  Settings,
  Shield,
  Sparkles,
  BarChart3,
  Users,
  X,
  CheckCircle,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import AdminRoutines from './AdminRoutines';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const emptyStats = {
  monthlyRevenue: 0,
  activeMembers: 0,
  attendanceRate: 0,
  pendingPayments: 0
};

const defaultPlans = [
  { id: '8pases', name: '8 PASES', description: '2 veces por semana', price: 1300, features: [], popular: false },
  { id: '12pases', name: '12 PASES', description: '3 veces por semana', price: 1600, features: [], popular: true },
  { id: 'libre', name: 'PASE LIBRE', description: 'Todos los dias', price: 1900, features: [], popular: false }
];

const createNewPlan = () => ({
  id: `plan_${Date.now()}`,
  name: 'NUEVO PLAN',
  description: '',
  price: 0,
  features: [],
  popular: false
});

const defaultAnnouncements = [
  { id: 'hero-main', sector: 'hero-right', title: 'Comunidad Boot Camp', imageUrl: '', linkUrl: '', active: true }
];

const createNewAnnouncement = () => ({
  id: `ad_${Date.now()}`,
  sector: 'hero-right',
  title: 'Nuevo anuncio',
  imageUrl: '',
  linkUrl: '',
  active: true
});

const classDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const classDayFilters = ['Todos', ...classDays];
const excelImportSheetOrder = ['clientes', 'asistencia', 'movimientos'];
const excelImportLoadingTexts = ['Importando clientes...', 'Procesando datos...', 'Creando usuarios...', 'Casi listo...'];
const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getSheetRows = (workbook, sheetName) => {
  if (!sheetName || !workbook?.Sheets?.[sheetName]) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false
  });
};

const toNutritionForm = (nutritionPlan) => {
  const meals = Array.isArray(nutritionPlan?.meals) ? nutritionPlan.meals : [];
  return {
    status: nutritionPlan?.status || (meals.length > 0 ? 'active' : 'inactive'),
    goal: nutritionPlan?.goal || '',
    dailyCalories: nutritionPlan?.dailyCalories ?? '',
    notes: nutritionPlan?.notes || '',
    meals: meals.length
      ? meals.map((meal) => ({
          title: meal?.title || '',
          time: meal?.time || '',
          calories: meal?.calories ?? '',
          description: meal?.description || '',
          itemsText: Array.isArray(meal?.items) ? meal.items.join('\n') : ''
        }))
      : [{ title: '', time: '', calories: '', description: '', itemsText: '' }]
  };
};

const splitNameParts = (fullName) => {
  const value = String(fullName || '').trim();
  if (!value) return { firstName: '', lastName: '' };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: value, lastName: '' };
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ')
  };
};

const toMemberSummaryForm = (user) => {
  const userName = String(user?.name || '').trim();
  const split = splitNameParts(userName);
  return {
    nombre: user?.firstName || user?.nombre || split.firstName,
    apellido: user?.lastName || user?.apellido || split.lastName,
    cedula: user?.documentNumber || user?.cedula || '',
    birthDate: user?.birthDate || user?.fechaNacimiento || '',
    fechaAlta: user?.fechaAlta || user?.admissionDate || user?.memberSince || '',
    email: user?.email || '',
    telefono: user?.phone || user?.telefono || '',
    estado: user?.status || 'active',
    emergencyMedical: user?.emergencyMedical || user?.medicalEmergency || '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || ''
  };
};

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const addDaysIsoDate = (baseDate, daysToAdd) => {
  const date = new Date(baseDate);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
};

const paymentMethodLabel = (method) => {
  const raw = String(method || "").toLowerCase();
  if (raw === "efectivo") return "Efectivo";
  if (raw === "mercado_pago" || raw === "mercadopago" || raw === "mercado pago") return "Mercado Pago";
  if (raw === "transferencia") return "Transferencia";
  if (raw === "tarjeta") return "Tarjeta";
  if (raw === "otro") return "Tarjeta";
  return method || "-";
};

const TooltipActionButton = ({ tooltip, className, children, wrapperClassName = '', ...buttonProps }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const onMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowTooltip(true), 500);
  };

  const onMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
    setShowTooltip(false);
  };

  useEffect(() => () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  return (
    <div className={`relative ${wrapperClassName}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <button {...buttonProps} className={className}>
        {children}
      </button>
      {showTooltip ? (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-max max-w-[200px] px-2 py-1.5 text-[11px] leading-snug bg-[#1a1a1a] text-white border border-white/15 shadow-lg">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-l border-t border-white/15 rotate-45" />
          <span className="relative">{tooltip}</span>
        </div>
      ) : null}
    </div>
  );
};

const createNewStudentForm = () => ({
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
  cedula: '',
  birthDate: '',
  planId: '',
  emergencyMedical: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  inviteToApp: false
});

const ClassModal = ({ value, trainers, onChange, onClose, onSubmit, saving }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 p-4 flex items-center justify-center">
    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-xl bg-bootcamp-gray border border-white/10">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">{value.id ? 'Editar Clase' : 'Nueva Clase'}</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10"><X className="w-5 h-5" /></button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="p-6 space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Nombre de clase" className="w-full input-bootcamp px-4 py-3 text-white" required />
          <select
            value={value.trainerId}
            onChange={(e) => onChange({ ...value, trainerId: e.target.value })}
            className="w-full input-bootcamp px-4 py-3 text-white"
            required
          >
            <option value="">Seleccionar entrenador</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <select value={value.day} onChange={(e) => onChange({ ...value, day: e.target.value })} className="w-full input-bootcamp px-4 py-3 text-white" required>
            {classDays.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} className="w-full input-bootcamp px-4 py-3 text-white" required />
          <input type="number" min="1" value={value.spots} onChange={(e) => onChange({ ...value, spots: e.target.value })} placeholder="Cupos" className="w-full input-bootcamp px-4 py-3 text-white" required />
        </div>
        {!value.id ? (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={Boolean(value.repeatWeekdays)}
              onChange={(e) => onChange({ ...value, repeatWeekdays: e.target.checked })}
            />
            Repetir en dias habiles (Lunes a Viernes, solo si el dia es Lunes)
          </label>
        ) : null}
        <button type="submit" disabled={saving} className="btn-bootcamp w-full">{saving ? 'Guardando...' : 'Guardar Clase'}</button>
      </form>
    </motion.div>
  </motion.div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState(emptyStats);
  const [classes, setClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [plans, setPlans] = useState(defaultPlans);
  const [announcements, setAnnouncements] = useState(defaultAnnouncements);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({ id: '', name: '', day: 'Lunes', time: '07:00', trainerId: '', spots: 12, repeatWeekdays: false });
  const [selectedClassDay, setSelectedClassDay] = useState('Todos');
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [newStudentSaving, setNewStudentSaving] = useState(false);
  const [newStudentHealthOpen, setNewStudentHealthOpen] = useState(false);
  const [newStudentPlans, setNewStudentPlans] = useState([]);
  const [newStudentPlansLoading, setNewStudentPlansLoading] = useState(false);
  const [newStudentErrors, setNewStudentErrors] = useState({});
  const [newStudentForm, setNewStudentForm] = useState(createNewStudentForm());
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberSummaryEditing, setMemberSummaryEditing] = useState(false);
  const [memberSummarySaving, setMemberSummarySaving] = useState(false);
  const [memberSummaryForm, setMemberSummaryForm] = useState(toMemberSummaryForm());
  const [paymentFormVisible, setPaymentFormVisible] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [memberPaymentsLoading, setMemberPaymentsLoading] = useState(false);
  const [memberPayments, setMemberPayments] = useState([]);
  const [memberPaymentsSummary, setMemberPaymentsSummary] = useState({
    totalPaid: 0,
    lastPayment: null,
    expirationDate: null,
    passesRemaining: 0,
    planPassCount: 0
  });
  const [paymentPlansCatalog, setPaymentPlansCatalog] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    planId: '',
    basePrice: 0,
    discount: 0,
    total: 0,
    paymentMethod: 'Efectivo',
    paymentDate: getTodayIsoDate(),
    reference: '',
    notes: ''
  });
  const [memberPlanChanging, setMemberPlanChanging] = useState(false);
  const [memberPlanSaving, setMemberPlanSaving] = useState(false);
  const [memberPlansLoading, setMemberPlansLoading] = useState(false);
  const [availableMemberPlans, setAvailableMemberPlans] = useState([]);
  const [selectedMemberPlanId, setSelectedMemberPlanId] = useState('');
  const [appAccessSaving, setAppAccessSaving] = useState(false);
  const [appInviteCedula, setAppInviteCedula] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailTab, setMemberDetailTab] = useState('summary');
  const [adminNote, setAdminNote] = useState('');
  const [nutritionForm, setNutritionForm] = useState(toNutritionForm());
  const [nutritionSaving, setNutritionSaving] = useState(false);
  const [activatingUserId, setActivatingUserId] = useState('');
  const [reportsYear, setReportsYear] = useState(new Date().getFullYear());
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [attendanceCalendar, setAttendanceCalendar] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [commTemplate, setCommTemplate] = useState('payment');
  const [commScope, setCommScope] = useState('debt');
  const [commMessage, setCommMessage] = useState('');
  const [commAmount, setCommAmount] = useState(1900);
  const [commMonthsDue, setCommMonthsDue] = useState(1);
  const [selectedCommUsers, setSelectedCommUsers] = useState([]);
  const [lastCommResult, setLastCommResult] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState(null);
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [memberPlanFilter, setMemberPlanFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuickTab, setMemberQuickTab] = useState('all');
  const [membersPage, setMembersPage] = useState(1);
  const [roleChangeConfirm, setRoleChangeConfirm] = useState(null);
  const [roleChangeSaving, setRoleChangeSaving] = useState(false);
  const [excelImportFileName, setExcelImportFileName] = useState('');
  const [excelImportFileSize, setExcelImportFileSize] = useState(0);
  const [excelImportData, setExcelImportData] = useState({ clientes: [], asistencia: [], movimientos: [] });
  const [excelImportPreviewTab, setExcelImportPreviewTab] = useState('clientes');
  const [excelImportParsing, setExcelImportParsing] = useState(false);
  const [excelImportSubmitting, setExcelImportSubmitting] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState(null);
  const [showExcelImportResultModal, setShowExcelImportResultModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelImportStepIndex, setExcelImportStepIndex] = useState(0);
  const [excelImportProgressCount, setExcelImportProgressCount] = useState(0);
  const [excelImportCompleted, setExcelImportCompleted] = useState(false);
  const [excelDropActive, setExcelDropActive] = useState(false);
  const [excelDetectedSheets, setExcelDetectedSheets] = useState({ clientes: false, asistencia: false, movimientos: false });
  const excelFileInputRef = useRef(null);
  const previousNewStudentCedulaRef = useRef('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('bootcamp_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  }, []);

  const classesByDay = useMemo(() => {
    const grouped = classDays.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {});

    classes.forEach((cls) => {
      const dayKey = classDays.includes(cls.day) ? cls.day : null;
      if (dayKey) grouped[dayKey].push(cls);
    });

    classDays.forEach((day) => {
      grouped[day].sort((a, b) => `${a.time || ''}`.localeCompare(`${b.time || ''}`));
    });

    return grouped;
  }, [classes]);

  const orderedDaysForAllView = useMemo(() => {
    return [...classDays].sort((a, b) => {
      const aHasClasses = (classesByDay[a] || []).length > 0;
      const bHasClasses = (classesByDay[b] || []).length > 0;
      if (aHasClasses === bHasClasses) return classDays.indexOf(a) - classDays.indexOf(b);
      return aHasClasses ? -1 : 1;
    });
  }, [classesByDay]);

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = new Error(data.message || `Error en ${path}`);
      apiError.status = response.status;
      apiError.payload = data;
      throw apiError;
    }
    return data;
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      minimumFractionDigits: 0
    }).format(Number(amount || 0));

  const parseDateValue = (value) => {
    if (!value || value === '-') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = trimmed.match(ddmmyyyy);
      if (match) {
        const [, dd, mm, yyyy] = match;
        const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDateLabel = (value) => {
    const parsed = parseDateValue(value);
    if (!parsed) return value || '-';
    return parsed.toLocaleDateString('es-UY');
  };

  const getDaysUntil = (value) => {
    const parsed = parseDateValue(value);
    if (!parsed) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const resolveExpirationDate = (member) => member?.expirationDate || member?.planExpires || member?.nextPayment || '-';

  const getStatusBadge = (member) => {
    const expirationDate = resolveExpirationDate(member);
    const daysUntilExpiration = getDaysUntil(expirationDate);
    const rawStatus = String(member?.status || '').toLowerCase().trim();

    if (['sin pago', 'sin_pago', 'no payment', 'no_payment', 'nopayment'].includes(rawStatus)) {
      return {
        label: 'Sin pago',
        className: 'bg-gray-500/15 text-gray-300 border-gray-500/40'
      };
    }
    if (['vencido', 'expired'].includes(rawStatus)) {
      return {
        label: 'Vencido',
        className: 'bg-red-500/15 text-red-300 border-red-500/40'
      };
    }
    if (['por vencer', 'por_vencer', 'expiring'].includes(rawStatus)) {
      return {
        label: 'Por vencer',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      };
    }
    if (rawStatus === 'pending' || rawStatus === 'pendiente') {
      return {
        label: 'Pendiente',
        className: 'bg-orange-500/15 text-orange-300 border-orange-500/40'
      };
    }
    if (!member?.lastPaymentDate && daysUntilExpiration === null) {
      return {
        label: 'Sin pago',
        className: 'bg-gray-500/15 text-gray-300 border-gray-500/40'
      };
    }

    if (daysUntilExpiration !== null && daysUntilExpiration < 0) {
      return {
        label: 'Vencido',
        className: 'bg-red-500/15 text-red-300 border-red-500/40'
      };
    }
    if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
      return {
        label: 'Por vencer',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      };
    }
    return {
      label: 'Al día',
      className: 'bg-green-500/15 text-green-300 border-green-500/40'
    };
  };

  const getRoleBadgeClass = (role, isActive) => {
    if (isActive) {
      if (role === 'admin') return 'bg-orange-500/25 text-orange-300 border-orange-400/70';
      if (role === 'trainer') return 'bg-blue-500/25 text-blue-300 border-blue-400/70';
      return 'bg-green-500/25 text-green-300 border-green-400/70';
    }
    return 'border-white/20 text-gray-500 opacity-60';
  };

  const getDateHighlightClass = (value) => {
    const days = getDaysUntil(value);
    if (days === null) return 'text-gray-400';
    if (days < 0) return 'text-red-400 font-semibold';
    if (days <= 7) return 'text-amber-300 font-semibold';
    return 'text-green-300 font-semibold';
  };

  const matchesMemberQuickTab = (member, tab) => {
    if (tab === 'all') return true;
    const rawStatus = String(member?.status || '').toLowerCase();
    const expirationDate = member?.expirationDate || resolveExpirationDate(member);
    const daysUntilExpiration = getDaysUntil(expirationDate);
    const hasPayment = Boolean(member?.lastPaymentDate);
    if (tab === 'active') return rawStatus === 'active' && daysUntilExpiration !== null && daysUntilExpiration > 0;
    if (tab === 'inactive') return rawStatus === 'inactive' || rawStatus === 'suspended';
    if (tab === 'no_payment') return !hasPayment;
    return true;
  };

  const formatPlanBadgeLabel = (planValue) => {
    const raw = String(planValue || '').trim();
    if (!raw) return '-';
    const compact = raw.replace(/\s+/g, '').toLowerCase();
    const passMatch = compact.match(/^(\d+)pases?$/);
    if (passMatch) return `${passMatch[1]} PASES`;
    if (compact === 'libre') return 'LIBRE';
    return raw.toUpperCase();
  };

  const memberPlanOptions = useMemo(() => {
    const uniquePlans = new Set(
      members
        .map((m) => String(m.plan || '').trim())
        .filter(Boolean)
    );
    return Array.from(uniquePlans).sort((a, b) => a.localeCompare(b, 'es'));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const searchTerm = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const matchesTab = matchesMemberQuickTab(member, memberQuickTab);
      const statusBadge = getStatusBadge(member);
      const matchesStatus = memberStatusFilter === 'all' || statusBadge.label === memberStatusFilter;
      const planLabel = String(member.plan || '').trim();
      const matchesPlan = memberPlanFilter === 'all' || planLabel === memberPlanFilter;
      const searchable = `${member.fullName || member.name || ''} ${member.email || ''} ${member.documentNumber || member.cedula || ''}`.toLowerCase();
      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      return matchesTab && matchesStatus && matchesPlan && matchesSearch;
    });
  }, [members, memberQuickTab, memberStatusFilter, memberPlanFilter, memberSearch]);

  const memberQuickTabCounts = useMemo(() => {
    const countByTab = { all: members.length, active: 0, inactive: 0, no_payment: 0 };
    members.forEach((member) => {
      if (matchesMemberQuickTab(member, 'active')) countByTab.active += 1;
      if (matchesMemberQuickTab(member, 'inactive')) countByTab.inactive += 1;
      if (matchesMemberQuickTab(member, 'no_payment')) countByTab.no_payment += 1;
    });
    return countByTab;
  }, [members]);

  const membersPerPage = 20;
  const membersTotalPages = Math.max(1, Math.ceil(filteredMembers.length / membersPerPage));
  const paginatedMembers = useMemo(() => {
    const start = (membersPage - 1) * membersPerPage;
    return filteredMembers.slice(start, start + membersPerPage);
  }, [filteredMembers, membersPage]);

  const membersPaginationLabel = useMemo(() => {
    if (!filteredMembers.length) return 'Mostrando 0-0 de 0 alumnos';
    const from = (membersPage - 1) * membersPerPage + 1;
    const to = Math.min(membersPage * membersPerPage, filteredMembers.length);
    return `Mostrando ${from}-${to} de ${filteredMembers.length} alumnos`;
  }, [filteredMembers.length, membersPage]);

  const memberPaymentSummary = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        const expirationDate = resolveExpirationDate(member);
        const daysUntilExpiration = getDaysUntil(expirationDate);
        const rawStatus = String(member?.status || '').toLowerCase();

        if (daysUntilExpiration !== null && daysUntilExpiration <= 0) {
          acc.expiredTodayOrPast += 1;
        } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
          acc.expiringThisWeek += 1;
        }

        if (rawStatus === 'pending' || rawStatus === 'pendiente') {
          acc.pendingPayments += 1;
        }

        return acc;
      },
      { expiredTodayOrPast: 0, expiringThisWeek: 0, pendingPayments: 0 }
    );
  }, [members]);

  const emergencyInfoMissing = !String(memberSummaryForm.emergencyMedical || '').trim() &&
    !String(memberSummaryForm.emergencyContactName || '').trim() &&
    !String(memberSummaryForm.emergencyContactPhone || '').trim();
  const excelClientesTotal = Array.isArray(excelImportData?.clientes) ? excelImportData.clientes.length : 0;

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, classesRes, configRes, trainersRes] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest('/admin/classes'),
        apiRequest('/admin/site-config'),
        apiRequest('/admin/trainers/assignable')
      ]);

      let studentsPayload = [];
      try {
        const studentsRes = await apiRequest('/students');
        studentsPayload = Array.isArray(studentsRes) ? studentsRes : studentsRes?.students || [];
        console.log('[GET /api/students] students payload:', studentsPayload);
      } catch (studentsErr) {
        console.error('[GET /api/students] error, fallback to /admin/members:', studentsErr);
        const membersRes = await apiRequest('/admin/members');
        const membersFallback = Array.isArray(membersRes?.members) ? membersRes.members : [];
        studentsPayload = membersFallback.map((m) => ({
          ...m,
          id: m.id || m._id,
          cedula: m.cedula || m.documentNumber || '',
          documentNumber: m.documentNumber || m.cedula || '',
          fechaAlta: m.fechaAlta || m.admissionDate || m.memberSince || null,
          lastPaymentDate: m.lastPaymentDate || m.lastPayment || null,
          expirationDate: m.expirationDate || m.planExpires || null,
          nextPaymentDate: m.nextPaymentDate || m.nextPayment || m.expirationDate || m.planExpires || null,
          passesRemaining: m.passesRemaining ?? m.classesLeft ?? 0
        }));
      }

      setStats(dashboard.stats || emptyStats);
      setClasses(classesRes.classes || []);
      setMembers(studentsPayload);
      setTrainers(trainersRes.trainers || []);
      setLogoUrl(configRes.logoUrl || '');
      setPlans(configRes.plans?.length ? configRes.plans : defaultPlans);
      setAnnouncements(configRes.announcements?.length ? configRes.announcements : defaultAnnouncements);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el panel admin');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (year = reportsYear) => {
    try {
      setReportsLoading(true);
      const [attendance, revenue] = await Promise.all([
        apiRequest('/admin/reports/attendance'),
        apiRequest(`/admin/reports/revenue?year=${year}`)
      ]);
      setAttendanceReport(attendance);
      setRevenueReport(revenue);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los reportes');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadAttendanceCalendar = async (memberId, month = calendarMonth, year = calendarYear) => {
    try {
      setCalendarLoading(true);
      const data = await apiRequest(`/admin/users/${memberId}/attendance-calendar?month=${month}&year=${year}`);
      setAttendanceCalendar(data.calendar || {});
    } catch (err) {
      setError(err.message || 'No se pudo cargar el calendario de asistencia');
      setAttendanceCalendar({});
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadReports(reportsYear);
  }, []);

  useEffect(() => {
    loadReports(reportsYear);
  }, [reportsYear]);

  useEffect(() => {
    if (showMemberDetailModal && selectedMember && memberDetailTab === 'attendance') {
      loadAttendanceCalendar(selectedMember.id, calendarMonth, calendarYear);
    }
  }, [showMemberDetailModal, selectedMember, memberDetailTab, calendarMonth, calendarYear]);

  useEffect(() => {
    if (showMemberDetailModal && selectedMember && memberDetailTab === 'payments') {
      loadMemberPayments(selectedMember.id);
    }
  }, [showMemberDetailModal, selectedMember, memberDetailTab]);

  useEffect(() => {
    if (memberDetailTab !== 'summary' && memberSummaryEditing) {
      setMemberSummaryEditing(false);
    }
  }, [memberDetailTab, memberSummaryEditing]);

  useEffect(() => {
    if (memberDetailTab !== 'payments' && paymentFormVisible) {
      setPaymentFormVisible(false);
    }
  }, [memberDetailTab, paymentFormVisible]);

  useEffect(() => {
    if (memberDetailTab !== 'summary' && memberPlanChanging) {
      setMemberPlanChanging(false);
      setSelectedMemberPlanId('');
    }
  }, [memberDetailTab, memberPlanChanging]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeoutId = setTimeout(() => setToastMessage(''), 2600);
    return () => clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (!showNewStudentModal) return;
    const currentCedula = String(newStudentForm.cedula || '').trim();
    const previousCedula = String(previousNewStudentCedulaRef.current || '').trim();
    if (!previousCedula && currentCedula) {
      setNewStudentForm((prev) => ({ ...prev, inviteToApp: true }));
    } else if (previousCedula && !currentCedula) {
      setNewStudentForm((prev) => ({ ...prev, inviteToApp: false }));
    }
    previousNewStudentCedulaRef.current = currentCedula;
  }, [newStudentForm.cedula, showNewStudentModal]);

  useEffect(() => {
    setMembersPage(1);
  }, [memberQuickTab, memberStatusFilter, memberPlanFilter, memberSearch]);

  useEffect(() => {
    if (membersPage > membersTotalPages) {
      setMembersPage(membersTotalPages);
    }
  }, [membersPage, membersTotalPages]);

  useEffect(() => {
    if (!excelImportSubmitting) return undefined;
    const timer = setInterval(() => {
      setExcelImportStepIndex((prev) => (prev + 1) % excelImportLoadingTexts.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [excelImportSubmitting]);

  useEffect(() => {
    if (!excelImportSubmitting) return undefined;
    const timer = setInterval(() => {
      setExcelImportProgressCount((prev) => {
        if (prev >= excelClientesTotal) return prev;
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [excelImportSubmitting, excelClientesTotal]);

  useEffect(() => {
    if (!showExcelImportModal || !excelImportSubmitting) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [showExcelImportModal, excelImportSubmitting]);

  const openNewClass = () => {
    setClassForm({ id: '', name: '', day: 'Lunes', time: '07:00', trainerId: '', spots: 12, repeatWeekdays: false });
    setShowClassModal(true);
  };

  const openEditClass = (cls) => {
    setClassForm({
      id: cls.id,
      name: cls.name,
      day: cls.day,
      time: cls.time,
      trainerId: cls.trainerId || '',
      spots: cls.spots,
      repeatWeekdays: false
    });
    setShowClassModal(true);
  };

  const saveClass = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: classForm.name,
        day: classForm.day,
        time: classForm.time,
        trainerId: classForm.trainerId,
        spots: Number(classForm.spots),
        repeatWeekdays: Boolean(classForm.repeatWeekdays)
      };

      if (classForm.id) {
        await apiRequest(`/admin/classes/${classForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/admin/classes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setSuccess('Clase guardada correctamente');
      setShowClassModal(false);
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la clase');
    } finally {
      setSaving(false);
    }
  };

  const toggleClassStatus = async (cls) => {
    try {
      setError('');
      const path = cls.active ? `/admin/classes/${cls.id}/cancel` : `/admin/classes/${cls.id}/activate`;
      await apiRequest(path, { method: 'PATCH' });
      setSuccess(cls.active ? 'Clase cancelada' : 'Clase reactivada');
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la clase');
    }
  };

  const saveSiteConfig = async () => {
    try {
      setSaving(true);
      setError('');
      await apiRequest('/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify({ logoUrl, plans, announcements })
      });
      setSuccess('Configuracion de landing guardada');
    } catch (err) {
      setError(err.message || 'No se pudo guardar configuracion');
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (idx, patch) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removePlan = (idx) => {
    setPlans((prev) => prev.filter((_, i) => i !== idx));
  };

  const addPlan = () => {
    setPlans((prev) => [...prev, createNewPlan()]);
  };

  const setPopularPlan = (idx) => {
    setPlans((prev) => prev.map((p, i) => ({ ...p, popular: i === idx })));
  };

  const onLogoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo del logo debe ser una imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
        setSuccess('Logo cargado. Recorda guardar cambios.');
      }
    };
    reader.onerror = () => {
      setError('No se pudo leer el archivo del logo');
    };
    reader.readAsDataURL(file);
  };

  const updateAnnouncement = (idx, patch) => {
    setAnnouncements((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const addAnnouncement = () => {
    setAnnouncements((prev) => [...prev, createNewAnnouncement()]);
  };

  const removeAnnouncement = (idx) => {
    setAnnouncements((prev) => prev.filter((_, i) => i !== idx));
  };

  const onAnnouncementImageChange = (idx, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo del anuncio debe ser una imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateAnnouncement(idx, { imageUrl: reader.result });
        setSuccess('Imagen de anuncio cargada. Recorda guardar cambios.');
      }
    };
    reader.onerror = () => setError('No se pudo leer la imagen del anuncio');
    reader.readAsDataURL(file);
  };

  const beginRoleChange = (member, role) => {
    const memberId = member?.id || member?._id;
    if (!memberId) return;
    const current = Array.isArray(member.roles) && member.roles.length > 0 ? member.roles : ['user'];
    let next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    if (!next.includes('user')) next = [...next, 'user'];
    setRoleChangeConfirm({
      memberId,
      memberName: member.fullName || member.name || 'alumno',
      role,
      nextRoles: Array.from(new Set(next))
    });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeConfirm?.memberId) return;
    try {
      setRoleChangeSaving(true);
      setError('');
      await apiRequest(`/students/${roleChangeConfirm.memberId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles: roleChangeConfirm.nextRoles })
      });
      setSuccess('Roles actualizados');
      setToastMessage('Roles actualizados correctamente');
      setRoleChangeConfirm(null);
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudieron actualizar los roles');
    } finally {
      setRoleChangeSaving(false);
    }
  };

  const toggleUserStatus = async (member, action) => {
    try {
      setError('');
      await apiRequest(`/admin/users/${member.id}/toggle-status`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      setSuccess(`Usuario ${action === 'activate' ? 'activado' : action === 'deactivate' ? 'desactivado' : 'suspendido'}`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado');
    }
  };

  const importMembersCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCsvImporting(true);
      setError('');
      setSuccess('');
      const csvContent = await file.text();
      const result = await apiRequest('/admin/users/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csvContent })
      });
      setCsvImportResult(result);
      setSuccess(`Importacion completada. Nuevos: ${result.imported}, actualizados: ${result.updated}, omitidos: ${result.skipped}`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo importar CSV');
    } finally {
      setCsvImporting(false);
      event.target.value = '';
    }
  };

  const processSmartExcelFile = async (file) => {
    if (!file) return;
    try {
      setExcelImportParsing(true);
      setError('');
      setSuccess('');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      const clientesSheet = workbook.SheetNames.find((name) => normalizeHeader(name).includes('cliente'));
      const asistenciaSheet = workbook.SheetNames.find((name) => normalizeHeader(name).includes('asistencia'));
      const movimientosSheet = workbook.SheetNames.find((name) => normalizeHeader(name).includes('movimiento'));

      const parsed = {
        clientes: getSheetRows(workbook, clientesSheet || firstSheet),
        asistencia: getSheetRows(workbook, asistenciaSheet),
        movimientos: getSheetRows(workbook, movimientosSheet)
      };

      setExcelImportFileName(file.name);
      setExcelImportFileSize(Number(file.size || 0));
      setExcelImportData(parsed);
      setExcelDetectedSheets({
        clientes: Boolean(clientesSheet || firstSheet),
        asistencia: Boolean(asistenciaSheet),
        movimientos: Boolean(movimientosSheet)
      });
      setExcelImportPreviewTab('clientes');
      setExcelImportResult(null);
      setExcelImportCompleted(false);
      setExcelImportStepIndex(0);
      setExcelImportProgressCount(0);
      setShowExcelImportResultModal(false);
    } catch (err) {
      setError(err.message || 'No se pudo parsear el Excel');
    } finally {
      setExcelImportParsing(false);
    }
  };

  const parseSmartExcelImport = async (event) => {
    const file = event.target.files?.[0];
    await processSmartExcelFile(file);
    if (event?.target) event.target.value = '';
  };

  const onExcelDrop = async (event) => {
    event.preventDefault();
    setExcelDropActive(false);
    const file = event.dataTransfer?.files?.[0];
    await processSmartExcelFile(file);
  };

  const closeExcelImportModal = () => {
    if (excelImportSubmitting) return;
    setShowExcelImportModal(false);
    setExcelImportCompleted(false);
    setExcelImportStepIndex(0);
    setExcelImportProgressCount(0);
  };

  const openNewStudentModal = async () => {
    try {
      setShowNewStudentModal(true);
      setNewStudentSaving(false);
      setNewStudentHealthOpen(false);
      setNewStudentErrors({});
      setNewStudentForm(createNewStudentForm());
      previousNewStudentCedulaRef.current = '';
      setNewStudentPlansLoading(true);
      let data;
      try {
        data = await apiRequest('/plans');
      } catch (_err) {
        data = await apiRequest('/students/plans');
      }
      const plansList = Array.isArray(data) ? data : data?.plans || [];
      setNewStudentPlans(plansList);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los planes');
      setNewStudentPlans([]);
    } finally {
      setNewStudentPlansLoading(false);
    }
  };

  const closeNewStudentModal = (force = false) => {
    if (newStudentSaving && !force) return;
    setShowNewStudentModal(false);
    setNewStudentSaving(false);
    setNewStudentHealthOpen(false);
    setNewStudentErrors({});
    setNewStudentForm(createNewStudentForm());
    previousNewStudentCedulaRef.current = '';
  };

  const submitNewStudent = async () => {
    const errors = {};
    if (!String(newStudentForm.nombre || '').trim()) errors.nombre = 'Nombre requerido';
    if (!String(newStudentForm.apellido || '').trim()) errors.apellido = 'Apellido requerido';
    if (!String(newStudentForm.telefono || '').trim()) errors.telefono = 'Telefono requerido';
    if (Object.keys(errors).length > 0) {
      setNewStudentErrors(errors);
      return;
    }

    try {
      setNewStudentSaving(true);
      setNewStudentErrors({});
      setError('');
      const payload = {
        name: String(newStudentForm.nombre || '').trim(),
        lastName: String(newStudentForm.apellido || '').trim(),
        phone: String(newStudentForm.telefono || '').trim(),
        email: String(newStudentForm.email || '').trim() || null,
        cedula: String(newStudentForm.cedula || '').trim() || null,
        birthDate: newStudentForm.birthDate || null,
        planId: newStudentForm.planId || null,
        emergencyMedical: String(newStudentForm.emergencyMedical || '').trim() || null,
        emergencyContactName: String(newStudentForm.emergencyContactName || '').trim() || null,
        emergencyContactPhone: String(newStudentForm.emergencyContactPhone || '').trim() || null,
        inviteToApp: Boolean(newStudentForm.inviteToApp)
      };

      const result = await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setToastMessage('? Alumno creado correctamente');
      setSuccess('? Alumno creado correctamente');
      const createdName = String(newStudentForm.nombre || '').trim();
      if (payload.inviteToApp && payload.cedula) {
        setTimeout(() => setToastMessage(`? Invitación enviada a ${createdName}`), 1000);
      }
      if (result?.warning === 'missing_cedula') {
        setTimeout(() => setToastMessage('?? Alumno creado sin acceso a la app — falta cédula'), 1200);
      }

      closeNewStudentModal(true);
      await loadAll();
    } catch (err) {
      const apiErrorCode = err?.payload?.error;
      if (apiErrorCode === 'duplicate_phone' || String(err?.message || '').toLowerCase().includes('telefono')) {
        setNewStudentErrors((prev) => ({ ...prev, telefono: 'Ya existe un alumno con este teléfono' }));
      } else {
        setError(err.message || 'No se pudo crear el alumno');
      }
    } finally {
      setNewStudentSaving(false);
    }
  };

  const getExcelSheetValidation = (sheetId) => {
    const rows = Array.isArray(excelImportData?.[sheetId]) ? excelImportData[sheetId] : [];
    const total = rows.length;
    const errors = [];
    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      if (sheetId === 'clientes') {
        const nombre = row?.Nombre || row?.nombre;
        const apellido = row?.Apellido || row?.apellido;
        if (!String(nombre || '').trim() || !String(apellido || '').trim()) errors.push(`Fila ${rowNo}: Nombre/Apellido requerido`);
      } else if (sheetId === 'asistencia') {
        const socio = row?.Socio || row?.socio;
        if (!String(socio || '').trim()) errors.push(`Fila ${rowNo}: Socio requerido`);
      } else if (sheetId === 'movimientos') {
        const tipo = row?.['Tipo de movimiento'] || row?.tipo;
        if (!String(tipo || '').trim()) errors.push(`Fila ${rowNo}: Tipo requerido`);
      }
    });

    return { total, errors, valid: Math.max(0, total - errors.length) };
  };

  const confirmSmartExcelImport = async () => {
    try {
      setExcelImportSubmitting(true);
      setExcelImportCompleted(false);
      setExcelImportStepIndex(0);
      setExcelImportProgressCount(0);
      setError('');
      const result = await apiRequest('/import/excel', {
        method: 'POST',
        body: JSON.stringify(excelImportData)
      });
      setExcelImportProgressCount(excelClientesTotal);
      setExcelImportResult(result);
      setExcelImportCompleted(true);
      setShowExcelImportResultModal(false);
      setSuccess('Importacion Excel completada');
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo importar el Excel');
    } finally {
      setExcelImportSubmitting(false);
    }
  };

  const downloadSmartImportErrorReport = () => {
    if (!excelImportResult) return;
    const rows = [];
    excelImportSheetOrder.forEach((sheetId) => {
      const errors = excelImportResult?.[sheetId]?.errors || [];
      errors.forEach((entry) => {
        const row = entry?.row ?? '';
        const reason = entry?.reason ?? String(entry || '');
        const escapedReason = `"${String(reason).replace(/"/g, '""')}"`;
        rows.push(`${sheetId},${row},${escapedReason}`);
      });
    });
    const csv = ['hoja,fila,motivo', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'import-errors-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const activateUserAccess = async (member) => {
    try {
      setActivatingUserId(member.id);
      setError('');
      setSuccess('');
      let documentNumber = String(member.documentNumber || '').trim();
      if (!documentNumber) {
        const prompted = window.prompt(`El usuario ${member.fullName || member.name || ''} no tiene cedula cargada.\nIngresa cedula para activar acceso:`, '');
        if (!prompted) {
          setError('Activacion cancelada: debes cargar cedula para habilitar acceso.');
          return;
        }
        documentNumber = String(prompted).trim();
      }

      const result = await apiRequest(`/admin/users/${member.id}/activate-access`, {
        method: 'POST',
        body: JSON.stringify({ documentNumber })
      });
      const emailInfo = result.emailSent === false ? ' (correo no enviado)' : ' (correo enviado)';
      setSuccess(`${result.message || 'Acceso activado'}${emailInfo}. Usuario inicial: cedula. Contraseña inicial: cedula. Se solicita cambio en primer ingreso.`);
      await loadAll();
      if (selectedMember?.id === member.id) {
        await loadMemberDetail(member);
      }
    } catch (err) {
      setError(err.message || 'No se pudo activar el acceso');
    } finally {
      setActivatingUserId('');
    }
  };

  const quickEditMemberCedula = async (member) => {
    try {
      const currentCedula = String(member.documentNumber || member.cedula || '').trim();
      const prompted = window.prompt(`Ingresar cédula para ${member.fullName || member.name || 'alumno'}:`, currentCedula);
      if (prompted === null) return;
      const documentNumber = String(prompted || '').trim();
      if (!documentNumber) {
        setError('Debes ingresar una cédula válida');
        return;
      }

      setError('');
      await apiRequest(`/students/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ documentNumber })
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? {
                ...m,
                documentNumber
              }
            : m
        )
      );
      setSuccess('Cédula actualizada correctamente');
      setToastMessage('Cédula actualizada correctamente');
      if (selectedMember?.id === member.id) {
        await loadMemberDetail(member);
      }
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la cédula');
    }
  };

  const inviteStudentToApp = async ({ withCedula } = {}) => {
    try {
      if (!selectedMember?.id || !memberDetail?.user) return;
      const targetName = memberDetail.user?.fullName || `${memberDetail.user?.name || ''} ${memberDetail.user?.lastName || ''}`.trim() || 'alumno';
      const phone = String(memberDetail.user?.phone || '').trim() || '-';
      const currentCedula = String(memberDetail.user?.documentNumber || memberDetail.user?.cedula || '').trim();
      const cedula = String(withCedula || currentCedula).trim();
      if (!cedula) {
        setError('Falta la cédula para activar el acceso');
        return;
      }

      const confirmed = window.confirm(
        `Se activará el acceso para ${targetName}.\nUsuario: ${phone} | Contraseña: ${cedula}\n¿Confirmar?`
      );
      if (!confirmed) return;

      setAppAccessSaving(true);
      setError('');
      if (withCedula) {
        await apiRequest(`/students/${selectedMember.id}`, {
          method: 'PUT',
          body: JSON.stringify({ cedula })
        });
      }
      await apiRequest(`/students/${selectedMember.id}/invite`, {
        method: 'POST'
      });

      setToastMessage('¡Invitación enviada!');
      setSuccess('¡Invitación enviada!');
      await Promise.all([loadMemberDetail(selectedMember), loadAll()]);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la invitación');
    } finally {
      setAppAccessSaving(false);
    }
  };

  const revokeStudentAppAccess = async () => {
    try {
      if (!selectedMember?.id) return;
      const confirmed = window.confirm('¿Revocar acceso a la app para este alumno?');
      if (!confirmed) return;
      setAppAccessSaving(true);
      setError('');
      await apiRequest(`/students/${selectedMember.id}`, {
        method: 'PUT',
        body: JSON.stringify({ appAccess: false })
      });
      setSuccess('Acceso revocado');
      setToastMessage('Acceso revocado');
      await Promise.all([loadMemberDetail(selectedMember), loadAll()]);
    } catch (err) {
      setError(err.message || 'No se pudo revocar el acceso');
    } finally {
      setAppAccessSaving(false);
    }
  };

  const loadMemberDetail = async (member) => {
    try {
      setMemberDetailLoading(true);
      setError('');
      setMemberDetailTab('summary');
      setMemberSummaryEditing(false);
      setPaymentFormVisible(false);
      setMemberPayments([]);
      setMemberPaymentsSummary({
        totalPaid: 0,
        lastPayment: null,
        expirationDate: null,
        passesRemaining: 0,
        planPassCount: 0
      });
      setPaymentForm({
        planId: '',
        basePrice: 0,
        discount: 0,
        total: 0,
        paymentMethod: 'Efectivo',
        paymentDate: getTodayIsoDate(),
        reference: '',
        notes: ''
      });
      setMemberPlanChanging(false);
      setSelectedMember(member);
      setShowMemberDetailModal(true);
      const detail = await apiRequest(`/admin/users/${member.id}`);
      setMemberDetail(detail);
      setMemberSummaryForm(toMemberSummaryForm(detail?.user));
      setAppInviteCedula(String(detail?.user?.documentNumber || detail?.user?.cedula || '').trim());
      setNutritionForm(toNutritionForm(detail?.user?.nutritionPlan));
    } catch (err) {
      setShowMemberDetailModal(false);
      setError(err.message || 'No se pudo cargar el detalle del alumno');
    } finally {
      setMemberDetailLoading(false);
    }
  };

  const startMemberSummaryEdit = () => {
    setMemberSummaryForm(toMemberSummaryForm(memberDetail?.user));
    setMemberPlanChanging(false);
    setMemberSummaryEditing(true);
  };

  const cancelMemberSummaryEdit = () => {
    setMemberSummaryForm(toMemberSummaryForm(memberDetail?.user));
    setMemberSummaryEditing(false);
  };

  const startMemberPlanChange = async () => {
    try {
      if (!selectedMember?.id) return;
      setMemberPlansLoading(true);
      setError('');
      const data = await apiRequest('/students/plans');
      const plansList = Array.isArray(data) ? data : data?.plans || [];
      if (!plansList.length) {
        setError('No hay planes disponibles para asignar');
        return;
      }
      setAvailableMemberPlans(plansList);
      const currentPlanId = memberDetail?.user?.planId || memberDetail?.user?.plan?._id || memberDetail?.user?.plan?.id || '';
      setSelectedMemberPlanId(currentPlanId || plansList[0]?.id || plansList[0]?._id || '');
      setMemberPlanChanging(true);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los planes');
    } finally {
      setMemberPlansLoading(false);
    }
  };

  const cancelMemberPlanChange = () => {
    setMemberPlanChanging(false);
    setSelectedMemberPlanId('');
  };

  const confirmMemberPlanChange = async () => {
    try {
      if (!selectedMember?.id || !selectedMemberPlanId) return;
      setMemberPlanSaving(true);
      setError('');
      await apiRequest(`/students/${selectedMember.id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ planId: selectedMemberPlanId })
      });

      const selectedPlan = availableMemberPlans.find((p) => String(p.id || p._id) === String(selectedMemberPlanId));
      setMemberDetail((prev) => ({
        ...prev,
        user: {
          ...prev?.user,
          planId: selectedMemberPlanId,
          plan: selectedPlan?.name || prev?.user?.plan || '-'
        }
      }));
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? {
                ...m,
                plan: selectedPlan?.name || m.plan
              }
            : m
        )
      );

      setMemberPlanChanging(false);
      setSuccess('Plan actualizado correctamente');
      setToastMessage('Plan actualizado correctamente');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el plan');
    } finally {
      setMemberPlanSaving(false);
    }
  };

  const openPaymentForm = async () => {
    try {
      setError('');
      let plansList = paymentPlansCatalog;
      if (!plansList.length) {
        let data;
        try {
          data = await apiRequest('/plans');
        } catch (_err) {
          data = await apiRequest('/students/plans');
        }
        plansList = Array.isArray(data) ? data : data?.plans || [];
      }
      setPaymentPlansCatalog(plansList);

      const currentPlanIdRaw = memberDetail?.user?.planId || memberDetail?.user?.plan?.id || memberDetail?.user?.plan?._id || memberDetail?.user?.plan || '';
      const currentPlanName = String(memberDetail?.user?.plan?.name || memberDetail?.user?.plan || '').trim().toLowerCase();
      const selectedPlan =
        plansList.find((p) => String(p.id || p._id) === String(currentPlanIdRaw)) ||
        plansList.find((p) => String(p.name || '').trim().toLowerCase() === currentPlanName) ||
        plansList[0] ||
        null;

      const basePrice = Number(selectedPlan?.price || 0);
      setPaymentForm({
        planId: selectedPlan ? String(selectedPlan.id || selectedPlan._id) : '',
        basePrice,
        discount: 0,
        total: basePrice,
        paymentMethod: 'Efectivo',
        paymentDate: getTodayIsoDate(),
        reference: '',
        notes: ''
      });
      setPaymentFormVisible(true);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los planes');
    }
  };

  const submitPaymentRegistration = async () => {
    try {
      if (!selectedMember?.id) return;
      const amount = Number(paymentForm.total);
      if (!amount || amount <= 0) {
        setError('El monto debe ser mayor a 0');
        return;
      }

      setPaymentSaving(true);
      setError('');

      const paymentPayload = {
        planId: paymentForm.planId,
        basePrice: Number(paymentForm.basePrice || 0),
        discount: Number(paymentForm.discount || 0),
        total: amount,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        method: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate || getTodayIsoDate(),
        reference: String(paymentForm.reference || '').trim(),
        notes: String(paymentForm.notes || '').trim()
      };

      await apiRequest(`/students/${selectedMember.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentPayload)
      });

      let plansList = paymentPlansCatalog;
      if (!plansList.length) {
        let data;
        try {
          data = await apiRequest('/plans');
        } catch (_err) {
          data = await apiRequest('/students/plans');
        }
        plansList = Array.isArray(data) ? data : data?.plans || [];
        setPaymentPlansCatalog(plansList);
      }

      const matchedPlan = plansList.find((p) => String(p.id || p._id) === String(paymentForm.planId));

      const passesRemaining = Number(matchedPlan?.passCount || 0);
      const effectivePaymentDate = paymentForm.paymentDate || getTodayIsoDate();
      const nextPaymentDate = addDaysIsoDate(effectivePaymentDate, 30);
      const expirationDate = addDaysIsoDate(effectivePaymentDate, 30);

      await apiRequest(`/students/${selectedMember.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          passesRemaining,
          nextPaymentDate,
          expirationDate,
          status: 'active'
        })
      });

      await Promise.all([loadMemberDetail(selectedMember), loadAll(), loadMemberPayments(selectedMember.id)]);
      setPaymentFormVisible(false);
      setSuccess('Pago registrado correctamente');
      setToastMessage('Pago registrado correctamente');
    } catch (err) {
      setError(err.message || 'No se pudo registrar el pago');
    } finally {
      setPaymentSaving(false);
    }
  };

  const loadMemberPayments = async (memberId = selectedMember?.id) => {
    try {
      if (!memberId) return;
      setMemberPaymentsLoading(true);
      const data = await apiRequest(`/students/${memberId}/payments`);
      setMemberPayments(Array.isArray(data?.payments) ? data.payments : []);
      setMemberPaymentsSummary({
        totalPaid: Number(data?.summary?.totalPaid || 0),
        lastPayment: data?.summary?.lastPayment || null,
        expirationDate: data?.summary?.expirationDate || memberDetail?.user?.expirationDate || memberDetail?.user?.planExpires || null,
        passesRemaining:
          data?.summary?.passesRemaining === null || data?.summary?.passesRemaining === undefined
            ? (memberDetail?.user?.passesRemaining ?? memberDetail?.user?.classesLeft ?? 0)
            : Number(data.summary.passesRemaining),
        planPassCount:
          data?.summary?.planPassCount === null || data?.summary?.planPassCount === undefined
            ? 0
            : Number(data.summary.planPassCount)
      });
    } catch (err) {
      setMemberPayments([]);
      setMemberPaymentsSummary((prev) => ({
        ...prev,
        expirationDate: memberDetail?.user?.expirationDate || memberDetail?.user?.planExpires || null
      }));
      setError(err.message || 'No se pudo cargar el historial de pagos');
    } finally {
      setMemberPaymentsLoading(false);
    }
  };

  const saveMemberSummary = async () => {
    try {
      if (!selectedMember?.id) return;
      setMemberSummarySaving(true);
      setError('');
      const firstName = String(memberSummaryForm.nombre || '').trim();
      const lastName = String(memberSummaryForm.apellido || '').trim();
      const payload = {
        name: firstName,
        lastName,
        documentNumber: String(memberSummaryForm.cedula || '').trim(),
        birthDate: memberSummaryForm.birthDate || null,
        fechaAlta: memberSummaryForm.fechaAlta || null,
        email: String(memberSummaryForm.email || '').trim(),
        phone: String(memberSummaryForm.telefono || '').trim(),
        status: String(memberSummaryForm.estado || '').trim(),
        emergencyMedical: String(memberSummaryForm.emergencyMedical || '').trim(),
        emergencyContactName: String(memberSummaryForm.emergencyContactName || '').trim(),
        emergencyContactPhone: String(memberSummaryForm.emergencyContactPhone || '').trim()
      };

      await apiRequest(`/students/${selectedMember.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      await Promise.all([loadMemberDetail(selectedMember), loadAll()]);
      setSuccess('Alumno actualizado correctamente');
      setToastMessage('Alumno actualizado correctamente');
      setMemberSummaryEditing(false);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el alumno');
    } finally {
      setMemberSummarySaving(false);
    }
  };

  const addAdminNote = async () => {
    try {
      if (!selectedMember || !adminNote.trim()) return;
      setError('');
      await apiRequest(`/admin/users/${selectedMember.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: adminNote.trim() })
      });
      setAdminNote('');
      setSuccess('Nota agregada correctamente');
      await loadMemberDetail(selectedMember);
    } catch (err) {
      setError(err.message || 'No se pudo agregar la nota');
    }
  };

  const updateNutritionMeal = (idx, patch) => {
    setNutritionForm((prev) => ({
      ...prev,
      meals: prev.meals.map((meal, mealIdx) => (mealIdx === idx ? { ...meal, ...patch } : meal))
    }));
  };

  const addNutritionMeal = () => {
    setNutritionForm((prev) => ({
      ...prev,
      meals: [...prev.meals, { title: '', time: '', calories: '', description: '', itemsText: '' }]
    }));
  };

  const removeNutritionMeal = (idx) => {
    setNutritionForm((prev) => ({
      ...prev,
      meals: prev.meals.filter((_, mealIdx) => mealIdx !== idx)
    }));
  };

  const saveMemberNutrition = async () => {
    try {
      if (!selectedMember) return;
      setNutritionSaving(true);
      setError('');
      const payload = {
        status: nutritionForm.status,
        goal: nutritionForm.goal,
        dailyCalories: nutritionForm.dailyCalories,
        notes: nutritionForm.notes,
        meals: nutritionForm.meals.map((meal) => ({
          title: meal.title,
          time: meal.time,
          calories: meal.calories,
          description: meal.description,
          items: String(meal.itemsText || '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        }))
      };
      const result = await apiRequest(`/admin/users/${selectedMember.id}/nutrition`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setMemberDetail((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          nutritionPlan: result.nutritionPlan
        }
      }));
      setNutritionForm(toNutritionForm(result.nutritionPlan));
      setSuccess('Plan nutricional actualizado');
    } catch (err) {
      setError(err.message || 'No se pudo guardar el plan nutricional');
    } finally {
      setNutritionSaving(false);
    }
  };

  const getCommunicationUsers = () => {
    if (commScope === 'all') return members;
    if (commScope === 'active') return members.filter((m) => m.status === 'active');
    if (commScope === 'debt') return members.filter((m) => Number(m.debt || 0) > 0 || m.status === 'pending');
    return members;
  };

  const communicationUsers = getCommunicationUsers();
  const communicationTargets = selectedCommUsers.length > 0 ? selectedCommUsers : communicationUsers.map((u) => u.id);

  const toggleCommunicationUser = (userId) => {
    setSelectedCommUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const sendCommunication = async () => {
    try {
      if (communicationTargets.length === 0) {
        setError('No hay destinatarios para enviar');
        return;
      }
      setError('');
      setSuccess('');
      setSaving(true);
      const payload = {
        type: commTemplate,
        userIds: communicationTargets,
        message: commMessage
      };
      if (commTemplate === 'payment') {
        payload.amount = Number(commAmount || 1900);
        payload.monthsDue = Number(commMonthsDue || 1);
      }

      const result = await apiRequest('/notifications/bulk', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setLastCommResult(result);
      setSuccess(`Envio completado: ${result.sent}/${result.total}`);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la comunicacion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bootcamp-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bootcamp-orange border-t-transparent rounded animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bootcamp-black flex">
      <aside className="hidden lg:flex w-72 bg-bootcamp-gray border-r border-white/5 flex-col">
        <div className="p-6 border-b border-white/5">
          <BrandLogo size="sm" subtitle="Admin Panel" subtitleClassName="text-green-500" logoUrl={logoUrl} />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'overview', label: 'Dashboard', icon: Activity },
            { id: 'classes', label: 'Clases', icon: Calendar },
            { id: 'routines', label: 'Rutinas', icon: BarChart3 },
            { id: 'settings', label: 'Landing', icon: Settings },
            { id: 'members', label: 'Alumnos', icon: Users },
            { id: 'communications', label: 'Comunicaciones', icon: Mail }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${activeView === item.id ? 'bg-bootcamp-orange text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => navigate('/admin/supervision')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <Shield className="w-5 h-5" />
            <span>Supervision</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="lg:hidden glass border-b border-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-6 h-6" /></button>
            <span className="font-black uppercase">Admin</span>
            <div className="w-6" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4">
          {error && <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
          {success && <div className="p-3 border border-green-500/30 bg-green-500/10 text-green-300">{success}</div>}

          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black uppercase">Panel <span className="text-bootcamp-orange">Admin</span></h2>
                <div className="hidden lg:flex items-center gap-2 bg-green-500/10 px-4 py-2 border border-green-500/20">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-green-500">Admin</span>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Ingresos Mes', value: stats.monthlyRevenue, icon: DollarSign },
                  { label: 'Alumnos Activos', value: stats.activeMembers, icon: Users },
                  { label: 'Asistencia', value: `${stats.attendanceRate}%`, icon: CheckCircle },
                  { label: 'Pagos Pendientes', value: stats.pendingPayments, icon: AlertCircle }
                ].map((s) => (
                  <div key={s.label} className="card-bootcamp p-5">
                    <s.icon className="w-7 h-7 text-bootcamp-orange mb-2" />
                    <div className="text-2xl font-black">{s.label === 'Ingresos Mes' ? new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0 }).format(s.value) : s.value}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="card-bootcamp p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-bootcamp-orange" />
                    Reportes
                  </h3>
                  <input
                    type="number"
                    value={reportsYear}
                    onChange={(e) => setReportsYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-28 input-bootcamp px-3 py-2 text-white"
                  />
                </div>

                {reportsLoading ? (
                  <div className="text-sm text-gray-400">Cargando reportes...</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-bootcamp-black border border-white/10 p-4">
                      <div className="text-xs uppercase text-gray-500 mb-3">Asistencia por estado</div>
                      {(attendanceReport?.stats || []).map((row) => (
                        <div key={row._id} className="flex justify-between py-1 text-sm border-b border-white/10 last:border-b-0">
                          <span className="uppercase">{row._id}</span>
                          <span className="font-bold">{row.count}</span>
                        </div>
                      ))}
                      {(attendanceReport?.stats || []).length === 0 ? <div className="text-sm text-gray-500">Sin datos</div> : null}
                    </div>

                    <div className="bg-bootcamp-black border border-white/10 p-4">
                      <div className="text-xs uppercase text-gray-500 mb-3">Ingresos mensuales ({reportsYear})</div>
                      {(revenueReport?.byMonth || []).map((row) => (
                        <div key={row._id} className="flex justify-between py-1 text-sm border-b border-white/10 last:border-b-0">
                          <span>Mes {row._id}</span>
                          <span className="font-bold">{formatCurrency(row.total)}</span>
                        </div>
                      ))}
                      {(revenueReport?.byMonth || []).length === 0 ? <div className="text-sm text-gray-500">Sin datos</div> : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'classes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase">Dias y Horarios</h2>
                <button onClick={openNewClass} className="btn-bootcamp flex items-center gap-2"><Plus className="w-4 h-4" />Agregar Clase</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {classDayFilters.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedClassDay(day)}
                    className={`px-3 py-3 border text-sm font-bold uppercase transition-colors ${
                      selectedClassDay === day
                        ? 'bg-bootcamp-orange text-white border-bootcamp-orange'
                        : 'border-white/20 text-gray-300 hover:border-bootcamp-orange hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {selectedClassDay === 'Todos' ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3 items-start">
                  {orderedDaysForAllView.map((day) => (
                    <div key={day} className="card-bootcamp p-4 space-y-3 h-fit">
                      <h3 className="text-sm uppercase font-bold text-bootcamp-orange">{day}</h3>
                      {(classesByDay[day] || []).length > 0 ? (
                        <div className="space-y-2">
                          {(classesByDay[day] || []).map((cls) => (
                            <div key={cls.id} className="bg-bootcamp-black border border-white/10 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-bold text-base">{cls.time} - {cls.name}</h3>
                                  <p className="text-gray-400 text-xs">{cls.trainer}</p>
                                  <p className="text-xs text-gray-500 mt-1">{cls.booked}/{cls.spots} cupos</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button onClick={() => openEditClass(cls)} className="px-2 py-1 border border-white/20 hover:border-bootcamp-orange flex items-center gap-1 text-xs"><Edit2 className="w-3 h-3" />Editar</button>
                                  <button onClick={() => toggleClassStatus(cls)} className={`px-2 py-1 border flex items-center gap-1 text-xs ${cls.active ? 'border-red-500/40 text-red-400' : 'border-green-500/40 text-green-400'}`}>
                                    {cls.active ? <X className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                                    {cls.active ? 'Cancelar' : 'Reactivar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="card-bootcamp p-5 text-sm text-gray-400">
                          No hay clases cargadas para {day}.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {(classesByDay[selectedClassDay] || []).map((cls) => (
                    <div key={cls.id} className="card-bootcamp p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg">{cls.name}</h3>
                          <p className="text-gray-400 text-sm">{cls.day} {cls.time} - {cls.trainer}</p>
                          <p className="text-xs text-gray-500 mt-1">{cls.booked}/{cls.spots} cupos</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditClass(cls)} className="px-3 py-2 border border-white/20 hover:border-bootcamp-orange flex items-center gap-2"><Edit2 className="w-4 h-4" />Editar</button>
                          <button onClick={() => toggleClassStatus(cls)} className={`px-3 py-2 border flex items-center gap-2 ${cls.active ? 'border-red-500/40 text-red-400' : 'border-green-500/40 text-green-400'}`}>
                            {cls.active ? <X className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                            {cls.active ? 'Cancelar' : 'Reactivar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(classesByDay[selectedClassDay] || []).length === 0 ? (
                    <div className="card-bootcamp p-5 text-sm text-gray-400">
                      No hay clases cargadas para {selectedClassDay}.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeView === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase">Landing: Logo, Precios y Anuncios</h2>
              <div className="card-bootcamp p-6 space-y-4">
                <label className="text-xs uppercase text-gray-400 font-bold">Subir logo (PNG o SVG)</label>
                <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={onLogoFileChange} className="w-full input-bootcamp px-4 py-3 text-white" />
                <label className="text-xs uppercase text-gray-400 font-bold">O pegar URL del logo</label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://.../logo.svg" className="w-full input-bootcamp px-4 py-3 text-white" />
                {logoUrl ? <img src={logoUrl} alt="Logo preview" className="h-16 w-auto object-contain" /> : <BrandLogo size="sm" />}
              </div>

              <div className="flex justify-end">
                <button onClick={addPlan} className="px-3 py-2 border border-white/20 hover:border-bootcamp-orange flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar plan
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan, idx) => (
                  <div key={plan.id || idx} className="card-bootcamp p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase text-gray-400">Plan #{idx + 1}</label>
                      <button
                        onClick={() => removePlan(idx)}
                        disabled={plans.length <= 1}
                        className="px-2 py-1 border border-red-500/40 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Eliminar
                      </button>
                    </div>
                    <input value={plan.name} onChange={(e) => updatePlan(idx, { name: e.target.value })} className="w-full input-bootcamp px-3 py-2 text-white font-bold uppercase" />
                    <input value={plan.id || ''} onChange={(e) => updatePlan(idx, { id: e.target.value })} className="w-full input-bootcamp px-3 py-2 text-white text-xs" placeholder="ID interno del plan" />
                    <input value={plan.description || ''} onChange={(e) => updatePlan(idx, { description: e.target.value })} className="w-full input-bootcamp px-3 py-2 text-white text-sm" placeholder="Descripcion" />
                    <input type="number" value={plan.price} onChange={(e) => updatePlan(idx, { price: Number(e.target.value) })} className="w-full input-bootcamp px-3 py-2 text-white" />
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <input
                        type="radio"
                        name="popular-plan"
                        checked={Boolean(plan.popular)}
                        onChange={() => setPopularPlan(idx)}
                      />
                      Marcar como plan popular
                    </label>
                    <textarea
                      value={(plan.features || []).join('\n')}
                      onChange={(e) => updatePlan(idx, { features: e.target.value.split('\n').map((f) => f.trim()).filter(Boolean) })}
                      className="w-full input-bootcamp px-3 py-2 text-white text-sm resize-none"
                      rows={4}
                      placeholder="Una feature por linea"
                    />
                  </div>
                ))}
              </div>

              <div className="card-bootcamp p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase">Anuncios</h3>
                  <button onClick={addAnnouncement} className="px-3 py-2 border border-white/20 hover:border-bootcamp-orange flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar anuncio
                  </button>
                </div>

                <div className="space-y-4">
                  {announcements.map((ad, idx) => (
                    <div key={ad.id || idx} className="border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400 uppercase">Anuncio #{idx + 1}</div>
                        <button
                          onClick={() => removeAnnouncement(idx)}
                          disabled={announcements.length <= 1}
                          className="px-2 py-1 border border-red-500/40 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          value={ad.id || ''}
                          onChange={(e) => updateAnnouncement(idx, { id: e.target.value })}
                          className="w-full input-bootcamp px-3 py-2 text-white text-sm"
                          placeholder="ID del anuncio"
                        />
                        <input
                          value={ad.sector || ''}
                          onChange={(e) => updateAnnouncement(idx, { sector: e.target.value })}
                          className="w-full input-bootcamp px-3 py-2 text-white text-sm"
                          placeholder="Sector (ej: hero-right)"
                        />
                      </div>

                      <input
                        value={ad.title || ''}
                        onChange={(e) => updateAnnouncement(idx, { title: e.target.value })}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                        placeholder="Titulo del anuncio"
                      />

                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          value={ad.linkUrl || ''}
                          onChange={(e) => updateAnnouncement(idx, { linkUrl: e.target.value })}
                          className="w-full input-bootcamp px-3 py-2 text-white text-sm"
                          placeholder="URL destino (opcional)"
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={Boolean(ad.active)}
                            onChange={(e) => updateAnnouncement(idx, { active: e.target.checked })}
                          />
                          Activo
                        </label>
                      </div>

                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        onChange={(e) => onAnnouncementImageChange(idx, e)}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                      <input
                        value={ad.imageUrl || ''}
                        onChange={(e) => updateAnnouncement(idx, { imageUrl: e.target.value })}
                        className="w-full input-bootcamp px-3 py-2 text-white text-sm"
                        placeholder="O pegar URL/base64 de imagen"
                      />
                      {ad.imageUrl ? (
                        <img src={ad.imageUrl} alt={ad.title || 'Anuncio'} className="w-full max-h-40 object-cover border border-white/10" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={saveSiteConfig} disabled={saving} className="btn-bootcamp w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Cambios en Landing'}
              </button>
            </div>
          )}

          {activeView === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black uppercase">Alumnos</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewStudentModal}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-bootcamp-orange text-white text-sm font-semibold hover:bg-orange-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nuevo Alumno</span>
                  </button>
                  <button
                    onClick={() => {
                      setExcelImportCompleted(false);
                      setExcelImportStepIndex(0);
                      setExcelImportProgressCount(0);
                      setShowExcelImportModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-white/20 text-sm text-gray-200 hover:border-bootcamp-orange/60 hover:text-white"
                  >
                    <Upload className="w-4 h-4 text-bootcamp-orange" />
                    <span>Importar Excel</span>
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="border border-red-500/30 bg-red-500/10 p-4">
                  <div className="text-xs uppercase text-red-200">Vencidos hoy</div>
                  <div className="text-2xl font-black text-red-300">{memberPaymentSummary.expiredTodayOrPast}</div>
                </div>
                <div className="border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="text-xs uppercase text-amber-200">Vencen esta semana</div>
                  <div className="text-2xl font-black text-amber-300">{memberPaymentSummary.expiringThisWeek}</div>
                </div>
                <div className="border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="text-xs uppercase text-blue-200">Pagos pendientes</div>
                  <div className="text-2xl font-black text-blue-300">{memberPaymentSummary.pendingPayments}</div>
                </div>
              </div>
              <div className="card-bootcamp overflow-hidden">
                <div className="px-4 pt-4 border-b border-white/10 bg-bootcamp-dark/20">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Todos', count: memberQuickTabCounts.all },
                      { id: 'active', label: 'Activos', count: memberQuickTabCounts.active },
                      { id: 'inactive', label: 'Inactivos', count: memberQuickTabCounts.inactive },
                      { id: 'no_payment', label: 'Sin pago', count: memberQuickTabCounts.no_payment }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMemberQuickTab(tab.id)}
                        className={`px-3 py-2 text-xs uppercase border ${memberQuickTab === tab.id ? 'bg-bootcamp-orange text-white border-bootcamp-orange' : 'border-white/20 text-gray-300 hover:border-bootcamp-orange/60'}`}
                      >
                        {`${tab.label} (${tab.count})`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-b border-white/10 bg-bootcamp-dark/40">
                  <div className="grid md:grid-cols-3 gap-3">
                    <select
                      value={memberStatusFilter}
                      onChange={(e) => setMemberStatusFilter(e.target.value)}
                      className="w-full input-bootcamp px-3 py-2 text-white"
                    >
                      <option value="all">Estado: All</option>
                      <option value="Al día">Al día</option>
                      <option value="Sin pago">Sin pago</option>
                      <option value="Por vencer">Por vencer</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                    <select
                      value={memberPlanFilter}
                      onChange={(e) => setMemberPlanFilter(e.target.value)}
                      className="w-full input-bootcamp px-3 py-2 text-white"
                    >
                      <option value="all">Plan: All</option>
                      {memberPlanOptions.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Buscar por nombre, email o cédula"
                      className="w-full input-bootcamp px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <table className="w-full">
                  <thead className="bg-bootcamp-dark border-b border-white/5">
                    <tr>
                      <th className="text-left p-2 text-xs uppercase text-gray-400">Nombre</th>
                      <th className="text-left p-2 text-xs uppercase text-gray-400">Cedula + Fecha Alta</th>
                      <th className="text-left p-2 text-xs uppercase text-gray-400 min-w-[170px]">Plan + Estado</th>
                      <th className="text-left p-2 text-xs uppercase text-gray-400">Pagos</th>
                      <th className="text-left p-2 text-xs uppercase text-gray-400">Roles</th>
                      <th className="text-left p-2 text-xs uppercase text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedMembers.map((m) => {
                      const statusBadge = getStatusBadge(m);
                      const expirationDate = m?.expirationDate || resolveExpirationDate(m);
                      const documentNumber = String(m.documentNumber || m.cedula || '').trim();
                      const activeRoles = Array.isArray(m.roles) && m.roles.length > 0 ? m.roles : ['user'];
                      const roleOptions = ['user', 'trainer', 'admin'];
                      const isRoleConfirmOpen = roleChangeConfirm?.memberId === m.id;
                      return (
                      <tr key={m.id}>
                        <td className="p-2"><div className="font-medium">{m.fullName || m.name}</div></td>
                        <td className="p-2 text-sm">
                          {documentNumber ? (
                            <div className="font-semibold text-white">{documentNumber}</div>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-red-400 font-semibold">
                              Falta cedula
                              <button
                                onClick={() => quickEditMemberCedula(m)}
                                className="text-bootcamp-orange hover:text-orange-300"
                                title="Agregar cédula"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          )}
                          <div className="text-xs text-gray-500 mt-1">{formatDateLabel(m?.fechaAlta || '-')}</div>
                        </td>
                        <td className="p-2 text-sm min-w-[170px]">
                          <div className="flex flex-col items-start">
                            <span className="inline-flex items-center px-2 py-1 text-xs uppercase tracking-wide border rounded-full bg-[#1e3a5f]/70 border-slate-500/60 text-white font-bold mb-2">
                              {formatPlanBadgeLabel(m.plan?.name || m.plan)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs uppercase tracking-wide border rounded-full ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          <div className="text-gray-300">Ultimo: {formatDateLabel(m?.lastPaymentDate || '-')}</div>
                          <div className={getDateHighlightClass(expirationDate)}>Vence: {formatDateLabel(expirationDate)}</div>
                        </td>
                        <td className="p-2">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {roleOptions.map((role) => {
                                const isActive = activeRoles.includes(role);
                                return (
                                  <button
                                    key={role}
                                    onClick={() => beginRoleChange(m, role)}
                                    className={`px-2 py-1 text-[11px] uppercase border transition ${getRoleBadgeClass(role, isActive)}`}
                                  >
                                    {role}
                                  </button>
                                );
                              })}
                            </div>
                            {isRoleConfirmOpen ? (
                              <div className="border border-white/15 bg-black/40 p-2 text-xs space-y-2">
                                <div className="text-gray-200">¿Cambiar rol de {roleChangeConfirm.memberName}?</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={confirmRoleChange}
                                    disabled={roleChangeSaving}
                                    className="px-2 py-1 border border-bootcamp-orange/60 text-bootcamp-orange disabled:opacity-50"
                                  >
                                    {roleChangeSaving ? 'Guardando...' : 'Confirmar'}
                                  </button>
                                  <button
                                    onClick={() => setRoleChangeConfirm(null)}
                                    disabled={roleChangeSaving}
                                    className="px-2 py-1 border border-white/20 text-gray-300 disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="grid grid-cols-2 gap-1 w-[206px]">
                            <TooltipActionButton
                              wrapperClassName="w-[100px]"
                              tooltip="Ver ficha completa del alumno: pagos, asistencias, rutinas y más"
                              onClick={() => loadMemberDetail(m)}
                              className="w-[100px] h-7 text-xs border border-blue-500/40 text-blue-400"
                            >
                              Detalle
                            </TooltipActionButton>
                            {m.status !== 'active' ? (
                              <TooltipActionButton
                                wrapperClassName="w-[100px]"
                                tooltip="Reactiva al alumno y restaura su acceso"
                                onClick={() => toggleUserStatus(m, 'activate')}
                                className="w-[100px] h-7 text-xs border border-green-500/40 text-green-400"
                              >
                                Activar
                              </TooltipActionButton>
                            ) : (
                              <TooltipActionButton
                                wrapperClassName="w-[100px]"
                                tooltip="Desactiva al alumno. No podrá acceder a la app ni reservar clases"
                                onClick={() => toggleUserStatus(m, 'deactivate')}
                                className="w-[100px] h-7 text-xs border border-red-500/40 text-red-400"
                              >
                                Desactivar
                              </TooltipActionButton>
                            )}
                            <TooltipActionButton
                              wrapperClassName="w-[100px]"
                              tooltip="Gestionar acceso a la app: invitar, revocar o restablecer contraseña"
                              onClick={() => activateUserAccess(m)}
                              disabled={activatingUserId === m.id}
                              className="w-[100px] h-7 text-xs border border-bootcamp-orange/60 text-bootcamp-orange disabled:opacity-50"
                            >
                              {activatingUserId === m.id ? 'Activando...' : 'Acceso'}
                            </TooltipActionButton>
                            <TooltipActionButton
                              wrapperClassName="w-[100px]"
                              tooltip="Suspende temporalmente al alumno por falta de pago u otro motivo"
                              onClick={() => toggleUserStatus(m, 'suspend')}
                              className="w-[100px] h-7 text-xs border border-yellow-500/40 text-yellow-400"
                            >
                              Suspender
                            </TooltipActionButton>
                          </div>
                          <div
                            className="text-[11px] text-gray-400 mt-2"
                            title={m.lastReminderSent ? `Último aviso: ${formatDateLabel(m.lastReminderSent)}` : 'Sin avisos enviados'}
                          >
                            {m.lastReminderSent ? `Último aviso: ${formatDateLabel(m.lastReminderSent)}` : 'Sin avisos enviados'}
                          </div>
                        </td>
                        {/* removed separate next payment column (merged into PAGOS) */}
                        {/* removed standalone status/plan/date columns (merged) */}
                        {/* keep functionality, compact layout */}
                      </tr>
                      );
                    })}
                    {!paginatedMembers.length ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-gray-400">No hay alumnos para los filtros seleccionados.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="p-3 border-t border-white/10 bg-bootcamp-dark/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">{membersPaginationLabel}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMembersPage((prev) => Math.max(1, prev - 1))}
                      disabled={membersPage <= 1}
                      className="px-2 py-1 text-xs border border-white/20 text-gray-300 disabled:opacity-40"
                    >
                      ? Anterior
                    </button>
                    {Array.from({ length: membersTotalPages }, (_, idx) => idx + 1)
                      .filter((page) => page === 1 || page === membersTotalPages || Math.abs(page - membersPage) <= 1)
                      .map((page, idx, arr) => (
                        <React.Fragment key={`members-page-${page}`}>
                          {idx > 0 && arr[idx - 1] !== page - 1 ? <span className="px-1 text-xs text-gray-500">...</span> : null}
                          <button
                            onClick={() => setMembersPage(page)}
                            className={`w-7 h-7 text-xs rounded-full border ${membersPage === page ? 'bg-bootcamp-orange border-bootcamp-orange text-white' : 'border-white/20 text-gray-300'}`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      onClick={() => setMembersPage((prev) => Math.min(membersTotalPages, prev + 1))}
                      disabled={membersPage >= membersTotalPages}
                      className="px-2 py-1 text-xs border border-white/20 text-gray-300 disabled:opacity-40"
                    >
                      Siguiente ?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'routines' && (
            <AdminRoutines
              apiRequest={apiRequest}
              members={members}
              onNotify={({ message, type }) => {
                if (type === 'error') {
                  setError(message || 'Error en rutinas');
                } else {
                  setSuccess(message || 'Operacion realizada');
                }
              }}
            />
          )}

          {activeView === 'communications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase">Comunicaciones</h2>
                <div className="text-sm text-gray-400">
                  Destinatarios: {communicationTargets.length}
                </div>
              </div>

              <div className="card-bootcamp p-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-2">Plantilla</label>
                    <select
                      value={commTemplate}
                      onChange={(e) => setCommTemplate(e.target.value)}
                      className="w-full input-bootcamp px-3 py-2 text-white"
                    >
                      <option value="payment">Cobro de deuda</option>
                      <option value="welcome">Bienvenida</option>
                      <option value="custom">Mensaje libre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-gray-400 mb-2">Filtro de usuarios</label>
                    <select
                      value={commScope}
                      onChange={(e) => {
                        setCommScope(e.target.value);
                        setSelectedCommUsers([]);
                      }}
                      className="w-full input-bootcamp px-3 py-2 text-white"
                    >
                      <option value="debt">Con deuda</option>
                      <option value="active">Activos</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>
                </div>

                {commTemplate === 'payment' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-gray-400 mb-2">Monto</label>
                      <input
                        type="number"
                        min="0"
                        value={commAmount}
                        onChange={(e) => setCommAmount(e.target.value)}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-gray-400 mb-2">Meses adeudados</label>
                      <input
                        type="number"
                        min="1"
                        value={commMonthsDue}
                        onChange={(e) => setCommMonthsDue(e.target.value)}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-2">Mensaje adicional</label>
                  <textarea
                    rows={4}
                    value={commMessage}
                    onChange={(e) => setCommMessage(e.target.value)}
                    className="w-full input-bootcamp px-3 py-2 text-white resize-none"
                    placeholder="Opcional"
                  />
                </div>

                <button onClick={sendCommunication} disabled={saving} className="btn-bootcamp flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {saving ? 'Enviando...' : 'Enviar ahora'}
                </button>
              </div>

              <div className="card-bootcamp p-5">
                <h3 className="text-lg font-bold uppercase mb-3">Seleccion manual de destinatarios</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {communicationUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCommUsers.includes(user.id)}
                        onChange={() => toggleCommunicationUser(user.id)}
                      />
                      <span>{user.name}</span>
                      <span className="text-gray-500">{user.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              {lastCommResult && (
                <div className="card-bootcamp p-5 space-y-2">
                  <h3 className="text-lg font-bold uppercase">Ultimo envio</h3>
                  <div className="text-sm text-gray-300">
                    Enviados: {lastCommResult.sent}/{lastCommResult.total}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed left-0 top-0 bottom-0 w-72 bg-bootcamp-gray z-50 lg:hidden">
              <div className="p-4 flex justify-between items-center border-b border-white/5">
                <span className="font-black uppercase">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <nav className="p-4 space-y-1">
                {['overview', 'classes', 'routines', 'settings', 'members', 'communications'].map((id) => (
                  <button key={id} onClick={() => { setActiveView(id); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 ${activeView === id ? 'bg-bootcamp-orange text-white' : 'text-gray-400'}`}>
                    {id}
                  </button>
                ))}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/supervision'); }}
                  className="w-full text-left px-4 py-3 text-gray-400"
                >
                  supervision
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed right-4 top-4 z-[70] border border-green-500/40 bg-green-500/15 text-green-200 px-4 py-3 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMemberDetailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-bootcamp-gray border border-white/10">
              <div className="sticky top-0 bg-bootcamp-gray border-b border-white/10 p-4 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold uppercase">Detalle de Alumno</h3>
                <button
                  onClick={() => {
                    setShowMemberDetailModal(false);
                    setMemberDetail(null);
                    setMemberDetailTab('summary');
                    setMemberSummaryEditing(false);
                    setPaymentFormVisible(false);
                    setMemberPayments([]);
                    setMemberPaymentsSummary({
                      totalPaid: 0,
                      lastPayment: null,
                      expirationDate: null,
                      passesRemaining: 0,
                      planPassCount: 0
                    });
                    setPaymentForm({
                      planId: '',
                      basePrice: 0,
                      discount: 0,
                      total: 0,
                      paymentMethod: 'Efectivo',
                      paymentDate: getTodayIsoDate(),
                      reference: '',
                      notes: ''
                    });
                    setMemberPlanChanging(false);
                    setSelectedMemberPlanId('');
                    setAppInviteCedula('');
                    setAppAccessSaving(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {memberDetailLoading && (
                  <div className="py-10 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-bootcamp-orange border-t-transparent rounded animate-spin" />
                  </div>
                )}

                {!memberDetailLoading && memberDetail && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'summary', label: 'Resumen' },
                        { id: 'payments', label: 'Pagos' },
                        { id: 'attendance', label: 'Asistencias' },
                        { id: 'bookings', label: 'Reservas' },
                        { id: 'routines', label: 'Rutinas', tone: 'training' },
                        { id: 'nutrition', label: 'Nutricion', tone: 'nutrition' },
                        { id: 'notes', label: 'Notas' },
                        { id: 'app', label: 'App' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setMemberDetailTab(tab.id)}
                          className={`px-3 py-2 text-xs uppercase border ${
                            memberDetailTab === tab.id
                              ? tab.tone === 'nutrition'
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-bootcamp-orange text-white border-bootcamp-orange'
                              : tab.tone === 'nutrition'
                              ? 'border-green-500/40 text-green-300 hover:bg-green-500/10'
                              : 'border-white/20 text-gray-300 hover:border-bootcamp-orange'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {memberDetailTab === 'summary' && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="card-bootcamp p-4 text-center">
                            <div className="text-2xl font-black text-bootcamp-orange">{memberDetail.attendances?.total || 0}</div>
                            <div className="text-xs text-gray-500 uppercase">Asistencias</div>
                          </div>
                          <div className="card-bootcamp p-4 text-center">
                            <div className="text-2xl font-black text-green-400">{memberDetail.attendances?.rate || 0}%</div>
                            <div className="text-xs text-gray-500 uppercase">Tasa</div>
                          </div>
                          <div className="card-bootcamp p-4 text-center">
                            <div className="text-2xl font-black text-blue-400">{formatCurrency(memberDetail.payments?.totalPaid)}</div>
                            <div className="text-xs text-gray-500 uppercase">Total Pagado</div>
                          </div>
                          <div className="card-bootcamp p-4 text-center">
                            <div className="text-2xl font-black text-red-400">{formatCurrency(memberDetail.payments?.pendingAmount)}</div>
                            <div className="text-xs text-gray-500 uppercase">Pendiente</div>
                          </div>
                        </div>

                        <div className="bg-bootcamp-black border border-white/10 p-4 space-y-3">
                          <div className="flex items-center justify-end gap-2">
                            {!memberSummaryEditing ? (
                              <button
                                onClick={startMemberSummaryEdit}
                                className="px-3 py-2 text-xs uppercase border border-white/20 hover:border-bootcamp-orange"
                              >
                                Editar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveMemberSummary}
                                  disabled={memberSummarySaving}
                                  className="px-3 py-2 text-xs uppercase bg-green-600 text-white disabled:opacity-60"
                                >
                                  {memberSummarySaving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={cancelMemberSummaryEdit}
                                  disabled={memberSummarySaving}
                                  className="px-3 py-2 text-xs uppercase border border-white/20 hover:border-red-500 disabled:opacity-60"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-white/10 bg-bootcamp-dark/30 p-4 space-y-3">
                              <div className="text-sm font-semibold uppercase tracking-wide text-gray-200">Datos Personales</div>
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Nombre</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.nombre}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, nombre: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.nombre || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Apellido</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.apellido}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, apellido: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.apellido || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Cedula</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.cedula}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, cedula: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.cedula || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Fecha de nacimiento</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      type="date"
                                      value={memberSummaryForm.birthDate ? String(memberSummaryForm.birthDate).slice(0, 10) : ''}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{formatDateLabel(memberSummaryForm.birthDate || '-')}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Telefono</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.telefono}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, telefono: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.telefono || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Email</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      type="email"
                                      value={memberSummaryForm.email}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, email: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.email || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Fecha de alta</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      type="date"
                                      value={memberSummaryForm.fechaAlta ? String(memberSummaryForm.fechaAlta).slice(0, 10) : ''}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, fechaAlta: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{formatDateLabel(memberSummaryForm.fechaAlta || '-')}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="border border-white/10 border-l-4 border-l-orange-500/70 bg-bootcamp-dark/30 p-4 space-y-3">
                              <div className="text-sm font-semibold uppercase tracking-wide text-gray-200 flex items-center gap-2">
                                <span>Emergencia / Salud</span>
                                {emergencyInfoMissing ? <span className="text-amber-300" title="Faltan datos de emergencia">??</span> : null}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Cobertura medica</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.emergencyMedical}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, emergencyMedical: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.emergencyMedical || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Contacto de emergencia - Nombre</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.emergencyContactName}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.emergencyContactName || '-'}</div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-gray-400 text-sm mb-1">Contacto de emergencia - Telefono</div>
                                  {memberSummaryEditing ? (
                                    <input
                                      value={memberSummaryForm.emergencyContactPhone}
                                      onChange={(e) => setMemberSummaryForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                                      className="w-full input-bootcamp px-3 py-2 text-white"
                                    />
                                  ) : (
                                    <div>{memberSummaryForm.emergencyContactPhone || '-'}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm mb-1">Plan</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>{memberDetail.user?.plan || '-'}</span>
                                {!memberPlanChanging ? (
                                  <button
                                    onClick={startMemberPlanChange}
                                    disabled={memberPlansLoading || memberPlanSaving}
                                    className="px-2 py-1 text-[11px] uppercase border border-white/20 hover:border-bootcamp-orange disabled:opacity-60"
                                  >
                                    {memberPlansLoading ? 'Cargando...' : 'Cambiar Plan'}
                                  </button>
                                ) : null}
                              </div>

                              {memberPlanChanging ? (
                                <div className="space-y-2 border border-white/10 p-3">
                                  <select
                                    value={selectedMemberPlanId}
                                    onChange={(e) => setSelectedMemberPlanId(e.target.value)}
                                    className="w-full input-bootcamp px-3 py-2 text-white"
                                  >
                                    {availableMemberPlans.map((plan) => {
                                      const planId = String(plan.id || plan._id);
                                      return (
                                        <option key={planId} value={planId}>
                                          {plan.name} - {plan.passCount ?? '-'} pases - {formatCurrency(plan.price)}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={confirmMemberPlanChange}
                                      disabled={memberPlanSaving || !selectedMemberPlanId}
                                      className="px-3 py-2 text-xs uppercase bg-green-600 text-white disabled:opacity-60"
                                    >
                                      {memberPlanSaving ? 'Guardando...' : 'Confirmar'}
                                    </button>
                                    <button
                                      onClick={cancelMemberPlanChange}
                                      disabled={memberPlanSaving}
                                      className="px-3 py-2 text-xs uppercase border border-white/20 hover:border-red-500 disabled:opacity-60"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {memberDetailTab === 'payments' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                        <div className="grid md:grid-cols-4 gap-3">
                          <div className="card-bootcamp p-3">
                            <div className="text-xs uppercase text-gray-500">Total pagado</div>
                            <div className="text-lg font-black text-green-400">{formatCurrency(memberPaymentsSummary.totalPaid)}</div>
                          </div>
                          <div className="card-bootcamp p-3">
                            <div className="text-xs uppercase text-gray-500">Ultimo pago</div>
                            <div className="text-sm font-bold">
                              {memberPaymentsSummary.lastPayment?.date ? new Date(memberPaymentsSummary.lastPayment.date).toLocaleDateString() : '-'}
                            </div>
                            <div className="text-sm text-green-300">{formatCurrency(memberPaymentsSummary.lastPayment?.amount || 0)}</div>
                          </div>
                          <div className="card-bootcamp p-3">
                            <div className="text-xs uppercase text-gray-500">Vencimiento actual</div>
                            <div className="text-sm font-bold">
                              {memberPaymentsSummary.expirationDate ? new Date(memberPaymentsSummary.expirationDate).toLocaleDateString() : '-'}
                            </div>
                          </div>
                          <div className="card-bootcamp p-3">
                            <div className="text-xs uppercase text-gray-500">Pases restantes</div>
                            <div className="text-sm font-bold">
                              {memberPaymentsSummary.passesRemaining ?? 0}
                              {memberPaymentsSummary.planPassCount === null ? ' / Ilimitado' : ` / ${memberPaymentsSummary.planPassCount ?? 0}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          {!paymentFormVisible ? (
                            <button
                              onClick={openPaymentForm}
                              className="px-3 py-2 text-xs uppercase border border-white/20 hover:border-bootcamp-orange"
                            >
                              Registrar Pago
                            </button>
                          ) : (
                            <button
                              onClick={() => setPaymentFormVisible(false)}
                              disabled={paymentSaving}
                              className="px-3 py-2 text-xs uppercase border border-white/20 hover:border-red-500 disabled:opacity-60"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>

                        {paymentFormVisible && (
                          <div className="border border-white/10 p-4 space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs uppercase text-gray-400 block mb-1">Plan</label>
                                <select
                                  value={paymentForm.planId}
                                  onChange={(e) => {
                                    const planId = e.target.value;
                                    const selectedPlan = paymentPlansCatalog.find((p) => String(p.id || p._id) === String(planId));
                                    const basePrice = Number(selectedPlan?.price || 0);
                                    const discount = Number(paymentForm.discount || 0);
                                    const total = Math.max(0, basePrice - (basePrice * discount) / 100);
                                    setPaymentForm((prev) => ({ ...prev, planId, basePrice, total }));
                                  }}
                                  className="w-full input-bootcamp px-3 py-2 text-white"
                                >
                                  {paymentPlansCatalog.map((plan) => {
                                    const planId = String(plan.id || plan._id);
                                    return (
                                      <option key={planId} value={planId}>
                                        {plan.name} - {formatCurrency(plan.price)}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs uppercase text-gray-400 block mb-1">Descuento</label>
                                <select
                                  value={paymentForm.discount}
                                  onChange={(e) => {
                                    const discount = Number(e.target.value || 0);
                                    const basePrice = Number(paymentForm.basePrice || 0);
                                    const total = Math.max(0, basePrice - (basePrice * discount) / 100);
                                    setPaymentForm((prev) => ({ ...prev, discount, total }));
                                  }}
                                  className="w-full input-bootcamp px-3 py-2 text-white"
                                >
                                  <option value={0}>0%</option>
                                  <option value={10}>10%</option>
                                  <option value={20}>20%</option>
                                  <option value={30}>30%</option>
                                  <option value={40}>40%</option>
                                  <option value={50}>50%</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs uppercase text-gray-400 block mb-1">Metodo de pago</label>
                                <select
                                  value={paymentForm.paymentMethod}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                  className="w-full input-bootcamp px-3 py-2 text-white"
                                >
                                  <option value="Efectivo">Efectivo</option>
                                  <option value="Mercado Pago">Mercado Pago</option>
                                  <option value="Transferencia">Transferencia</option>
                                  <option value="Tarjeta">Tarjeta</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs uppercase text-gray-400 block mb-1">Fecha de pago</label>
                                <input
                                  type="date"
                                  value={paymentForm.paymentDate}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                                  className="w-full input-bootcamp px-3 py-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs uppercase text-gray-400 block mb-1">Referencia / Comprobante</label>
                                <input
                                  type="text"
                                  value={paymentForm.reference}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                                  className="w-full input-bootcamp px-3 py-2 text-white"
                                />
                              </div>
                            </div>

                            <div className="border border-green-500/30 bg-green-500/10 p-3">
                              <div className="text-xs uppercase text-gray-400 mb-1">Precio base</div>
                              <div className="text-sm text-white mb-2">{formatCurrency(paymentForm.basePrice || 0)}</div>
                              <div className="text-xs uppercase text-gray-400 mb-1">Total a cobrar</div>
                              <div className="text-2xl font-black text-green-300">{formatCurrency(paymentForm.total || 0)}</div>
                            </div>

                            <div>
                              <label className="text-xs uppercase text-gray-400 block mb-1">Notas</label>
                              <textarea
                                rows={3}
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="w-full input-bootcamp px-3 py-2 text-white resize-none"
                              />
                            </div>

                            <button
                              onClick={submitPaymentRegistration}
                              disabled={paymentSaving}
                              className="px-3 py-2 text-xs uppercase bg-green-600 text-white disabled:opacity-60"
                            >
                              {paymentSaving ? 'Guardando...' : 'Guardar Pago'}
                            </button>
                          </div>
                        )}

                        {memberPaymentsLoading ? (
                          <div className="text-sm text-gray-400">Cargando historial de pagos...</div>
                        ) : (
                          <div className="border border-white/10 overflow-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-bootcamp-dark border-b border-white/10">
                                <tr>
                                  <th className="text-left p-3 text-xs uppercase text-gray-400">Fecha</th>
                                  <th className="text-left p-3 text-xs uppercase text-gray-400">Monto</th>
                                  <th className="text-left p-3 text-xs uppercase text-gray-400">Metodo</th>
                                  <th className="text-left p-3 text-xs uppercase text-gray-400">Referencia</th>
                                  <th className="text-left p-3 text-xs uppercase text-gray-400">Registrado por</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10">
                                {memberPayments.map((p) => (
                                  <tr key={p.id}>
                                    <td className="p-3">{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                                    <td className="p-3">{formatCurrency(p.amount)}</td>
                                    <td className="p-3 text-gray-300">{paymentMethodLabel(p.method)}</td>
                                    <td className="p-3 text-gray-300">{p.reference || '-'}</td>
                                    <td className="p-3 uppercase text-xs">{p.registeredBy === 'automatic' ? 'automatico' : 'manual'}</td>
                                  </tr>
                                ))}
                                {memberPayments.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-gray-500">
                                      Sin pagos registrados.
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {memberDetailTab === 'attendance' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4 space-y-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={calendarMonth}
                            onChange={(e) => setCalendarMonth(Number(e.target.value))}
                            className="bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                          >
                            {Array.from({ length: 12 }).map((_, idx) => (
                              <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={calendarYear}
                            onChange={(e) => setCalendarYear(Number(e.target.value) || new Date().getFullYear())}
                            className="w-28 bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                          />
                          <button
                            onClick={() => selectedMember && loadAttendanceCalendar(selectedMember.id, calendarMonth, calendarYear)}
                            className="px-3 py-2 border border-white/20 hover:border-bootcamp-orange text-xs uppercase"
                          >
                            Actualizar
                          </button>
                        </div>

                        {calendarLoading ? (
                          <div className="text-sm text-gray-400">Cargando calendario...</div>
                        ) : (
                          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                            {Object.entries(attendanceCalendar)
                              .sort(([a], [b]) => (a > b ? -1 : 1))
                              .map(([date, entries]) => (
                                <div key={date} className="border border-white/10 p-3">
                                  <div className="text-sm font-bold mb-2">{date}</div>
                                  <div className="space-y-1">
                                    {entries.map((entry, idx) => (
                                      <div key={`${date}-${idx}`} className="flex justify-between text-xs border-b border-white/10 pb-1 last:border-b-0">
                                        <span>{entry.class} {entry.time ? `- ${entry.time}` : ''}</span>
                                        <span className={entry.status === 'present' ? 'text-green-400 uppercase' : 'text-red-400 uppercase'}>
                                          {entry.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            {Object.keys(attendanceCalendar || {}).length === 0 ? (
                              <div className="text-sm text-gray-500">Sin asistencias para el periodo seleccionado.</div>
                            ) : null}
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/10 space-y-2 max-h-[25vh] overflow-y-auto">
                          <div className="text-xs uppercase text-gray-500">Historial reciente</div>
                          {(memberDetail.attendances?.history || []).slice(0, 10).map((a) => (
                            <div key={a._id} className="flex justify-between text-sm border-b border-white/10 pb-2">
                              <span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'}</span>
                              <span>{a.class?.name || 'Clase'}</span>
                              <span className={`uppercase text-xs ${a.status === 'present' ? 'text-green-400' : 'text-red-400'}`}>{a.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {memberDetailTab === 'bookings' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {(memberDetail.bookings || []).map((b) => (
                          <div key={b._id} className="text-sm border-b border-white/10 pb-2">
                            {b.class?.name || 'Clase'} - {b.class?.day} {b.class?.time}
                          </div>
                        ))}
                      </div>
                    )}

                    {memberDetailTab === 'routines' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {(memberDetail.routines || []).map((r) => (
                          <div key={r._id} className="text-sm border-b border-white/10 pb-2">
                            {r.name} - {r.completed ? 'Completada' : 'Pendiente'}
                          </div>
                        ))}
                      </div>
                    )}

                    {memberDetailTab === 'nutrition' && (
                      <div className="bg-bootcamp-black border border-green-500/30 p-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs uppercase text-gray-400 block mb-2">Estado</label>
                            <select
                              value={nutritionForm.status}
                              onChange={(e) => setNutritionForm((prev) => ({ ...prev, status: e.target.value }))}
                              className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                            >
                              <option value="inactive">Inactivo</option>
                              <option value="pending">Pendiente</option>
                              <option value="active">Activo</option>
                              <option value="none">Sin plan</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs uppercase text-gray-400 block mb-2">Calorias diarias</label>
                            <input
                              type="number"
                              value={nutritionForm.dailyCalories}
                              onChange={(e) => setNutritionForm((prev) => ({ ...prev, dailyCalories: e.target.value }))}
                              className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs uppercase text-gray-400 block mb-2">Objetivo</label>
                          <input
                            value={nutritionForm.goal}
                            onChange={(e) => setNutritionForm((prev) => ({ ...prev, goal: e.target.value }))}
                            className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                            placeholder="Ej: Definicion, recomposicion..."
                          />
                        </div>

                        <div>
                          <label className="text-xs uppercase text-gray-400 block mb-2">Notas</label>
                          <textarea
                            rows={3}
                            value={nutritionForm.notes}
                            onChange={(e) => setNutritionForm((prev) => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white resize-none"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold uppercase text-sm">Comidas</h4>
                            <button onClick={addNutritionMeal} className="px-3 py-2 border border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs uppercase">
                              Agregar comida
                            </button>
                          </div>
                          {nutritionForm.meals.map((meal, idx) => (
                            <div key={`meal-${idx}`} className="border border-white/10 p-3 space-y-3">
                              <div className="grid md:grid-cols-3 gap-3">
                                <input
                                  value={meal.title}
                                  onChange={(e) => updateNutritionMeal(idx, { title: e.target.value })}
                                  className="bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                                  placeholder="Nombre"
                                />
                                <input
                                  value={meal.time}
                                  onChange={(e) => updateNutritionMeal(idx, { time: e.target.value })}
                                  className="bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                                  placeholder="Hora"
                                />
                                <input
                                  type="number"
                                  value={meal.calories}
                                  onChange={(e) => updateNutritionMeal(idx, { calories: e.target.value })}
                                  className="bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                                  placeholder="kcal"
                                />
                              </div>
                              <input
                                value={meal.description}
                                onChange={(e) => updateNutritionMeal(idx, { description: e.target.value })}
                                className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white"
                                placeholder="Descripcion"
                              />
                              <textarea
                                rows={3}
                                value={meal.itemsText}
                                onChange={(e) => updateNutritionMeal(idx, { itemsText: e.target.value })}
                                className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white resize-none"
                                placeholder="Items, uno por linea"
                              />
                              <div className="flex justify-end">
                                <button
                                  onClick={() => removeNutritionMeal(idx)}
                                  disabled={nutritionForm.meals.length <= 1}
                                  className="px-3 py-2 text-xs border border-red-500/40 text-red-400 disabled:opacity-40"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={saveMemberNutrition}
                          disabled={nutritionSaving}
                          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase transition-colors disabled:opacity-60"
                        >
                          {nutritionSaving ? 'Guardando plan...' : 'Guardar plan nutricional'}
                        </button>
                      </div>
                    )}

                    {memberDetailTab === 'notes' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4 space-y-3">
                        <textarea
                          rows={3}
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="w-full bg-bootcamp-gray border border-white/10 px-3 py-2 text-white resize-none"
                          placeholder="Escribir nota..."
                        />
                        <button onClick={addAdminNote} className="px-3 py-2 border border-bootcamp-orange text-bootcamp-orange hover:bg-bootcamp-orange/10">Agregar nota</button>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                          {(memberDetail.user?.adminNotes || []).slice().reverse().map((note, idx) => (
                            <div key={idx} className="text-sm border border-white/10 p-2">
                              <div>{note.note}</div>
                              <div className="text-xs text-gray-500 mt-1">{note.createdBy?.name || 'Admin'} - {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {memberDetailTab === 'app' && (
                      <div className="bg-bootcamp-black border border-white/10 p-4">
                        <div className="border border-white/10 bg-bootcamp-dark/30 p-4 space-y-4">
                          <div className="flex items-center gap-2 text-sm uppercase font-semibold tracking-wide text-gray-200">
                            <Smartphone className="w-4 h-4 text-bootcamp-orange" />
                            <span>Acceso a la App</span>
                          </div>

                          {(() => {
                            const user = memberDetail?.user || {};
                            const appAccess = Boolean(user?.appAccess);
                            const invitedAt = user?.invitedAt || null;
                            const cedula = String(user?.documentNumber || user?.cedula || '').trim();
                            const phone = String(user?.phone || '').trim() || '-';
                            const hasAccess = appAccess && Boolean(invitedAt);
                            return (
                              <>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className={`w-2.5 h-2.5 rounded-full ${hasAccess ? 'bg-green-400' : 'bg-gray-500'}`} />
                                  <span className={hasAccess ? 'text-green-300' : 'text-gray-300'}>
                                    {hasAccess ? `Acceso activo desde ${formatDateLabel(invitedAt)}` : 'Sin acceso a la app'}
                                  </span>
                                </div>

                                {!hasAccess && cedula ? (
                                  <button
                                    onClick={() => inviteStudentToApp()}
                                    disabled={appAccessSaving}
                                    className="px-3 py-2 text-xs uppercase bg-bootcamp-orange text-white disabled:opacity-60"
                                  >
                                    ?? Invitar al alumno
                                  </button>
                                ) : null}

                                {!hasAccess && !cedula ? (
                                  <div className="space-y-2">
                                    <button
                                      disabled
                                      className="px-3 py-2 text-xs uppercase bg-bootcamp-orange/40 text-white/70 cursor-not-allowed"
                                    >
                                      ?? Invitar al alumno
                                    </button>
                                    <div className="text-xs text-amber-300">?? Falta la cédula para activar el acceso</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        value={appInviteCedula}
                                        onChange={(e) => setAppInviteCedula(e.target.value)}
                                        placeholder="Ingresar cédula"
                                        className="input-bootcamp px-3 py-2 text-white"
                                      />
                                      <button
                                        onClick={() => inviteStudentToApp({ withCedula: appInviteCedula })}
                                        disabled={appAccessSaving || !String(appInviteCedula || '').trim()}
                                        className="px-3 py-2 text-xs uppercase border border-bootcamp-orange/60 text-bootcamp-orange disabled:opacity-60"
                                      >
                                        Guardar y activar
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                {appAccess ? (
                                  <button
                                    onClick={revokeStudentAppAccess}
                                    disabled={appAccessSaving}
                                    className="px-3 py-2 text-xs uppercase border border-white/20 text-gray-300 hover:border-red-500 disabled:opacity-60"
                                  >
                                    Revocar acceso
                                  </button>
                                ) : null}

                                {appAccess ? (
                                  <div className="border border-green-500/30 bg-green-500/10 p-3 text-sm space-y-1">
                                    <div>Usuario: {phone}</div>
                                    <div>Contraseña inicial: {cedula || '-'}</div>
                                    <div className="text-xs text-green-200">El alumno deberá cambiar su contraseña al primer ingreso</div>
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewStudentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-3xl bg-bootcamp-gray border border-white/10">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-black uppercase">Nuevo Alumno</h3>
                <button onClick={() => closeNewStudentModal()} className="w-8 h-8 flex items-center justify-center hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="border border-white/10 bg-bootcamp-dark/30 p-4 space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-200">Datos Personales</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Nombre *</label>
                      <input
                        value={newStudentForm.nombre}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        className={`w-full input-bootcamp px-3 py-2 text-white ${newStudentErrors.nombre ? 'border-red-500/70' : ''}`}
                      />
                      {newStudentErrors.nombre ? <div className="text-xs text-red-300 mt-1">{newStudentErrors.nombre}</div> : null}
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Apellido *</label>
                      <input
                        value={newStudentForm.apellido}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, apellido: e.target.value }))}
                        className={`w-full input-bootcamp px-3 py-2 text-white ${newStudentErrors.apellido ? 'border-red-500/70' : ''}`}
                      />
                      {newStudentErrors.apellido ? <div className="text-xs text-red-300 mt-1">{newStudentErrors.apellido}</div> : null}
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Teléfono / WhatsApp *</label>
                      <input
                        value={newStudentForm.telefono}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, telefono: e.target.value }))}
                        className={`w-full input-bootcamp px-3 py-2 text-white ${newStudentErrors.telefono ? 'border-red-500/70' : ''}`}
                      />
                      {newStudentErrors.telefono ? <div className="text-xs text-red-300 mt-1">{newStudentErrors.telefono}</div> : null}
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={newStudentForm.email}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Cédula</label>
                      <input
                        value={newStudentForm.cedula}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, cedula: e.target.value }))}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-gray-400 block mb-1">Fecha de nacimiento</label>
                      <input
                        type="date"
                        value={newStudentForm.birthDate}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-gray-400 block mb-1">Plan</label>
                      <select
                        value={newStudentForm.planId}
                        onChange={(e) => setNewStudentForm((prev) => ({ ...prev, planId: e.target.value }))}
                        className="w-full input-bootcamp px-3 py-2 text-white"
                      >
                        <option value="">Sin plan</option>
                        {newStudentPlans.map((plan) => {
                          const planId = String(plan.id || plan._id || '');
                          return (
                            <option key={planId} value={planId}>
                              {`${plan.name} - ${formatCurrency(plan.price)}`}
                            </option>
                          );
                        })}
                      </select>
                      {newStudentPlansLoading ? <div className="text-xs text-gray-500 mt-1">Cargando planes...</div> : null}
                    </div>
                  </div>
                </div>

                <div className="border border-white/10 bg-bootcamp-dark/30">
                  <button
                    onClick={() => setNewStudentHealthOpen((prev) => !prev)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-200">Emergencia / Salud</span>
                    <Plus className={`w-4 h-4 transition-transform ${newStudentHealthOpen ? 'rotate-45 text-bootcamp-orange' : 'text-gray-300'}`} />
                  </button>
                  {newStudentHealthOpen ? (
                    <div className="px-4 pb-4 grid md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase text-gray-400 block mb-1">Cobertura médica</label>
                        <input
                          value={newStudentForm.emergencyMedical}
                          onChange={(e) => setNewStudentForm((prev) => ({ ...prev, emergencyMedical: e.target.value }))}
                          className="w-full input-bootcamp px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-400 block mb-1">Contacto emergencia - Nombre</label>
                        <input
                          value={newStudentForm.emergencyContactName}
                          onChange={(e) => setNewStudentForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                          className="w-full input-bootcamp px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-400 block mb-1">Contacto emergencia - Teléfono</label>
                        <input
                          value={newStudentForm.emergencyContactPhone}
                          onChange={(e) => setNewStudentForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                          className="w-full input-bootcamp px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border border-white/10 bg-bootcamp-dark/30 p-4 space-y-2">
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-200">Acceso a la App</div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={Boolean(newStudentForm.inviteToApp)}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, inviteToApp: e.target.checked }))}
                    />
                    Invitar a la app al crear
                  </label>
                  {newStudentForm.inviteToApp && !String(newStudentForm.cedula || '').trim() ? (
                    <div className="text-xs text-amber-300">?? Ingresá la cédula para poder invitar</div>
                  ) : null}
                  {newStudentForm.inviteToApp && String(newStudentForm.cedula || '').trim() ? (
                    <div className="text-xs text-green-300">
                      Usuario: {String(newStudentForm.telefono || '').trim() || '-'} | Contraseña: {String(newStudentForm.cedula || '').trim()}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  onClick={() => closeNewStudentModal()}
                  disabled={newStudentSaving}
                  className="px-4 py-2 text-xs uppercase border border-white/20 text-gray-300 hover:border-white/40 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitNewStudent}
                  disabled={newStudentSaving}
                  className="px-4 py-2 text-xs uppercase bg-bootcamp-orange text-white disabled:opacity-60"
                >
                  {newStudentSaving ? 'Guardando...' : newStudentForm.inviteToApp ? 'Crear e invitar' : 'Crear alumno'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExcelImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 z-50 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-5xl bg-bootcamp-gray border border-white/10 p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold uppercase flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-bootcamp-orange" />
                    Importacion Inteligente
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Detectamos automaticamente Clientes, Asistencia y Movimientos</p>
                </div>
                {!excelImportSubmitting && !excelImportCompleted ? (
                  <button onClick={closeExcelImportModal} className="w-8 h-8 flex items-center justify-center hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                ) : null}
              </div>

              {excelImportCompleted ? (
                <div className="py-10 flex flex-col items-center text-center space-y-4">
                  {(() => {
                    const clientesErrors = excelImportResult?.clientes?.errors || [];
                    const asistenciaErrors = excelImportResult?.asistencia?.errors || [];
                    const movimientosErrors = excelImportResult?.movimientos?.errors || [];
                    const totalErrors = clientesErrors.length + asistenciaErrors.length + movimientosErrors.length;
                    return (
                      <>
                        <CheckCircle className="w-16 h-16 text-green-400 animate-pulse" />
                        <div className="text-2xl font-black text-green-300">¡Importacion completada!</div>
                        <div className="text-sm text-gray-300">
                          {`${excelImportResult?.clientes?.imported || 0} clientes importados · ${excelImportResult?.clientes?.skipped || 0} omitidos · ${totalErrors} errores`}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={closeExcelImportModal}
                            className="px-5 py-2 text-xs uppercase border border-green-500/40 text-green-300 hover:bg-green-500/10"
                          >
                            ? Cerrar
                          </button>
                          {totalErrors > 0 ? (
                            <button
                              onClick={downloadSmartImportErrorReport}
                              className="px-5 py-2 text-xs uppercase border border-red-500/40 text-red-300 hover:bg-red-500/10"
                            >
                              ? Descargar reporte de errores
                            </button>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <>
              <input ref={excelFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={parseSmartExcelImport} className="hidden" />

              <div
                onDragOver={(e) => { e.preventDefault(); setExcelDropActive(true); }}
                onDragLeave={() => setExcelDropActive(false)}
                onDrop={onExcelDrop}
                onClick={() => excelFileInputRef.current?.click()}
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all ${excelDropActive ? 'border-bootcamp-orange shadow-[0_0_20px_rgba(255,107,0,0.25)]' : 'border-bootcamp-orange/60 hover:border-bootcamp-orange hover:shadow-[0_0_14px_rgba(255,107,0,0.2)]'}`}
              >
                <FileSpreadsheet className="w-10 h-10 text-bootcamp-orange mx-auto mb-3" />
                <div className="text-lg font-semibold">Arrastra tu archivo Excel aqui</div>
                <div className="text-sm text-gray-400 mt-1">o hace click para seleccionar - .xlsx o .csv</div>
                {excelImportFileName ? (
                  <div className="mt-4 inline-flex items-center gap-2 border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>{excelImportFileName}</span>
                    <span className="text-green-200/80">({(excelImportFileSize / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'clientes', label: '?? Clientes' },
                  { id: 'asistencia', label: '?? Asistencia' },
                  { id: 'movimientos', label: '?? Movimientos' }
                ].map((sheet) => (
                  <div
                    key={sheet.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs border transition-all ${excelDetectedSheets[sheet.id] ? 'border-green-500/40 bg-green-500/10 text-green-300 scale-100' : 'border-white/20 text-gray-300 scale-95'}`}
                  >
                    <span>{sheet.label}</span>
                    {excelDetectedSheets[sheet.id] ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                  </div>
                ))}
              </div>

              {excelImportFileName ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {excelImportSheetOrder.map((sheetId) => {
                      const summary = getExcelSheetValidation(sheetId);
                      return (
                        <button
                          key={sheetId}
                          onClick={() => setExcelImportPreviewTab(sheetId)}
                          className={`px-3 py-2 text-xs uppercase border ${excelImportPreviewTab === sheetId ? 'bg-bootcamp-orange text-white border-bootcamp-orange' : 'border-white/20 text-gray-300'}`}
                        >
                          {sheetId}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-sm text-gray-300">
                    {(excelImportData?.[excelImportPreviewTab] || []).length} {excelImportPreviewTab} encontrados
                  </div>

                  <div className="text-xs text-gray-400 border border-white/10 bg-black/20 px-3 py-2">
                    {(() => {
                      const summary = getExcelSheetValidation(excelImportPreviewTab);
                      return `${summary.valid} validos · ${summary.errors.length} con errores`;
                    })()}
                  </div>

                  <div className="border border-white/10 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-bootcamp-dark border-b border-white/10">
                        <tr>
                          {Object.keys((excelImportData?.[excelImportPreviewTab] || [])[0] || {}).map((header) => (
                            <th key={`modal-head-${header}`} className="text-left p-2 uppercase text-gray-400">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(excelImportData?.[excelImportPreviewTab] || []).slice(0, 5).map((row, idx) => (
                          <tr key={`modal-row-${idx}`}>
                            {Object.keys((excelImportData?.[excelImportPreviewTab] || [])[0] || {}).map((header) => (
                              <td key={`modal-cell-${idx}-${header}`} className="p-2">{String(row?.[header] ?? '-')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                {!excelImportSubmitting ? (
                  <button onClick={closeExcelImportModal} className="px-4 py-2 text-xs uppercase border border-white/20 text-gray-300 hover:border-white/40">
                    Cancelar
                  </button>
                ) : null}
                <button
                  onClick={confirmSmartExcelImport}
                  disabled={excelImportSubmitting || !excelImportFileName}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase text-white disabled:opacity-60 ${excelImportSubmitting ? 'bg-bootcamp-orange animate-pulse' : 'bg-bootcamp-orange'}`}
                >
                  {excelImportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {excelImportSubmitting ? excelImportLoadingTexts[excelImportStepIndex] : 'Confirmar importacion'}
                </button>
              </div>
                </>
              )}

              {excelImportSubmitting ? (
                <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
                  <div className="text-center space-y-3 px-6">
                    <Loader2 className="w-14 h-14 text-bootcamp-orange animate-spin mx-auto" />
                    <div className="text-xl font-black uppercase">Importacion en progreso</div>
                    <div className="text-sm text-gray-300">No cierres esta ventana</div>
                    <div className="text-xs text-gray-400">
                      Procesando {Math.min(excelImportProgressCount, excelClientesTotal)} de {excelClientesTotal} clientes...
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExcelImportResultModal && excelImportResult ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-2xl bg-bootcamp-gray border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold uppercase">Resultado de importacion</h3>
                <button onClick={() => setShowExcelImportResultModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-3 text-sm">
                {excelImportSheetOrder.map((sheetId) => {
                  const sheet = excelImportResult?.[sheetId] || {};
                  return (
                    <div key={`result-${sheetId}`} className="border border-white/10 p-3 space-y-1">
                      <div className="text-xs uppercase text-gray-500">{sheetId}</div>
                      <div>Total: {sheet.total || 0}</div>
                      <div className="text-green-300">Importados: {sheet.imported || 0}</div>
                      <div className="text-yellow-300">Omitidos: {sheet.skipped || 0}</div>
                      <div className="text-red-300">Errores: {(sheet.errors || []).length}</div>
                    </div>
                  );
                })}
              </div>

              <button onClick={downloadSmartImportErrorReport} className="px-3 py-2 text-xs uppercase border border-red-500/40 text-red-300 hover:bg-red-500/10">
                Descargar reporte de errores
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showClassModal && (
          <ClassModal
            value={classForm}
            trainers={trainers}
            onChange={setClassForm}
            onClose={() => setShowClassModal(false)}
            onSubmit={saveClass}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;




















