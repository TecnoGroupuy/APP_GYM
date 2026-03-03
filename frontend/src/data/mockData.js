export const classes = [
  { id: 1, name: 'Funcional Intenso', time: '07:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 8, day: 'Lunes' },
  { id: 2, name: 'Funcional Intenso', time: '18:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 10, day: 'Lunes' },
  { id: 3, name: 'Funcional Intenso', time: '19:00', duration: '45 min', trainer: 'María', spots: 12, booked: 6, day: 'Lunes' },
  { id: 4, name: 'Funcional Intenso', time: '20:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 4, day: 'Lunes' },
  { id: 5, name: 'Funcional Intenso', time: '07:00', duration: '45 min', trainer: 'María', spots: 12, booked: 9, day: 'Martes' },
  { id: 6, name: 'Funcional Intenso', time: '18:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 11, day: 'Martes' },
  { id: 7, name: 'Funcional Intenso', time: '19:00', duration: '45 min', trainer: 'María', spots: 12, booked: 7, day: 'Martes' },
  { id: 8, name: 'Funcional Intenso', time: '20:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 5, day: 'Martes' },
  { id: 9, name: 'Funcional Intenso', time: '07:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 6, day: 'Miércoles' },
  { id: 10, name: 'Funcional Intenso', time: '18:00', duration: '45 min', trainer: 'María', spots: 12, booked: 12, day: 'Miércoles' },
  { id: 11, name: 'Funcional Intenso', time: '19:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 8, day: 'Miércoles' },
  { id: 12, name: 'Funcional Intenso', time: '20:00', duration: '45 min', trainer: 'María', spots: 12, booked: 3, day: 'Miércoles' },
  { id: 13, name: 'Funcional Intenso', time: '07:00', duration: '45 min', trainer: 'María', spots: 12, booked: 7, day: 'Jueves' },
  { id: 14, name: 'Funcional Intenso', time: '18:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 9, day: 'Jueves' },
  { id: 15, name: 'Funcional Intenso', time: '19:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 10, day: 'Jueves' },
  { id: 16, name: 'Funcional Intenso', time: '20:00', duration: '45 min', trainer: 'María', spots: 12, booked: 6, day: 'Jueves' },
  { id: 17, name: 'Funcional Intenso', time: '07:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 5, day: 'Viernes' },
  { id: 18, name: 'Funcional Intenso', time: '18:00', duration: '45 min', trainer: 'María', spots: 12, booked: 8, day: 'Viernes' },
  { id: 19, name: 'Funcional Intenso', time: '19:00', duration: '45 min', trainer: 'Ale', spots: 12, booked: 11, day: 'Viernes' },
  { id: 20, name: 'Funcional Intenso', time: '20:00', duration: '45 min', trainer: 'María', spots: 12, booked: 4, day: 'Viernes' },
];

export const plans = [
  { 
    id: '8pases', 
    name: '8 PASES', 
    price: 1300, 
    description: '2 veces por semana',
    features: ['8 clases mensuales', 'Acceso a horarios diurnos', 'Válido 30 días', 'Reserva online'],
    popular: false
  },
  { 
    id: '12pases', 
    name: '12 PASES', 
    price: 1600, 
    description: '3 veces por semana',
    features: ['12 clases mensuales', 'Todos los horarios', 'Válido 30 días', 'Reserva online', '1 clase invitado'],
    popular: true
  },
  { 
    id: 'libre', 
    name: 'PASE LIBRE', 
    price: 1900, 
    description: 'Todos los días',
    features: ['Clases ilimitadas', 'Prioridad de reserva', 'Válido 30 días', '2 clases invitado', 'Plan nutricional básico'],
    popular: false
  },
];

export const routines = [
  {
    id: 1,
    name: 'Rutina de Fuerza - Semana 1',
    description: 'Enfoque en pecho y espalda',
    exercises: [
      { name: 'Push-ups', sets: 4, reps: '15-20', rest: '60s' },
      { name: 'TRX Rows', sets: 4, reps: '12-15', rest: '60s' },
      { name: 'Kettlebell Press', sets: 3, reps: '10 each', rest: '45s' },
      { name: 'Battle Ropes', sets: 3, reps: '30s', rest: '30s' },
    ],
    duration: '45 min',
    difficulty: 'Intermedio',
    completed: false
  },
  {
    id: 2,
    name: 'Rutina de Resistencia',
    description: 'Cardio y resistencia muscular',
    exercises: [
      { name: 'Burpees', sets: 4, reps: '10', rest: '45s' },
      { name: 'Box Jumps', sets: 4, reps: '12', rest: '60s' },
      { name: 'Mountain Climbers', sets: 3, reps: '30s', rest: '30s' },
      { name: 'Sprints', sets: 6, reps: '20m', rest: '40s' },
    ],
    duration: '40 min',
    difficulty: 'Avanzado',
    completed: true
  },
  {
    id: 3,
    name: 'Rutina de Piernas',
    description: 'Fuerza inferior y estabilidad',
    exercises: [
      { name: 'Squats', sets: 4, reps: '15', rest: '60s' },
      { name: 'Lunges', sets: 3, reps: '12 each', rest: '45s' },
      { name: 'Box Step-ups', sets: 3, reps: '10 each', rest: '45s' },
      { name: 'Wall Sit', sets: 3, reps: '45s', rest: '30s' },
    ],
    duration: '45 min',
    difficulty: 'Intermedio',
    completed: false
  }
];

export const progressData = [
  { month: 'Ene', weight: 82, bodyFat: 18 },
  { month: 'Feb', weight: 80, bodyFat: 16 },
  { month: 'Mar', weight: 79, bodyFat: 15 },
  { month: 'Abr', weight: 78, bodyFat: 14 },
  { month: 'May', weight: 77, bodyFat: 13 },
  { month: 'Jun', weight: 78, bodyFat: 12 },
];

export const testimonials = [
  {
    id: 1,
    name: 'Carlos Rodríguez',
    text: 'En 3 meses perdí 8kg y gané fuerza que nunca tuve. El ambiente te motiva a dar lo mejor.',
    result: '-8kg en 3 meses',
    image: null
  },
  {
    id: 2,
    name: 'Lucía Fernández',
    text: 'Los entrenadores se preocupan realmente por tu técnica. Me curé de un dolor de espalda crónico.',
    result: '0 dolor de espalda',
    image: null
  },
  {
    id: 3,
    name: 'Martín Silva',
    text: 'Pasé de no poder hacer 5 push-ups a hacer 50 seguidas. Boot Camp cambió mi vida.',
    result: '50 push-ups seguidas',
    image: null
  }
];
