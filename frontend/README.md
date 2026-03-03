# Boot Camp App

Aplicación web completa para Boot Camp Training - Gimnasio funcional en Montevideo.

## Características

### Landing Page Pública
- Diseño moderno y responsive con identidad visual Boot Camp
- Secciones: Hero, Beneficios, Horarios, Planes, Testimonios, Contacto
- Animaciones con Framer Motion
- Optimizado para conversión

### Área de Clientes (Dashboard)
- **Resumen**: Vista general del progreso y estadísticas
- **Clases**: Sistema de reservas con calendario
- **Rutinas**: Visualización y seguimiento de rutinas con temporizador integrado
- **Progreso**: Gráficas de evolución (peso, % grasa)
- **Nutrición**: Plan nutricional (placeholder para integración)
- **Pagos**: Integración con Mercado Pago (listo para implementar)
- **Perfil**: Gestión de datos personales

## Tecnologías

- React 18
- React Router 6
- Tailwind CSS
- Framer Motion
- Recharts (gráficas)
- Lucide React (iconos)
- Mercado Pago SDK (preparado)

## Instalación

```bash
npm install
npm start
```

## Estructura

```
src/
├── components/
│   └── AuthModal.js       # Login/Registro
├── context/
│   └── AuthContext.js     # Estado de autenticación
├── data/
│   └── mockData.js        # Datos de ejemplo
├── pages/
│   ├── LandingPage.js     # Página pública
│   └── Dashboard.js       # Panel de cliente
├── App.js                 # Router principal
└── index.css              # Estilos globales
```

## Próximos Pasos para Producción

1. **Backend**: Conectar con API (Node.js/Firebase/Supabase)
2. **Base de datos**: PostgreSQL o MongoDB para usuarios, clases, reservas
3. **Mercado Pago**: Implementar checkout Pro
4. **Notificaciones**: Email/SMS para recordatorios
5. **App móvil**: React Native o PWA

## Contacto

Boot Camp Training  
Av. Uruguay 1532, Montevideo  
bootcamp.uy
