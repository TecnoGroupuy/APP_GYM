import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Plus,
  Search,
  X,
  Flame,
  Target,
  Image as ImageIcon,
  Play,
  Save,
  Trash2,
  Copy,
  Edit2,
  Award
} from 'lucide-react';
import ExerciseVisual from '../components/ExerciseVisual';

const categories = [
  { id: 'all', name: 'Todos' },
  { id: 'fuerza', name: 'Fuerza' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'movilidad', name: 'Movilidad' },
  { id: 'core', name: 'Core' },
  { id: 'potencia', name: 'Potencia' },
  { id: 'full-body', name: 'Total' }
];

const equipmentFilters = [
  { id: 'all', name: 'Todo material' },
  { id: 'with', name: 'Con material' },
  { id: 'without', name: 'Sin material' }
];

const exerciseNameMap = {
  'Agility Ladder High Knees': 'Escalera - Rodillas arriba',
  'Agility Ladder In-Out': 'Escalera - Entrada y salida',
  'Agility Ladder Lateral Shuffle': 'Escalera - Desplazamiento lateral'
};

const difficulties = [
  { id: 'all', name: 'Todos' },
  { id: 'principiante', name: 'Principiante' },
  { id: 'intermedio', name: 'Intermedio' },
  { id: 'avanzado', name: 'Avanzado' }
];

const DEFAULT_EXERCISE_REFERENCE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#0a0a0a"/>
    <rect x="20" y="20" width="760" height="410" fill="#111111" stroke="#ff6b00" stroke-opacity="0.25"/>
    <circle cx="400" cy="130" r="34" fill="#f1f5f9"/>
    <path d="M340 210c0-30 24-54 54-54h12c30 0 54 24 54 54v80h-26v-72c0-14-11-25-25-25h-18c-14 0-25 11-25 25v72h-26z" fill="#facc15"/>
    <path d="M315 250l80 55" stroke="#facc15" stroke-width="18" stroke-linecap="round"/>
    <path d="M485 250l-80 55" stroke="#facc15" stroke-width="18" stroke-linecap="round"/>
    <path d="M365 318l-45 95" stroke="#e5e7eb" stroke-width="18" stroke-linecap="round"/>
    <path d="M435 318l45 95" stroke="#e5e7eb" stroke-width="18" stroke-linecap="round"/>
    <text x="400" y="408" text-anchor="middle" fill="#a3a3a3" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700">REFERENCIA EJERCICIO</text>
  </svg>
