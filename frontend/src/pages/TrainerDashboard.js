import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, CheckCircle, XCircle, Clock,
  TrendingUp, Award, ChevronRight, Search,
  Save, ArrowLeft, Dumbbell, Phone, Mail,
  Activity, Star, FileText, X, Menu, LogOut, UserPlus, Utensils,
  Plus, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import ManualCheckIn from '../components/ManualCheckIn';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const emptyStats = {
  totalStudents: 0,
  todayClasses: 0,
  weekClasses: 0,
  monthlyAttendance: 0
};

const normalizeClass = (cls) => ({
  id: cls?.id || cls?._id,
  name: cls?.name || 'Clase',
  day: cls?.day || '',
  time: cls?.time || '',
  spots: cls?.spots || 0,
  booked: cls?.booked || 0,
  students: Array.isArray(cls?.students) ? cls.students : []
});

const normalizeStudent = (student) => ({
  id: student?.id || student?._id || student?.userId,
  name: student?.name || 'Alumno',
  email: student?.email || '',
  phone: student?.phone || '-',
  totalClasses: student?.totalClasses ?? student?.progress?.totalWorkouts ?? 0,
  attendance: student?.attendance || 'N/A',
  lastClass: student?.lastClass || '-',
  weight: student?.weight ?? student?.stats?.weight ?? null,
  isPresent: Boolean(student?.isPresent)
});

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

const trainerDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const createBlockExercise = (patch = {}) => ({
  id: `block-ex-${Date.now()}-${Math.random()}`,
  source: 'manual',
  exerciseId: '',
  name: '',
  details: '',
  levelBeginner: '',
  levelIntermediate: '',
  levelAdvanced: '',
  ...patch
});

const createBlock = (idx) => ({
  id: `block-${idx + 1}`,
  name: `Bloque ${idx + 1}`,
  mode: 'interval',
  workSeconds: 40,
  restSeconds: 20,
  rounds: 3,
  amrapMinutes: 10,
  restAfterBlockSeconds: idx < 3 ? 60 : 0,
  exercises: []
});

const createClass45Form = () => ({
  name: '',
  description: '',
  day: 'Lunes',
  time: '07:00',
  spots: 12,
  repeatWeekdays: false,
  warmupMinutes: 5,
  cooldownMinutes: 5,
  blocks: [createBlock(0), createBlock(1), createBlock(2), createBlock(3)]
});

const createAmrap45Template = () => ({
  name: 'AMRAP 45 Min',
  description: 'Clase dividida en 3 bloques AMRAP de 15 minutos',
  day: 'Lunes',
  time: '07:00',
  spots: 12,
  repeatWeekdays: false,
  warmupMinutes: 0,
  cooldownMinutes: 0,
  blocks: [
    {
      ...createBlock(0),
      name: 'Bloque 1 (0-15) Pierna + Espalda',
      mode: 'amrap',
      amrapMinutes: 15,
      restAfterBlockSeconds: 0,
      exercises: [
        createBlockExercise({ source: 'manual', name: 'Kettlebell Swings', details: '15 reps' }),
        createBlockExercise({ source: 'manual', name: 'Dominadas', details: '10 reps' }),
        createBlockExercise({ source: 'manual', name: 'Sentadilla Goblet', details: '15 reps' })
      ]
    },
    {
      ...createBlock(1),
      name: 'Bloque 2 (15-30) Empuje + Pierna',
      mode: 'amrap',
      amrapMinutes: 15,
      restAfterBlockSeconds: 0,
      exercises: [
        createBlockExercise({ source: 'manual', name: 'Fondos en paralelas / Flexiones', details: '12 reps' }),
        createBlockExercise({ source: 'manual', name: 'Zancadas', details: '20 reps (10 por pierna)' }),
        createBlockExercise({ source: 'manual', name: 'Swings con pesa rusa', details: '15 reps' })
      ]
    },
    {
      ...createBlock(2),
      name: 'Bloque 3 (30-45) Zona Media + Final',
      mode: 'amrap',
      amrapMinutes: 15,
      restAfterBlockSeconds: 0,
      exercises: [
        createBlockExercise({ source: 'manual', name: 'Elevaciones de piernas en barra', details: '15 reps' }),
        createBlockExercise({ source: 'manual', name: 'Plancha', details: '30 seg' }),
        createBlockExercise({ source: 'manual', name: 'Dominadas', details: '10 reps' }),
        createBlockExercise({ source: 'manual', name: 'Sentadilla con peso', details: '15 reps' })
      ]
    }
  ]
});

const TrainerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(emptyStats);
  const [todayClasses, setTodayClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [nutritionForm, setNutritionForm] = useState(toNutritionForm());
  const [nutritionSaving, setNutritionSaving] = useState(false);
  const [nutritionSuccess, setNutritionSuccess] = useState('');
  const [routineForm, setRoutineForm] = useState({
    name: '',
    description: '',
    duration: '45 min',
    difficulty: 'Intermedio',
    exercisesText: ''
  });
  const [routineSaving, setRoutineSaving] = useState(false);
  const [routineSuccess, setRoutineSuccess] = useState('');
  const [attendance, setAttendance] = useState({});
  const [presentByClass, setPresentByClass] = useState({});
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classLibrary, setClassLibrary] = useState([]);
  const [classLibraryLoading, setClassLibraryLoading] = useState(false);
  const [classBuilderSearch, setClassBuilderSearch] = useState('');
  const [blockExercisePicker, setBlockExercisePicker] = useState({});
  const [blockManualExerciseDraft, setBlockManualExerciseDraft] = useState({});
  const [classBuilderForm, setClassBuilderForm] = useState(createClass45Form());
  const [savedClassPlans, setSavedClassPlans] = useState([]);
  const [classBuilderSuccess, setClassBuilderSuccess] = useState('');
  const [classPublishing, setClassPublishing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('bootcamp_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  }, []);

  const classPlansStorageKey = useMemo(
    () => `trainer_class_plans_${user?.id || user?._id || 'default'}`,
    [user?.id, user?._id]
  );

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
      throw new Error(data.message || 'Error de servidor');
    }

    return data;
  };

  const hydrateClassAttendance = (classId, students) => {
    const presentCount = students.filter((student) => Boolean(student.isPresent)).length;
    setPresentByClass((prev) => ({ ...prev, [classId]: presentCount }));

    const nextAttendance = {};
    students.forEach((student) => {
      nextAttendance[`${classId}-${student.id}`] = Boolean(student.isPresent);
    });
    setAttendance((prev) => ({ ...prev, ...nextAttendance }));
  };

  const loadDashboard = async () => {
    const data = await apiRequest('/trainer/dashboard');
    const normalizedClasses = (data.todayClasses || []).map(normalizeClass);
    setDashboardStats(data.stats || emptyStats);
    setTodayClasses(normalizedClasses);

    await Promise.all(
      normalizedClasses.map(async (cls) => {
        try {
          const classDetail = await apiRequest(`/trainer/classes/${cls.id}/students`);
          const students = (classDetail.students || []).map(normalizeStudent);
          hydrateClassAttendance(cls.id, students);
        } catch (_error) {
          setPresentByClass((prev) => ({ ...prev, [cls.id]: 0 }));
        }
      })
    );
  };

  const loadClasses = async () => {
    const data = await apiRequest('/trainer/classes');
    setAllClasses((Array.isArray(data) ? data : []).map(normalizeClass));
  };

  const loadStudents = async () => {
    const data = await apiRequest('/trainer/students');
    const students = (Array.isArray(data) ? data : []).map(normalizeStudent);
    setAllStudents(students);
  };

  const loadExerciseLibrary = async () => {
    try {
      setClassLibraryLoading(true);
      const data = await apiRequest('/routines/exercises');
      setClassLibrary(Array.isArray(data) ? data : []);
    } catch (_err) {
      setClassLibrary([]);
    } finally {
      setClassLibraryLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDashboard(), loadClasses(), loadStudents(), loadExerciseLibrary()]);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el panel de entrenador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(classPlansStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedClassPlans(Array.isArray(parsed) ? parsed : []);
    } catch (_err) {
      setSavedClassPlans([]);
    }
  }, [classPlansStorageKey]);

  const persistClassPlans = (plans) => {
    setSavedClassPlans(plans);
    localStorage.setItem(classPlansStorageKey, JSON.stringify(plans));
  };

  const classBuilderTimeline = useMemo(() => {
    const warmupSeconds = Number(classBuilderForm.warmupMinutes || 0) * 60;
    const cooldownSeconds = Number(classBuilderForm.cooldownMinutes || 0) * 60;
    const blocksSeconds = (classBuilderForm.blocks || []).reduce((acc, block) => {
      const restAfterBlockSeconds = Number(block.restAfterBlockSeconds || 0);
      const blockMode = block.mode || 'interval';
      let blockTotal = 0;
      if (blockMode === 'amrap') {
        blockTotal = Number(block.amrapMinutes || 0) * 60 + restAfterBlockSeconds;
      } else {
        const exerciseCount = Math.max((block.exercises || []).length, 1);
        const workSeconds = Number(block.workSeconds || 0);
        const restSeconds = Number(block.restSeconds || 0);
        const rounds = Number(block.rounds || 0);
        blockTotal = (workSeconds + restSeconds) * rounds * exerciseCount + restAfterBlockSeconds;
      }
      return acc + blockTotal;
    }, 0);
    const totalSeconds = warmupSeconds + blocksSeconds + cooldownSeconds;
    const targetSeconds = 45 * 60;
    return {
      warmupSeconds,
      cooldownSeconds,
      blocksSeconds,
      totalSeconds,
      targetSeconds,
      deltaSeconds: totalSeconds - targetSeconds
    };
  }, [classBuilderForm]);

  const filteredClassLibrary = useMemo(() => {
    const term = classBuilderSearch.toLowerCase().trim();
    if (!term) return classLibrary;
    return classLibrary.filter((exercise) => {
      const name = String(exercise.displayName || exercise.name || '').toLowerCase();
      const category = String(exercise.category || '').toLowerCase();
      const technicalName = String(exercise.technicalName || '').toLowerCase();
      return name.includes(term) || category.includes(term) || technicalName.includes(term);
    });
  }, [classLibrary, classBuilderSearch]);

  const getExerciseId = (exercise) => exercise?._id || exercise?.id;

  const getExerciseById = (exerciseId) =>
    classLibrary.find((exercise) => getExerciseId(exercise) === exerciseId);

  const updateClassBlock = (blockIndex, patch) => {
    setClassBuilderForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, idx) => (idx === blockIndex ? { ...block, ...patch } : block))
    }));
  };

  const addExerciseToBlock = (blockIndex, exerciseId) => {
    if (!exerciseId) return;
    const exercise = getExerciseById(exerciseId);
    if (!exercise) return;
    setClassBuilderForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, idx) => {
        if (idx !== blockIndex) return block;
        const alreadyExists = (block.exercises || []).some((item) => item.exerciseId === exerciseId);
        if (alreadyExists) return block;
        return {
          ...block,
          exercises: [
            ...(block.exercises || []),
            createBlockExercise({
              source: 'library',
              exerciseId,
              name: exercise.displayName || exercise.name || 'Ejercicio',
              levelBeginner: exercise?.suggestedByLevel?.principiante || '',
              levelIntermediate: exercise?.suggestedByLevel?.intermedio || '',
              levelAdvanced: exercise?.suggestedByLevel?.avanzado || ''
            })
          ]
        };
      })
    }));
  };

  const addManualExerciseToBlock = (blockIndex, name) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return;
    setClassBuilderForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, idx) =>
        idx === blockIndex
          ? { ...block, exercises: [...(block.exercises || []), createBlockExercise({ source: 'manual', name: trimmedName })] }
          : block
      )
    }));
  };

  const updateBlockExercise = (blockIndex, exerciseItemId, patch) => {
    setClassBuilderForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, idx) =>
        idx === blockIndex
          ? {
              ...block,
              exercises: (block.exercises || []).map((item) => (item.id === exerciseItemId ? { ...item, ...patch } : item))
            }
          : block
      )
    }));
  };

  const removeExerciseFromBlock = (blockIndex, exerciseItemId) => {
    setClassBuilderForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, idx) =>
        idx === blockIndex
          ? { ...block, exercises: (block.exercises || []).filter((item) => item.id !== exerciseItemId) }
          : block
      )
    }));
  };

  const autofillExerciseLevels = (blockIndex, exerciseItemId) => {
    updateBlockExercise(blockIndex, exerciseItemId, {
      levelBeginner: '8-10 reps',
      levelIntermediate: '10-12 reps',
      levelAdvanced: '12-15 reps'
    });
  };

  const resetClassBuilder = () => {
    setClassBuilderForm(createClass45Form());
    setBlockExercisePicker({});
    setBlockManualExerciseDraft({});
    setClassBuilderSuccess('');
  };

  const applyAmrapTemplate = () => {
    setClassBuilderForm(createAmrap45Template());
    setBlockExercisePicker({});
    setBlockManualExerciseDraft({});
    setClassBuilderSuccess('Plantilla AMRAP 45 aplicada');
    setError('');
  };

  const saveClass45Plan = () => {
    const className = String(classBuilderForm.name || '').trim();
    if (!className) {
      setError('El nombre de la clase es obligatorio');
      return;
    }

    const payload = {
      ...classBuilderForm,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const nextPlans = [payload, ...savedClassPlans];
    persistClassPlans(nextPlans);
    setClassBuilderSuccess('Clase de 45 minutos guardada en este dispositivo');
    setError('');
  };

  const publishClassToSchedule = async () => {
    const className = String(classBuilderForm.name || '').trim();
    if (!className) {
      setError('El nombre de la clase es obligatorio para publicar');
      return;
    }

    try {
      setClassPublishing(true);
      setError('');
      setClassBuilderSuccess('');
      const payload = {
        name: className,
        day: classBuilderForm.day,
        time: classBuilderForm.time,
        spots: Number(classBuilderForm.spots || 12),
        repeatWeekdays: Boolean(classBuilderForm.repeatWeekdays)
      };
      await apiRequest('/trainer/classes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await loadClasses();
      setClassBuilderSuccess('Clase publicada para agenda de alumnos');
    } catch (err) {
      setError(err.message || 'No se pudo publicar la clase');
    } finally {
      setClassPublishing(false);
    }
  };

  const refreshAttendance = async () => {
    await Promise.all([loadDashboard(), loadStudents()]);
    if (selectedClass?.id) {
      await openClassDetail(selectedClass);
    }
  };

  const openClassDetail = async (classInfo) => {
    try {
      setError('');
      const classDetail = await apiRequest(`/trainer/classes/${classInfo.id}/students`);
      const students = (classDetail.students || []).map(normalizeStudent);
      const mergedClass = {
        ...normalizeClass(classInfo),
        ...normalizeClass(classDetail.class),
        students
      };

      hydrateClassAttendance(mergedClass.id, students);
      setSelectedClass(mergedClass);
      setActiveView('class-detail');
    } catch (err) {
      setError(err.message || 'No se pudo cargar la clase');
    }
  };

  const openStudentDetail = async (student) => {
    try {
      setError('');
      const data = await apiRequest(`/trainer/students/${student.id}`);
      const detailStudent = normalizeStudent(data.student || student);

      const totalClasses = data.stats?.totalClasses || 0;
      const presentCount = data.stats?.presentCount || 0;
      const attendancePercent = totalClasses > 0 ? `${Math.round((presentCount / totalClasses) * 100)}%` : 'N/A';
      const lastRecord = (data.attendanceHistory || [])[0];

      setSelectedStudent({
        ...detailStudent,
        totalClasses,
        attendance: attendancePercent,
        lastClass: lastRecord?.class ? `${lastRecord.class.day} ${lastRecord.class.time}` : '-'
      });
      setSelectedStudentDetail(data);
      setNutritionForm(toNutritionForm(data?.student?.nutritionPlan));
      setNutritionSuccess('');
      setRoutineForm({
        name: '',
        description: '',
        duration: '45 min',
        difficulty: 'Intermedio',
        exercisesText: ''
      });
      setRoutineSuccess('');
      setActiveView('student-detail');
    } catch (err) {
      setError(err.message || 'No se pudo cargar el alumno');
    }
  };

  const toggleAttendance = (classId, studentId) => {
    const key = `${classId}-${studentId}`;
    setAttendance((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveAttendance = async (classId) => {
    if (!selectedClass) return;

    try {
      const payload = {
        classId,
        attendances: selectedClass.students.map((student) => ({
          userId: student.id,
          status: attendance[`${classId}-${student.id}`] ? 'present' : 'absent'
        }))
      };

      await apiRequest('/trainer/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await loadDashboard();
      await openClassDetail(selectedClass);
      alert('Asistencia guardada correctamente');
    } catch (err) {
      setError(err.message || 'No se pudo guardar la asistencia');
    }
  };

  const getPresentCount = (classId) => presentByClass[classId] || 0;

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

  const saveStudentNutrition = async () => {
    if (!selectedStudent) return;
    try {
      setNutritionSaving(true);
      setNutritionSuccess('');
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

      const data = await apiRequest(`/trainer/students/${selectedStudent.id}/nutrition`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setSelectedStudentDetail((prev) => ({
        ...prev,
        student: {
          ...prev.student,
          nutritionPlan: data.nutritionPlan
        }
      }));
      setNutritionForm(toNutritionForm(data.nutritionPlan));
      setNutritionSuccess('Plan nutricional guardado');
    } catch (err) {
      setError(err.message || 'No se pudo guardar el plan nutricional');
    } finally {
      setNutritionSaving(false);
    }
  };

  const assignRoutineToStudent = async () => {
    if (!selectedStudent) return;
    if (!routineForm.name.trim()) {
      setError('El nombre de rutina es obligatorio');
      return;
    }

    const exercises = String(routineForm.exercisesText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name, sets: 3, reps: '10-12', rest: '60s' }));

    if (exercises.length === 0) {
      setError('Agrega al menos un ejercicio (uno por linea)');
      return;
    }

    try {
      setRoutineSaving(true);
      setRoutineSuccess('');
      setError('');
      const payload = {
        userId: selectedStudent.id,
        name: routineForm.name.trim(),
        description: routineForm.description.trim(),
        duration: routineForm.duration.trim() || '45 min',
        difficulty: routineForm.difficulty,
        exercises
      };

      const data = await apiRequest('/trainer/routines/assign', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data?.routine) {
        setSelectedStudentDetail((prev) => ({
          ...prev,
          routines: [data.routine, ...(prev?.routines || [])]
        }));
      }
      setRoutineSuccess('Rutina asignada correctamente');
      setRoutineForm((prev) => ({ ...prev, name: '', description: '', exercisesText: '' }));
    } catch (err) {
      setError(err.message || 'No se pudo asignar la rutina');
    } finally {
      setRoutineSaving(false);
    }
  };

  const filteredStudents = allStudents.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bootcamp-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-bootcamp-orange border-t-transparent rounded animate-spin" />
      </div>
    );
  }

  const OverviewView = () => (
    <div className="space-y-6">
      {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase">
            Hola, <span className="text-bootcamp-orange">{user?.name?.split(' ')[0] || 'Entrenador'}</span>
          </h2>
          <p className="text-gray-400">Resumen de tu dia</p>
        </div>
        <div className="hidden lg:flex items-center gap-2 bg-bootcamp-orange/10 px-4 py-2 border border-bootcamp-orange/20">
          <Award className="w-5 h-5 text-bootcamp-orange" />
          <span className="font-bold">Trainer Pro</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Alumnos Activos', value: dashboardStats.totalStudents, icon: Users, color: 'text-blue-400' },
          { label: 'Clases Hoy', value: dashboardStats.todayClasses, icon: Calendar, color: 'text-green-400' },
          { label: 'Asistencias Mes', value: dashboardStats.monthlyAttendance, icon: CheckCircle, color: 'text-bootcamp-orange' },
          { label: 'Clases Semana', value: dashboardStats.weekClasses, icon: TrendingUp, color: 'text-blue-400' }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-bootcamp p-6"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="card-bootcamp p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold uppercase flex items-center gap-2">
            <Clock className="w-5 h-5 text-bootcamp-orange" />
            Tus Clases de Hoy
          </h3>
          <button onClick={() => setActiveView('classes')} className="text-sm text-bootcamp-orange hover:underline">
            Ver todas
          </button>
        </div>

        <div className="space-y-4">
          {todayClasses.length === 0 && <p className="text-gray-400">No tenes clases asignadas hoy.</p>}
          {todayClasses.map((cls, idx) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-4 bg-bootcamp-black border border-white/5 hover:border-bootcamp-orange/30 transition-colors cursor-pointer group"
              onClick={() => openClassDetail(cls)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-bootcamp-orange/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-bootcamp-orange">{cls.time}</span>
                </div>
                <div>
                  <div className="font-bold group-hover:text-bootcamp-orange transition-colors">{cls.name}</div>
                  <div className="text-sm text-gray-400">
                    {cls.booked}/{cls.spots} alumnos - {getPresentCount(cls.id)} presentes
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-bootcamp-orange" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveView('students')}
          className="card-bootcamp p-6 text-left hover:border-bootcamp-orange/30 transition-colors group"
        >
          <Users className="w-8 h-8 text-bootcamp-orange mb-3" />
          <div className="font-bold text-lg">Mis Alumnos</div>
          <div className="text-sm text-gray-400">Ver listado completo y asignar rutinas</div>
        </button>

        <button className="card-bootcamp p-6 text-left hover:border-bootcamp-orange/30 transition-colors group">
          <FileText className="w-8 h-8 text-bootcamp-orange mb-3" />
          <div className="font-bold text-lg">Reportes</div>
          <div className="text-sm text-gray-400">Asistencias y progresos del mes</div>
        </button>
      </div>
    </div>
  );

  const ClassesView = () => (
    <div className="space-y-6">
      {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveView('overview')} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black uppercase">Todas mis Clases</h2>
      </div>

      <div className="grid gap-4">
        {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'].map((day) => {
          const dayClasses = allClasses.filter((c) => c.day === day);
          if (dayClasses.length === 0) return null;

          return (
            <div key={day} className="card-bootcamp p-6">
              <h3 className="text-bootcamp-orange font-bold uppercase mb-4">{day}</h3>
              <div className="space-y-3">
                {dayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => openClassDetail(cls)}
                    className="flex items-center justify-between p-4 bg-bootcamp-black cursor-pointer hover:border-bootcamp-orange/30 border border-transparent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold">{cls.time}</span>
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-gray-400">{cls.booked} inscriptos</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ClassBuilderView = () => (
    <div className="space-y-6">
      {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
      {classBuilderSuccess && <div className="p-4 border border-green-500/30 bg-green-500/10 text-green-300">{classBuilderSuccess}</div>}
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveView('overview')} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black uppercase">Clase 45 Min</h2>
      </div>

      <div className="card-bootcamp p-4 flex flex-wrap gap-2">
        <button onClick={applyAmrapTemplate} className="btn-bootcamp">
          Usar plantilla AMRAP 45 (3 bloques)
        </button>
        <button onClick={resetClassBuilder} className="px-4 py-2 border border-white/20 hover:border-bootcamp-orange">
          Clase libre (manual)
        </button>
      </div>

      <div className="card-bootcamp p-6 space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={classBuilderForm.name}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, name: e.target.value }))}
            className="input-bootcamp px-3 py-2 text-white"
            placeholder="Nombre de clase"
          />
          <select
            value={classBuilderForm.day}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, day: e.target.value }))}
            className="input-bootcamp px-3 py-2 text-white"
          >
            {trainerDays.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
          <input
            type="time"
            value={classBuilderForm.time}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, time: e.target.value }))}
            className="input-bootcamp px-3 py-2 text-white"
          />
          <input
            value={classBuilderForm.description}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, description: e.target.value }))}
            className="input-bootcamp px-3 py-2 text-white"
            placeholder="Descripcion opcional"
          />
          <input
            type="number"
            min="1"
            value={classBuilderForm.spots}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, spots: Number(e.target.value || 1) }))}
            className="input-bootcamp px-3 py-2 text-white"
            placeholder="Cupos"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(classBuilderForm.repeatWeekdays)}
            onChange={(e) => setClassBuilderForm((prev) => ({ ...prev, repeatWeekdays: e.target.checked }))}
          />
          Repetir en dias habiles (Lunes a Viernes, solo si el dia es Lunes)
        </label>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-bootcamp-black border border-white/10 p-3">
            <div className="text-xs uppercase text-gray-400">Calentamiento</div>
            <div className="text-xl font-bold">{classBuilderForm.warmupMinutes} min</div>
          </div>
          <div className="bg-bootcamp-black border border-white/10 p-3">
            <div className="text-xs uppercase text-gray-400">Bloques + descansos</div>
            <div className="text-xl font-bold">{Math.round(classBuilderTimeline.blocksSeconds / 60)} min</div>
          </div>
          <div className="bg-bootcamp-black border border-white/10 p-3">
            <div className="text-xs uppercase text-gray-400">Estiramiento</div>
            <div className="text-xl font-bold">{classBuilderForm.cooldownMinutes} min</div>
          </div>
        </div>
        <div className={`text-sm font-medium ${classBuilderTimeline.deltaSeconds === 0 ? 'text-green-400' : 'text-yellow-300'}`}>
          Total estimado: {Math.round(classBuilderTimeline.totalSeconds / 60)} min / 45 min
          {classBuilderTimeline.deltaSeconds !== 0
            ? ` (${classBuilderTimeline.deltaSeconds > 0 ? 'sobran' : 'faltan'} ${Math.abs(Math.round(classBuilderTimeline.deltaSeconds / 60))} min)`
            : ' (ok)'}
        </div>
      </div>

      <div className="grid xl:grid-cols-[2fr_1fr] gap-4">
        <div className="space-y-4">
          {classBuilderForm.blocks.map((block, blockIndex) => (
            <div key={block.id} className="card-bootcamp p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold uppercase text-bootcamp-orange">{block.name}</h3>
                <div className="text-xs text-gray-400">
                  {block.mode === 'amrap'
                    ? `${block.amrapMinutes} min AMRAP`
                    : `${Math.round((((block.workSeconds + block.restSeconds) * block.rounds * Math.max((block.exercises || []).length, 1)) + block.restAfterBlockSeconds) / 60)} min aprox.`}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <input
                  value={block.name}
                  onChange={(e) => updateClassBlock(blockIndex, { name: e.target.value })}
                  className="input-bootcamp px-3 py-2 text-white"
                  placeholder="Nombre del bloque"
                />
                <select
                  value={block.mode}
                  onChange={(e) => updateClassBlock(blockIndex, { mode: e.target.value })}
                  className="input-bootcamp px-3 py-2 text-white"
                >
                  <option value="interval">Intervalos</option>
                  <option value="amrap">AMRAP</option>
                </select>
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                {block.mode === 'amrap' ? (
                  <div>
                    <label className="text-[11px] uppercase text-gray-400 block mb-1">Duracion del bloque (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={block.amrapMinutes}
                      onChange={(e) => updateClassBlock(blockIndex, { amrapMinutes: Number(e.target.value || 0) })}
                      className="input-bootcamp px-3 py-2 text-white w-full"
                      placeholder="Duracion AMRAP (min)"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[11px] uppercase text-gray-400 block mb-1">Trabajo por ejercicio (seg)</label>
                      <input
                        type="number"
                        min="10"
                        value={block.workSeconds}
                        onChange={(e) => updateClassBlock(blockIndex, { workSeconds: Number(e.target.value || 0) })}
                        className="input-bootcamp px-3 py-2 text-white w-full"
                        placeholder="Trabajo (seg)"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase text-gray-400 block mb-1">Descanso entre ejercicios (seg)</label>
                      <input
                        type="number"
                        min="0"
                        value={block.restSeconds}
                        onChange={(e) => updateClassBlock(blockIndex, { restSeconds: Number(e.target.value || 0) })}
                        className="input-bootcamp px-3 py-2 text-white w-full"
                        placeholder="Descanso (seg)"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase text-gray-400 block mb-1">Rondas del bloque</label>
                      <input
                        type="number"
                        min="1"
                        value={block.rounds}
                        onChange={(e) => updateClassBlock(blockIndex, { rounds: Number(e.target.value || 1) })}
                        className="input-bootcamp px-3 py-2 text-white w-full"
                        placeholder="Rondas"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[11px] uppercase text-gray-400 block mb-1">Descanso al final del bloque (seg)</label>
                  <input
                    type="number"
                    min="0"
                    value={block.restAfterBlockSeconds}
                    onChange={(e) => updateClassBlock(blockIndex, { restAfterBlockSeconds: Number(e.target.value || 0) })}
                    className="input-bootcamp px-3 py-2 text-white w-full"
                    placeholder="Descanso bloque (seg)"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={blockExercisePicker[block.id] || ''}
                  onChange={(e) => setBlockExercisePicker((prev) => ({ ...prev, [block.id]: e.target.value }))}
                  className="flex-1 input-bootcamp px-3 py-2 text-white"
                >
                  <option value="">Seleccionar ejercicio</option>
                  {filteredClassLibrary.map((exercise) => (
                    <option key={getExerciseId(exercise)} value={getExerciseId(exercise)}>
                      {exercise.displayName || exercise.name} {exercise.category ? `(${exercise.category})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    addExerciseToBlock(blockIndex, blockExercisePicker[block.id]);
                    setBlockExercisePicker((prev) => ({ ...prev, [block.id]: '' }));
                  }}
                  className="px-3 py-2 border border-bootcamp-orange text-bootcamp-orange hover:bg-bootcamp-orange/10 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={blockManualExerciseDraft[block.id] || ''}
                  onChange={(e) => setBlockManualExerciseDraft((prev) => ({ ...prev, [block.id]: e.target.value }))}
                  className="flex-1 input-bootcamp px-3 py-2 text-white"
                  placeholder="Agregar ejercicio manual (ej: Dominadas)"
                />
                <button
                  onClick={() => {
                    addManualExerciseToBlock(blockIndex, blockManualExerciseDraft[block.id] || '');
                    setBlockManualExerciseDraft((prev) => ({ ...prev, [block.id]: '' }));
                  }}
                  className="px-3 py-2 border border-white/20 hover:border-bootcamp-orange"
                >
                  Manual
                </button>
              </div>

              <div className="space-y-2">
                {(block.exercises || []).length === 0 ? (
                  <div className="text-xs text-gray-500">Sin ejercicios en este bloque.</div>
                ) : (
                  block.exercises.map((item) => {
                    return (
                      <div key={item.id} className="bg-bootcamp-black border border-white/10 px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            {item.name}
                            <span className={`text-xs ml-2 uppercase ${item.source === 'manual' ? 'text-blue-400' : 'text-gray-500'}`}>
                              {item.source === 'manual' ? 'manual' : 'biblioteca'}
                            </span>
                          </div>
                          <button
                            onClick={() => removeExerciseFromBlock(blockIndex, item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          value={item.details || ''}
                          onChange={(e) => updateBlockExercise(blockIndex, item.id, { details: e.target.value })}
                          className="w-full input-bootcamp px-3 py-2 text-white"
                          placeholder="Indicacion general (ej: tecnica o carga)"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => autofillExerciseLevels(blockIndex, item.id)}
                            className="px-3 py-1 border border-white/20 text-xs uppercase hover:border-bootcamp-orange hover:text-bootcamp-orange"
                          >
                            Autocompletar niveles
                          </button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] uppercase text-gray-400 block mb-1">Principiante</label>
                            <input
                              value={item.levelBeginner || ''}
                              onChange={(e) => updateBlockExercise(blockIndex, item.id, { levelBeginner: e.target.value })}
                              className="w-full input-bootcamp px-3 py-2 text-white"
                              placeholder="Ej: 8-10 reps"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase text-gray-400 block mb-1">Intermedio</label>
                            <input
                              value={item.levelIntermediate || ''}
                              onChange={(e) => updateBlockExercise(blockIndex, item.id, { levelIntermediate: e.target.value })}
                              className="w-full input-bootcamp px-3 py-2 text-white"
                              placeholder="Ej: 10-12 reps"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase text-gray-400 block mb-1">Avanzado</label>
                            <input
                              value={item.levelAdvanced || ''}
                              onChange={(e) => updateBlockExercise(blockIndex, item.id, { levelAdvanced: e.target.value })}
                              className="w-full input-bootcamp px-3 py-2 text-white"
                              placeholder="Ej: 12-15 reps"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card-bootcamp p-4 space-y-3">
            <h3 className="font-bold uppercase">Biblioteca de Ejercicios</h3>
            <input
              value={classBuilderSearch}
              onChange={(e) => setClassBuilderSearch(e.target.value)}
              className="input-bootcamp px-3 py-2 text-white"
              placeholder="Buscar por nombre o categoria"
            />
            {classLibraryLoading ? <div className="text-sm text-gray-400">Cargando biblioteca...</div> : null}
            {!classLibraryLoading && (
              <div className="text-xs text-gray-500">
                {filteredClassLibrary.length} ejercicios disponibles
              </div>
            )}
          </div>

          <div className="card-bootcamp p-4 space-y-3">
            <h3 className="font-bold uppercase">Opciones de armado</h3>
            <div className="text-sm text-gray-300">1. Usar plantilla AMRAP 45 (3 bloques de 15 min).</div>
            <div className="text-sm text-gray-300">2. Armar clase libre con bloques en modo intervalos o AMRAP.</div>
            <div className="text-sm text-gray-300">3. Mezclar ejercicios de biblioteca y ejercicios manuales propios.</div>
            <div className="text-xs text-gray-500">Los descansos entre ejercicios y bloques se consideran en el total.</div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveClass45Plan} className="btn-bootcamp flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Guardar clase
            </button>
            <button
              onClick={publishClassToSchedule}
              disabled={classPublishing}
              className="px-4 py-2 border border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-60"
            >
              {classPublishing ? 'Publicando...' : 'Publicar agenda'}
            </button>
            <button onClick={resetClassBuilder} className="px-4 py-2 border border-white/20 hover:border-bootcamp-orange">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="card-bootcamp p-4 space-y-3">
        <h3 className="font-bold uppercase">Clases guardadas (local)</h3>
        {savedClassPlans.length === 0 ? (
          <div className="text-sm text-gray-500">Todavia no guardaste clases en este dispositivo.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedClassPlans.map((plan) => (
              <div key={plan.id} className="bg-bootcamp-black border border-white/10 px-3 py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-xs text-gray-500">{plan.day} {plan.time} - {new Date(plan.createdAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => persistClassPlans(savedClassPlans.filter((p) => p.id !== plan.id))}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const ClassDetailView = () => {
    if (!selectedClass) return null;

    const presentCount = selectedClass.students.filter((student) => attendance[`${selectedClass.id}-${student.id}`]).length;
    const absentCount = selectedClass.students.length - presentCount;

    return (
      <div className="space-y-6">
        {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('overview')} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-black uppercase">{selectedClass.name}</h2>
              <p className="text-gray-400">{selectedClass.day} {selectedClass.time} - {selectedClass.students.length}/{selectedClass.spots} alumnos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualCheckIn(true)}
              className="px-4 py-2 bg-bootcamp-orange text-sm font-bold uppercase text-white"
            >
              <UserPlus className="w-4 h-4 inline-block mr-2" />
              Asistencia Manual
            </button>
            <button onClick={() => saveAttendance(selectedClass.id)} className="btn-bootcamp flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card-bootcamp p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{presentCount}</div>
            <div className="text-xs text-gray-500 uppercase">Presentes</div>
          </div>
          <div className="card-bootcamp p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{absentCount}</div>
            <div className="text-xs text-gray-500 uppercase">Ausentes</div>
          </div>
          <div className="card-bootcamp p-4 text-center">
            <div className="text-3xl font-bold text-bootcamp-orange">
              {selectedClass.students.length > 0 ? Math.round((presentCount / selectedClass.students.length) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 uppercase">Asistencia</div>
          </div>
        </div>

        <div className="card-bootcamp overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-bootcamp-dark">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase text-gray-400">
              <div className="col-span-5">Alumno</div>
              <div className="col-span-3">Contacto</div>
              <div className="col-span-2">Peso</div>
              <div className="col-span-2 text-center">Asistencia</div>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {selectedClass.students.map((student, idx) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors"
              >
                <div className="col-span-5">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-gray-500">ID: #{student.id}</div>
                </div>
                <div className="col-span-3 text-sm text-gray-400">{student.phone}</div>
                <div className="col-span-2 text-sm">{student.weight ?? '-'} kg</div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => toggleAttendance(selectedClass.id, student.id)}
                    className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
                      attendance[`${selectedClass.id}-${student.id}`]
                        ? 'bg-green-500/20 text-green-500 border border-green-500'
                        : 'bg-red-500/20 text-red-500 border border-red-500'
                    }`}
                  >
                    {attendance[`${selectedClass.id}-${student.id}`] ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const StudentsView = () => (
    <div className="space-y-6">
      {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveView('overview')} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black uppercase">Mis Alumnos</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar alumno por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-bootcamp-gray border border-white/10 pl-12 pr-4 py-3 text-white focus:border-bootcamp-orange focus:outline-none"
        />
      </div>

      <div className="card-bootcamp overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-bootcamp-dark">
          <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase text-gray-400">
            <div className="col-span-4">Alumno</div>
            <div className="col-span-3">Contacto</div>
            <div className="col-span-2">Asistencia</div>
            <div className="col-span-2">Ultima clase</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredStudents.map((student, idx) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => openStudentDetail(student)}
            >
              <div className="col-span-4">
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-gray-500">{student.email}</div>
              </div>
              <div className="col-span-3 text-sm text-gray-400 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {student.phone}
              </div>
              <div className="col-span-2">
                <span className="px-2 py-1 text-xs font-bold bg-white/10 text-gray-200">{student.attendance}</span>
              </div>
              <div className="col-span-2 text-sm text-gray-400">{student.lastClass}</div>
              <div className="col-span-1 flex justify-end">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const StudentDetailView = () => {
    if (!selectedStudent) return null;

    const attendanceHistory = selectedStudentDetail?.attendanceHistory || [];

    return (
      <div className="space-y-6">
        {error && <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div>}
        {nutritionSuccess && <div className="p-4 border border-green-500/30 bg-green-500/10 text-green-300">{nutritionSuccess}</div>}
        {routineSuccess && <div className="p-4 border border-blue-500/30 bg-blue-500/10 text-blue-300">{routineSuccess}</div>}
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveView('students')} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black uppercase">Perfil del Alumno</h2>
        </div>

        <div className="card-bootcamp p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-bootcamp-orange/20 rounded flex items-center justify-center">
              <Users className="w-10 h-10 text-bootcamp-orange" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold">{selectedStudent.name}</h3>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selectedStudent.email}</span>
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedStudent.phone}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-bootcamp-black">
                  <div className="text-2xl font-bold text-bootcamp-orange">{selectedStudent.totalClasses}</div>
                  <div className="text-xs text-gray-500 uppercase">Clases totales</div>
                </div>
                <div className="text-center p-3 bg-bootcamp-black">
                  <div className="text-2xl font-bold text-green-400">{selectedStudent.attendance}</div>
                  <div className="text-xs text-gray-500 uppercase">Asistencia</div>
                </div>
                <div className="text-center p-3 bg-bootcamp-black">
                  <div className="text-2xl font-bold text-blue-400">{selectedStudentDetail?.stats?.presentCount || 0}</div>
                  <div className="text-xs text-gray-500 uppercase">Presentes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-bootcamp p-6 space-y-4 border-l-4 border-l-bootcamp-orange">
          <h3 className="font-bold uppercase flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-bootcamp-orange" />
            Asignar Rutina de Entrenamiento
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={routineForm.name}
              onChange={(e) => setRoutineForm((prev) => ({ ...prev, name: e.target.value }))}
              className="input-bootcamp px-3 py-2 text-white"
              placeholder="Nombre de rutina"
            />
            <select
              value={routineForm.difficulty}
              onChange={(e) => setRoutineForm((prev) => ({ ...prev, difficulty: e.target.value }))}
              className="input-bootcamp px-3 py-2 text-white"
            >
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={routineForm.duration}
              onChange={(e) => setRoutineForm((prev) => ({ ...prev, duration: e.target.value }))}
              className="input-bootcamp px-3 py-2 text-white"
              placeholder="Duracion (ej: 45 min)"
            />
            <input
              value={routineForm.description}
              onChange={(e) => setRoutineForm((prev) => ({ ...prev, description: e.target.value }))}
              className="input-bootcamp px-3 py-2 text-white"
              placeholder="Descripcion"
            />
          </div>
          <textarea
            rows={4}
            value={routineForm.exercisesText}
            onChange={(e) => setRoutineForm((prev) => ({ ...prev, exercisesText: e.target.value }))}
            className="w-full input-bootcamp px-3 py-2 text-white resize-none"
            placeholder="Ejercicios, uno por linea"
          />
          <button onClick={assignRoutineToStudent} disabled={routineSaving} className="btn-bootcamp w-full">
            {routineSaving ? 'Asignando rutina...' : 'Asignar rutina'}
          </button>
        </div>

        <div className="grid md:grid-cols-1 gap-4">
          <button className="card-bootcamp p-4 flex items-center gap-3 border-l-4 border-l-bootcamp-orange hover:border-bootcamp-orange/30 transition-colors">
            <Activity className="w-6 h-6 text-bootcamp-orange" />
            <div className="text-left">
              <div className="font-bold">Ver Progreso</div>
              <div className="text-sm text-gray-400">Graficas de evolucion</div>
            </div>
          </button>
        </div>

        <div className="card-bootcamp p-6 space-y-4 border-l-4 border-l-green-500">
          <h3 className="font-bold uppercase flex items-center gap-2">
            <Utensils className="w-5 h-5 text-green-400" />
            Plan Nutricional
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-gray-400 block mb-2">Estado</label>
              <select
                value={nutritionForm.status}
                onChange={(e) => setNutritionForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full input-bootcamp px-3 py-2 text-white"
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
                className="w-full input-bootcamp px-3 py-2 text-white"
              />
            </div>
          </div>
          <input
            value={nutritionForm.goal}
            onChange={(e) => setNutritionForm((prev) => ({ ...prev, goal: e.target.value }))}
            className="w-full input-bootcamp px-3 py-2 text-white"
            placeholder="Objetivo nutricional"
          />
          <textarea
            rows={3}
            value={nutritionForm.notes}
            onChange={(e) => setNutritionForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full input-bootcamp px-3 py-2 text-white resize-none"
            placeholder="Notas para el alumno"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm uppercase font-bold">Comidas</h4>
              <button onClick={addNutritionMeal} className="px-3 py-2 border border-green-500/40 text-green-400 text-xs uppercase hover:bg-green-500/10">
                Agregar comida
              </button>
            </div>
            {nutritionForm.meals.map((meal, idx) => (
              <div key={`nutrition-${idx}`} className="border border-white/10 p-3 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    value={meal.title}
                    onChange={(e) => updateNutritionMeal(idx, { title: e.target.value })}
                    className="input-bootcamp px-3 py-2 text-white"
                    placeholder="Nombre"
                  />
                  <input
                    value={meal.time}
                    onChange={(e) => updateNutritionMeal(idx, { time: e.target.value })}
                    className="input-bootcamp px-3 py-2 text-white"
                    placeholder="Hora"
                  />
                  <input
                    type="number"
                    value={meal.calories}
                    onChange={(e) => updateNutritionMeal(idx, { calories: e.target.value })}
                    className="input-bootcamp px-3 py-2 text-white"
                    placeholder="kcal"
                  />
                </div>
                <input
                  value={meal.description}
                  onChange={(e) => updateNutritionMeal(idx, { description: e.target.value })}
                  className="w-full input-bootcamp px-3 py-2 text-white"
                  placeholder="Descripcion"
                />
                <textarea
                  rows={3}
                  value={meal.itemsText}
                  onChange={(e) => updateNutritionMeal(idx, { itemsText: e.target.value })}
                  className="w-full input-bootcamp px-3 py-2 text-white resize-none"
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
            onClick={saveStudentNutrition}
            disabled={nutritionSaving}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase transition-colors disabled:opacity-60"
          >
            {nutritionSaving ? 'Guardando plan...' : 'Guardar plan nutricional'}
          </button>
        </div>

        <div className="card-bootcamp p-6">
          <h3 className="font-bold uppercase mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bootcamp-orange" />
            Historial Reciente
          </h3>
          <div className="space-y-3">
            {attendanceHistory.length === 0 && <p className="text-gray-400">Sin historial de asistencias.</p>}
            {attendanceHistory.map((record) => (
              <div key={record._id} className="flex items-center justify-between p-3 bg-bootcamp-black">
                <div>
                  <div className="font-medium">{record.class?.name || 'Clase'}</div>
                  <div className="text-sm text-gray-400">{record.class?.day} {record.class?.time}</div>
                </div>
                <div className="flex items-center gap-3">
                  {record.performance?.effort && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-bold">{record.performance.effort}</span>
                    </div>
                  )}
                  <span className={`px-2 py-1 text-xs font-bold uppercase ${
                    record.status === 'present'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'classes', label: 'Mis Clases', icon: Calendar },
    { id: 'class-builder', label: 'Clase 45 min', icon: Dumbbell },
    { id: 'students', label: 'Alumnos', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-bootcamp-black flex">
      <aside className="hidden lg:flex w-72 bg-bootcamp-gray border-r border-white/5 flex-col">
        <div className="p-6 border-b border-white/5">
          <BrandLogo size="sm" subtitle="Trainer Panel" subtitleClassName="text-bootcamp-orange" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                activeView === item.id
                  ? 'bg-bootcamp-orange text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="lg:hidden glass border-b border-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-black uppercase">Trainer Panel</span>
            <div className="w-6" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeView === 'overview' && <OverviewView />}
              {activeView === 'classes' && <ClassesView />}
              {activeView === 'class-builder' && <ClassBuilderView />}
              {activeView === 'class-detail' && <ClassDetailView />}
              {activeView === 'students' && <StudentsView />}
              {activeView === 'student-detail' && <StudentDetailView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

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
                <span className="font-black uppercase">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                      activeView === item.id
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

      <AnimatePresence>
        {showManualCheckIn && selectedClass && (
          <ManualCheckIn
            classData={selectedClass}
            onClose={() => setShowManualCheckIn(false)}
            onSuccess={refreshAttendance}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerDashboard;