`);

const defaultExerciseForm = {
  id: '',
  displayName: '',
  technicalName: '',
  category: 'fuerza',
  difficulty: 'intermedio',
  description: '',
  muscleGroupsText: '',
  requiresEquipment: false,
  isBootcampKey: false,
  suggestedDuration: '',
  suggestedRounds: '',
  levelBeginner: '',
  levelIntermediate: '',
  levelAdvanced: '',
  image: '',
  video: '',
  caloriesPerMinute: ''
};

const defaultRoutineForm = {
  name: '',
  description: '',
  category: 'full-body',
  difficulty: 'intermedio',
  duration: 45,
  frequency: '3 veces por semana',
  isTemplate: false
};

const isForbiddenError = (error) =>
  Number(error?.status) === 403 || /403|no autorizado|acceso denegado|forbidden/i.test(String(error?.message || ''));

const getExerciseDisplayName = (exercise) =>
  exercise?.displayName ||
  exerciseNameMap[exercise?.technicalName] ||
  exerciseNameMap[exercise?.name] ||
  exercise?.name ||
  'Ejercicio';

const AdminRoutines = ({ apiRequest, members = [], onNotify }) => {
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [exercises, setExercises] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [userRoutines, setUserRoutines] = useState([]);

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [showImportedOnly, setShowImportedOnly] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUserRoutines, setLoadingUserRoutines] = useState(false);

  const [exerciseForm, setExerciseForm] = useState(defaultExerciseForm);
  const [routineForm, setRoutineForm] = useState(defaultRoutineForm);
  const [routineExercises, setRoutineExercises] = useState([]);

  const notify = (message, type = 'success') => onNotify?.({ message, type });
  const notifyError = (error, fallback) => {
    if (isForbiddenError(error)) {
      notify('No autorizado: solo admin o trainer pueden crear/editar rutinas y ejercicios.', 'error');
      return;
    }
    notify(error?.message || fallback, 'error');
  };

  const loadLibrary = async () => {
    const [exerciseRes, templateRes] = await Promise.all([
      apiRequest('/routines/exercises'),
      apiRequest('/routines/templates')
    ]);
    setExercises(Array.isArray(exerciseRes) ? exerciseRes : []);
    setTemplates(Array.isArray(templateRes) ? templateRes : []);
  };

  const loadUserRoutines = async (userId) => {
    if (!userId) {
      setUserRoutines([]);
      return;
    }
    setLoadingUserRoutines(true);
    try {
      const routines = await apiRequest(`/routines/user/${userId}`);
      setUserRoutines(Array.isArray(routines) ? routines : []);
    } finally {
      setLoadingUserRoutines(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadLibrary();
      } catch (error) {
        notifyError(error, 'No se pudo cargar biblioteca');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    loadUserRoutines(selectedUserId).catch((error) => notifyError(error, 'No se pudieron cargar rutinas'));
  }, [selectedUserId]);

  const filteredExercises = useMemo(() => {
    const filtered = exercises.filter((exercise) => {
      const displayName = getExerciseDisplayName(exercise);
      const matchesSearch = String(displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(exercise.technicalName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(exercise.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exercise.muscleGroups || []).some((m) => String(m).toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || exercise.category === filterCategory;
      const matchesDifficulty = filterDifficulty === 'all' || exercise.difficulty === filterDifficulty;
      const matchesEquipment =
        filterEquipment === 'all' ||
        (filterEquipment === 'with' && Boolean(exercise.requiresEquipment)) ||
        (filterEquipment === 'without' && !exercise.requiresEquipment);
      const matchesSource =
        !showImportedOnly || String(exercise?.source || '').includes('functionalmovement.com');
      return matchesSearch && matchesCategory && matchesDifficulty && matchesEquipment && matchesSource;
    });

    // Prioriza ejercicios con imagen real (y de la fuente importada) para que se noten los cambios.
    return filtered.sort((a, b) => {
      const aHasImage = Boolean(a?.media?.image);
      const bHasImage = Boolean(b?.media?.image);
      if (aHasImage !== bHasImage) return aHasImage ? -1 : 1;

      const aIsFms = String(a?.source || '').includes('functionalmovement.com');
      const bIsFms = String(b?.source || '').includes('functionalmovement.com');
      if (aIsFms !== bIsFms) return aIsFms ? -1 : 1;

      return String(a?.displayName || a?.name || '').localeCompare(String(b?.displayName || b?.name || ''));
    });
  }, [exercises, searchQuery, filterCategory, filterDifficulty, filterEquipment, showImportedOnly]);

  const addToRoutine = (exercise) => {
    setRoutineExercises((prev) => [
      ...prev,
      {
        routineId: `${Date.now()}-${Math.random()}`,
        exerciseId: exercise._id,
        name: getExerciseDisplayName(exercise),
        sets: 3,
        reps: '10-12',
        rest: '60 segundos',
        weight: '',
        notes: ''
      }
    ]);
    setShowBuilder(true);
  };

  const updateRoutineExercise = (index, field, value) => {
    setRoutineExercises((prev) => prev.map((ex, idx) => (idx === index ? { ...ex, [field]: value } : ex)));
  };

  const removeRoutineExercise = (index) => {
    setRoutineExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openExerciseCreate = () => {
    setExerciseForm(defaultExerciseForm);
    setShowExerciseModal(true);
  };

  const openExerciseEdit = (exercise) => {
    setExerciseForm({
      id: exercise._id,
      displayName: exercise.displayName || exerciseNameMap[exercise.technicalName] || exercise.name || '',
      technicalName: exercise.technicalName || '',
      category: exercise.category || 'fuerza',
      difficulty: exercise.difficulty || 'intermedio',
      description: exercise.description || '',
      muscleGroupsText: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups.join(', ') : '',
      requiresEquipment: Boolean(exercise.requiresEquipment),
      isBootcampKey: Boolean(exercise.isBootcampKey),
      suggestedDuration: exercise.suggestedDuration || '',
      suggestedRounds: exercise.suggestedRounds || '',
      levelBeginner: exercise?.suggestedByLevel?.principiante || '',
      levelIntermediate: exercise?.suggestedByLevel?.intermedio || '',
      levelAdvanced: exercise?.suggestedByLevel?.avanzado || '',
      image: exercise.media?.image || '',
      video: exercise.media?.video || '',
      caloriesPerMinute: exercise.caloriesPerMinute || ''
    });
    setShowExerciseModal(true);
  };

  const saveRoutine = async () => {
    const routineName = String(routineForm.name || '').trim();
    if (!selectedUserId) return notify('Selecciona un alumno', 'error');
    if (!routineName) return notify('El nombre de la rutina es obligatorio', 'error');

    const normalizedExercises = routineExercises
      .filter((ex) => String(ex.exerciseId || '').trim())
      .map((ex, idx) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        order: idx,
        sets: Number(ex.sets || 3),
        reps: ex.reps,
        rest: ex.rest,
        weight: ex.weight,
        notes: ex.notes
      }));

    if (normalizedExercises.length === 0) return notify('Debes agregar al menos 1 ejercicio', 'error');

    try {
      setSaving(true);
      await apiRequest('/routines', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserId,
          name: routineName,
          description: String(routineForm.description || '').trim(),
          category: routineForm.category,
          difficulty: routineForm.difficulty,
          duration: Number(routineForm.duration || 45),
          frequency: String(routineForm.frequency || '').trim(),
          isTemplate: routineForm.isTemplate,
          exercises: normalizedExercises
        })
      });

      notify('Rutina guardada correctamente');
      setRoutineForm(defaultRoutineForm);
      setRoutineExercises([]);
      setShowBuilder(false);
      await loadLibrary();
      await loadUserRoutines(selectedUserId);
    } catch (error) {
      notifyError(error, 'No se pudo guardar rutina');
    } finally {
      setSaving(false);
    }
  };

  const saveExercise = async () => {
    const displayName = String(exerciseForm.displayName || '').trim();
    const technicalName = String(exerciseForm.technicalName || '').trim();
    const canonicalName = displayName || technicalName;
    if (!canonicalName) return notify('Nombre visible o técnico requerido', 'error');

    const muscleGroups = String(exerciseForm.muscleGroupsText || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    try {
      setSaving(true);
      const payload = {
        name: canonicalName,
        displayName,
        technicalName,
        category: exerciseForm.category,
        difficulty: exerciseForm.difficulty,
        description: String(exerciseForm.description || '').trim(),
        muscleGroups,
        requiresEquipment: Boolean(exerciseForm.requiresEquipment),
        isBootcampKey: Boolean(exerciseForm.isBootcampKey),
        suggestedDuration: String(exerciseForm.suggestedDuration || '').trim(),
        suggestedRounds: String(exerciseForm.suggestedRounds || '').trim(),
        suggestedByLevel: {
          principiante: String(exerciseForm.levelBeginner || '').trim(),
          intermedio: String(exerciseForm.levelIntermediate || '').trim(),
          avanzado: String(exerciseForm.levelAdvanced || '').trim()
        },
        media: { image: exerciseForm.image, video: exerciseForm.video },
        caloriesPerMinute: Number(exerciseForm.caloriesPerMinute || 0)
      };
      if (exerciseForm.id) {
        await apiRequest(`/routines/exercises/${exerciseForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        notify('Ejercicio actualizado');
      } else {
        await apiRequest('/routines/exercises', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        notify('Ejercicio creado');
      }
      setExerciseForm(defaultExerciseForm);
      setShowExerciseModal(false);
      await loadLibrary();
    } catch (error) {
      notifyError(error, 'No se pudo guardar ejercicio');
    } finally {
      setSaving(false);
    }
  };

  const levelUpRoutine = async (routine) => {
    try {
      setSaving(true);
      await apiRequest(`/routines/${routine._id}/progression/level-up`, {
        method: 'PATCH',
        body: JSON.stringify({})
      });
      notify('Nivel actualizado correctamente');
      await loadUserRoutines(selectedUserId);
    } catch (error) {
      notifyError(error, 'No se pudo subir de nivel');
    } finally {
      setSaving(false);
    }
  };

  const adjustRoutineProgress = async (routine) => {
    const levelInput = window.prompt(`Nivel actual (1-${routine.totalLevels || 4})`, String(routine.currentLevel || 1));
    if (levelInput === null) return;
    const weekInput = window.prompt(`Semana actual (1-${routine.progress?.totalWeeks || 8})`, String(routine.progress?.currentWeek || 1));
    if (weekInput === null) return;
    const noteInput = window.prompt('Nota de ajuste (opcional)', '');

    try {
      setSaving(true);
      await apiRequest(`/routines/${routine._id}/progression/adjust`, {
        method: 'PATCH',
        body: JSON.stringify({
          currentLevel: Number(levelInput),
          currentWeek: Number(weekInput),
          note: noteInput || ''
        })
      });
      notify('Progresion ajustada');
      await loadUserRoutines(selectedUserId);
    } catch (error) {
      notifyError(error, 'No se pudo ajustar progresion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card-bootcamp p-8 text-center text-gray-400">Cargando rutinas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black uppercase">Gestion de <span className="text-bootcamp-orange">Rutinas</span></h2>
        <div className="flex gap-2">
          <button onClick={openExerciseCreate} className="px-4 py-2 border border-white/20 hover:border-bootcamp-orange text-sm uppercase">
            <Plus className="w-4 h-4 inline-block mr-1" />Nuevo Ejercicio
          </button>
          <button onClick={() => setShowBuilder(true)} className="btn-bootcamp">
            <Dumbbell className="w-4 h-4 inline-block mr-1" />Crear Rutina
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {[{ id: 'library', name: 'Biblioteca' }, { id: 'routines', name: 'Rutinas Activas' }, { id: 'progress', name: 'Progresion' }, { id: 'templates', name: 'Plantillas' }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 font-bold uppercase text-sm border-b-2 ${activeTab === tab.id ? 'border-bootcamp-orange text-bootcamp-orange' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar ejercicio..." className="w-full input-bootcamp pl-10 pr-4 py-3 text-white" />
            </div>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="input-bootcamp px-3 py-3 text-white md:w-52">
              {difficulties.map((difficulty) => (
                <option key={difficulty.id} value={difficulty.id}>{difficulty.name}</option>
              ))}
            </select>
            <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="input-bootcamp px-3 py-3 text-white md:w-52">
              {equipmentFilters.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowImportedOnly((prev) => !prev)}
              className={`px-3 py-2 text-xs uppercase font-bold border transition-colors ${
                showImportedOnly
                  ? 'bg-bootcamp-orange text-white border-bootcamp-orange'
                  : 'bg-bootcamp-gray text-gray-300 border-white/10'
              }`}
            >
              {showImportedOnly ? 'Solo Importados FMS' : 'Mostrar Todo'}
            </button>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-3 py-2 text-xs uppercase font-bold ${filterCategory === cat.id ? 'bg-bootcamp-orange text-white' : 'bg-bootcamp-gray border border-white/10'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {filteredExercises.length === 0 ? (
            <div className="card-bootcamp p-6 text-gray-500">No hay ejercicios para el filtro seleccionado.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((exercise) => (
              <motion.div key={exercise._id} className="card-bootcamp p-4 group" whileHover={{ y: -2 }}>
                <div className="relative h-36 mb-3 bg-bootcamp-black overflow-hidden">
                  <ExerciseVisual
                    exercise={exercise}
                    className="w-full h-full group-hover:scale-105 transition-transform"
                  />
                  {exercise.media?.video ? <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-xs"><Play className="w-3 h-3 inline-block mr-1" />Video</span> : null}
                </div>
                <div className="font-bold flex items-center gap-2">
                  {getExerciseDisplayName(exercise)}
                  {exercise.isBootcampKey ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase bg-bootcamp-orange/20 text-bootcamp-orange border border-bootcamp-orange/30">
                      <Award className="w-3 h-3" />
                      clave
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-400 uppercase">{exercise.category} - {exercise.difficulty}</div>
                <div className="text-xs text-gray-300 mt-1">
                  {(exercise.suggestedDuration || '30 seg')} - {(exercise.suggestedRounds || '3 rondas')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(exercise.muscleGroups || []).slice(0, 3).join(', ') || 'Sin musculos definidos'}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2"><span><Flame className="w-3 h-3 inline-block mr-1" />{exercise.caloriesPerMinute || 0}</span><span><Target className="w-3 h-3 inline-block mr-1" />{(exercise.muscleGroups || []).length}</span></div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setSelectedExercise(exercise)} className="px-3 py-2 border border-white/20 text-xs uppercase">Ver</button>
                  <button onClick={() => openExerciseEdit(exercise)} className="px-3 py-2 border border-yellow-500/40 text-yellow-300 text-xs uppercase"><Edit2 className="w-3 h-3 inline-block mr-1" />Editar</button>
                  <button onClick={() => addToRoutine(exercise)} className="px-3 py-2 bg-bootcamp-orange text-white text-xs uppercase font-bold">Agregar</button>
                </div>
              </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'routines' && (
        <div className="space-y-4">
          <div className="card-bootcamp p-4">
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="input-bootcamp px-3 py-2 text-white w-full md:w-96">
              <option value="">Seleccionar alumno...</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.fullName || member.name}</option>)}
            </select>
          </div>
          {!selectedUserId ? (
            <div className="card-bootcamp p-6 text-gray-500">Selecciona un alumno para ver rutinas activas.</div>
          ) : loadingUserRoutines ? (
            <div className="card-bootcamp p-6 text-gray-400">Cargando rutinas del alumno...</div>
          ) : userRoutines.length === 0 ? (
            <div className="card-bootcamp p-6 text-gray-500">Sin rutinas asignadas para este alumno.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {userRoutines.map((routine) => (
              <div key={routine._id} className="card-bootcamp p-4">
                <div className="font-bold text-lg">{routine.name}</div>
                <div className="text-sm text-gray-400">{routine.category} - {routine.difficulty}</div>
                <div className="text-xs text-gray-500 mt-2">{routine.exercises?.length || 0} ejercicios - {routine.duration || 0} min</div>
                <div className="text-xs mt-2 uppercase text-bootcamp-orange">{routine.status}</div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="card-bootcamp p-4">
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="input-bootcamp px-3 py-2 text-white w-full md:w-96">
              <option value="">Seleccionar alumno...</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.fullName || member.name}</option>)}
            </select>
          </div>

          {!selectedUserId ? (
            <div className="card-bootcamp p-6 text-gray-500">Selecciona un alumno para ver progresion.</div>
          ) : loadingUserRoutines ? (
            <div className="card-bootcamp p-6 text-gray-400">Cargando progresion...</div>
          ) : userRoutines.length === 0 ? (
            <div className="card-bootcamp p-6 text-gray-500">Sin rutinas para este alumno.</div>
          ) : (
            <div className="card-bootcamp overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bootcamp-dark border-b border-white/10">
                    <tr>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Rutina</th>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Nivel</th>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Semana</th>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Progreso</th>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Estado</th>
                      <th className="text-left p-4 text-xs uppercase text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {userRoutines.map((routine) => {
                      const currentLevel = Number(routine.currentLevel || 1);
                      const totalLevels = Number(routine.totalLevels || 1);
                      const currentWeek = Number(routine.progress?.currentWeek || 1);
                      const totalWeeks = Number(routine.progress?.totalWeeks || 1);
                      const progressPercent = totalWeeks > 0 ? Math.min(Math.round((currentWeek / totalWeeks) * 100), 100) : 0;
                      const canLevelUp = currentLevel < totalLevels;
                      return (
                        <tr key={routine._id} className="hover:bg-white/5">
                          <td className="p-4">
                            <div className="font-medium">{routine.name}</div>
                            <div className="text-xs text-gray-500 uppercase">{routine.category} - {routine.difficulty}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-bootcamp-orange text-xs font-bold uppercase">Nivel {currentLevel}/{totalLevels}</span>
                          </td>
                          <td className="p-4 text-sm text-gray-300">{currentWeek}/{totalWeeks}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-2 bg-bootcamp-black overflow-hidden rounded">
                                <div className="h-full bg-bootcamp-orange" style={{ width: `${progressPercent}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{progressPercent}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs uppercase ${progressPercent >= 80 ? 'bg-green-500/20 text-green-400' : progressPercent >= 50 ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {progressPercent >= 80 ? 'excelente' : progressPercent >= 50 ? 'on-track' : 'ajustar'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => levelUpRoutine(routine)}
                                disabled={!canLevelUp || saving}
                                className="px-3 py-1 bg-bootcamp-orange text-xs font-bold uppercase disabled:opacity-40"
                              >
                                Subir Nivel
                              </button>
                              <button
                                onClick={() => adjustRoutineProgress(routine)}
                                disabled={saving}
                                className="px-3 py-1 border border-white/20 text-xs font-bold uppercase hover:border-bootcamp-orange"
                              >
                                Ajustar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        templates.length === 0 ? (
          <div className="card-bootcamp p-6 text-gray-500">No hay plantillas.</div>
        ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div key={tpl._id} className="card-bootcamp p-4">
              <div className="flex items-center justify-between"><div className="font-bold">{tpl.templateName || tpl.name}</div><Copy className="w-4 h-4 text-gray-500" /></div>
              <div className="text-sm text-gray-400">{tpl.exercises?.length || 0} ejercicios</div>
            </div>
          ))}
        </div>
        )
      )}

      <AnimatePresence>
        {showExerciseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-xl bg-bootcamp-gray border border-white/10 p-5 space-y-3">
              <div className="flex justify-between items-center"><h3 className="text-xl font-bold uppercase">{exerciseForm.id ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h3><button onClick={() => setShowExerciseModal(false)}><X className="w-5 h-5" /></button></div>
              <input value={exerciseForm.displayName} onChange={(e) => setExerciseForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Nombre visible (ej: Escalera - Rodillas arriba)" className="w-full input-bootcamp px-3 py-2 text-white" />
              <input value={exerciseForm.technicalName} onChange={(e) => setExerciseForm((p) => ({ ...p, technicalName: e.target.value }))} placeholder="Nombre tecnico (ej: Agility Ladder High Knees)" className="w-full input-bootcamp px-3 py-2 text-white" />
              <div className="grid grid-cols-2 gap-3">
                <select value={exerciseForm.category} onChange={(e) => setExerciseForm((p) => ({ ...p, category: e.target.value }))} className="input-bootcamp px-3 py-2 text-white">
                  {categories.filter((category) => category.id !== 'all').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <select value={exerciseForm.difficulty} onChange={(e) => setExerciseForm((p) => ({ ...p, difficulty: e.target.value }))} className="input-bootcamp px-3 py-2 text-white">
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase text-gray-400 flex items-center gap-2">
                  <input type="checkbox" checked={exerciseForm.requiresEquipment} onChange={(e) => setExerciseForm((p) => ({ ...p, requiresEquipment: e.target.checked }))} />
                  Requiere material
                </label>
                <label className="text-xs uppercase text-gray-400 flex items-center gap-2">
                  <input type="checkbox" checked={exerciseForm.isBootcampKey} onChange={(e) => setExerciseForm((p) => ({ ...p, isBootcampKey: e.target.checked }))} />
                  Ejercicio clave Boot Camp
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={exerciseForm.suggestedDuration} onChange={(e) => setExerciseForm((p) => ({ ...p, suggestedDuration: e.target.value }))} placeholder="Tiempo sugerido (ej: 30 seg)" className="w-full input-bootcamp px-3 py-2 text-white" />
                <input value={exerciseForm.suggestedRounds} onChange={(e) => setExerciseForm((p) => ({ ...p, suggestedRounds: e.target.value }))} placeholder="Rondas sugeridas (ej: 3 rondas)" className="w-full input-bootcamp px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={exerciseForm.levelBeginner} onChange={(e) => setExerciseForm((p) => ({ ...p, levelBeginner: e.target.value }))} placeholder="Principiante (ej: 20 seg)" className="w-full input-bootcamp px-3 py-2 text-white" />
                <input value={exerciseForm.levelIntermediate} onChange={(e) => setExerciseForm((p) => ({ ...p, levelIntermediate: e.target.value }))} placeholder="Intermedio (ej: 30 seg)" className="w-full input-bootcamp px-3 py-2 text-white" />
                <input value={exerciseForm.levelAdvanced} onChange={(e) => setExerciseForm((p) => ({ ...p, levelAdvanced: e.target.value }))} placeholder="Avanzado (ej: 40 seg)" className="w-full input-bootcamp px-3 py-2 text-white" />
              </div>
              <input value={exerciseForm.muscleGroupsText} onChange={(e) => setExerciseForm((p) => ({ ...p, muscleGroupsText: e.target.value }))} placeholder="Grupos musculares (separados por coma)" className="w-full input-bootcamp px-3 py-2 text-white" />
              <input value={exerciseForm.image} onChange={(e) => setExerciseForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL imagen" className="w-full input-bootcamp px-3 py-2 text-white" />
              <div className="border border-white/10 bg-bootcamp-black p-3">
                <div className="text-xs uppercase text-gray-400 mb-2">Referencia visual recomendada</div>
                <div className="grid md:grid-cols-2 gap-3 items-start">
                  <img
                    src={exerciseForm.image || DEFAULT_EXERCISE_REFERENCE}
                    alt="Referencia del ejercicio"
                    className="w-full h-28 object-cover border border-white/10"
                  />
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Usa una imagen clara del movimiento principal.</p>
                    <p>Preferible fondo limpio y cuerpo completo visible.</p>
                    <p>Formato recomendado: horizontal 16:9 (ej. 800x450).</p>
                  </div>
                </div>
              </div>
              <input value={exerciseForm.video} onChange={(e) => setExerciseForm((p) => ({ ...p, video: e.target.value }))} placeholder="URL video" className="w-full input-bootcamp px-3 py-2 text-white" />
              <input value={exerciseForm.caloriesPerMinute} onChange={(e) => setExerciseForm((p) => ({ ...p, caloriesPerMinute: e.target.value }))} type="number" placeholder="Kcal por minuto" className="w-full input-bootcamp px-3 py-2 text-white" />
              <textarea value={exerciseForm.description} onChange={(e) => setExerciseForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descripcion" className="w-full input-bootcamp px-3 py-2 text-white resize-none" rows={3} />
              <button onClick={saveExercise} disabled={saving} className="btn-bootcamp w-full">{saving ? 'Guardando...' : exerciseForm.id ? 'Guardar cambios' : 'Guardar ejercicio'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBuilder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 p-4 overflow-y-auto">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="max-w-5xl mx-auto bg-bootcamp-gray border border-white/10">
              <div className="p-4 border-b border-white/10 flex justify-between items-center"><h3 className="text-xl font-bold uppercase">Constructor de Rutina</h3><button onClick={() => setShowBuilder(false)}><X className="w-5 h-5" /></button></div>
              <div className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <input value={routineForm.name} onChange={(e) => setRoutineForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre de rutina" className="input-bootcamp px-3 py-2 text-white" />
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="input-bootcamp px-3 py-2 text-white">
                    <option value="">Seleccionar alumno...</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.fullName || member.name}</option>)}
                  </select>
                  <input type="number" min="5" value={routineForm.duration} onChange={(e) => setRoutineForm((p) => ({ ...p, duration: e.target.value }))} placeholder="Duracion (min)" className="input-bootcamp px-3 py-2 text-white" />
                  <input value={routineForm.frequency} onChange={(e) => setRoutineForm((p) => ({ ...p, frequency: e.target.value }))} placeholder="Frecuencia (ej: 3 veces por semana)" className="input-bootcamp px-3 py-2 text-white" />
                </div>

                <div className="space-y-2">
                  {routineExercises.map((ex, idx) => (
                    <div key={ex.routineId} className="card-bootcamp p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-bootcamp-orange text-white flex items-center justify-center font-bold">{idx + 1}</div>
                        <div className="flex-1">
                          <div className="font-bold">{ex.name}</div>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <input value={ex.sets} onChange={(e) => updateRoutineExercise(idx, 'sets', e.target.value)} className="input-bootcamp px-2 py-1 text-xs text-white" placeholder="Series" />
                            <input value={ex.reps} onChange={(e) => updateRoutineExercise(idx, 'reps', e.target.value)} className="input-bootcamp px-2 py-1 text-xs text-white" placeholder="Reps" />
                            <input value={ex.weight} onChange={(e) => updateRoutineExercise(idx, 'weight', e.target.value)} className="input-bootcamp px-2 py-1 text-xs text-white" placeholder="Peso" />
                            <input value={ex.rest} onChange={(e) => updateRoutineExercise(idx, 'rest', e.target.value)} className="input-bootcamp px-2 py-1 text-xs text-white" placeholder="Descanso" />
                          </div>
                        </div>
                        <button onClick={() => removeRoutineExercise(idx)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setRoutineExercises([])} className="px-4 py-2 border border-white/20">Limpiar</button>
                  <button onClick={saveRoutine} disabled={saving} className="btn-bootcamp"><Save className="w-4 h-4 inline-block mr-1" />{saving ? 'Guardando...' : 'Guardar rutina'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedExercise && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-2xl bg-bootcamp-gray border border-white/10">
              <div className="p-4 border-b border-white/10 flex justify-between"><h3 className="text-xl font-bold">{getExerciseDisplayName(selectedExercise)}</h3><button onClick={() => setSelectedExercise(null)}><X className="w-5 h-5" /></button></div>
              <div className="p-4 space-y-4">
                <div className="h-56 bg-bootcamp-black">{selectedExercise.media?.image ? <img src={selectedExercise.media.image} alt={getExerciseDisplayName(selectedExercise)} className="w-full h-full object-cover" /> : <img src={DEFAULT_EXERCISE_REFERENCE} alt="Referencia visual de ejercicio" className="w-full h-full object-cover opacity-80" />}</div>
                <div className="text-gray-300">{selectedExercise.description || 'Sin descripcion'}</div>
                <button onClick={() => { addToRoutine(selectedExercise); setSelectedExercise(null); }} className="btn-bootcamp w-full">Agregar a rutina</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminRoutines;
