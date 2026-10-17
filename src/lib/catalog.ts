export type ServiceVariant = {
  durationMinutes: number;
  price: number;
  provisionalDuration?: boolean;
};

export type ServiceLocation = "consultorio" | "domicilio";

export type Service = {
  slug: string;
  name: string;
  location: ServiceLocation;
  tagline: string;
  description: string;
  highlights: string[];
  variants: ServiceVariant[];
  bookable: boolean;
  instructions: string[];
};

const INSTRUCCIONES_TERAPEUTICO = [
  "Llega 10 minutos antes de tu cita.",
  "Viste ropa cómoda que permita evaluar la zona afectada.",
  "Trae informes médicos o estudios previos si los tienes.",
];

export const services: Service[] = [
  {
    slug: "terapia-fisica-y-rehabilitacion-consultorio",
    name: "Terapia física y rehabilitación",
    location: "consultorio",
    tagline: "Alivio del dolor y recuperación funcional",
    description:
      "Programas de tratamiento para cervicalgia, lumbalgia y lesiones —esguinces, tendinitis, bursitis—, incluidas las lesiones deportivas. Cada plan empieza con una valoración profesional y avanza con objetivos medibles, con atención personalizada.",
    highlights: [
      "Cervicalgia y lumbalgia",
      "Esguinces, tendinitis y bursitis",
      "Lesiones deportivas",
      "Ultrasonido, TENS y láser",
      "Punción seca y ventosas",
    ],
    variants: [
      {
        durationMinutes: 60,
        price: 50,
        provisionalDuration: true,
      },
    ],
    bookable: true,
    instructions: INSTRUCCIONES_TERAPEUTICO,
  },
  {
    slug: "masaje-antiestres-consultorio",
    name: "Masaje antiestrés",
    location: "consultorio",
    tagline: "Relajación y bienestar en nuestro consultorio",
    description:
      "Un masaje al estilo ALMAE que libera la tensión acumulada del cuello, la espalda y los hombros. Ideal para recuperar calma, descansar mejor y cuidar tu cuerpo con manos profesionales.",
    highlights: [
      "Tensión en cuello y espalda",
      "Relajación profunda",
      "Mejora tu descanso",
    ],
    variants: [
      { durationMinutes: 60, price: 70 },
      { durationMinutes: 90, price: 90 },
    ],
    bookable: true,
    instructions: [
      "Evita comidas abundantes justo antes de la sesión.",
      "Comunica al reservar las zonas de mayor tensión.",
    ],
  },
  {
    slug: "masaje-reductor-consultorio",
    name: "Masaje estético reductor",
    location: "consultorio",
    tagline: "Contorno, circulación y bienestar",
    description:
      "Tratamiento personalizado que combina drenaje linfático, moldeamiento y maderoterapia para estimular la circulación, reducir medidas y realzar tu bienestar, con un plan por sesiones.",
    highlights: [
      "Drenaje linfático",
      "Moldeamiento",
      "Maderoterapia",
    ],
    variants: [{ durationMinutes: 90, price: 150 }],
    bookable: true,
    instructions: [
      "Hidrátate bien antes y después de la sesión.",
      "Consulta los paquetes por WhatsApp para mejores resultados.",
    ],
  },
  {
    slug: "reflexologia-consultorio",
    name: "Reflexología podal y facial",
    location: "consultorio",
    tagline: "Relajación y bienestar de pies a rostro",
    description:
      "Técnica de masaje orientada a la liberación de tensión en puntos energéticos de rostro y pies. Ideal para aliviar la fatiga acumulada, mejorar tu descanso y sentir alivio inmediato.",
    highlights: [
      "Puntos energéticos faciales",
      "Reflexología podal",
      "Liberación de tensión",
    ],
    variants: [{ durationMinutes: 60, price: 60 }],
    bookable: true,
    instructions: [
      "Llega con el rostro sin maquillaje si es posible.",
      "Informa cualquier lesión en pies o tobillos.",
    ],
  },
  {
    slug: "acupuntura",
    name: "Acupuntura",
    location: "consultorio",
    tagline: "Medicina oriental para tu equilibrio",
    description:
      "Sesiones de acupuntura para el manejo del dolor, la tensión muscular y el equilibrio general del cuerpo, aplicadas con técnica profesional y protocolos de bioseguridad.",
    highlights: [
      "Manejo del dolor",
      "Tensión muscular",
      "Equilibrio general",
    ],
    variants: [],
    bookable: false,
    instructions: [
      "Sesión disponible próximamente en la reserva en línea.",
      "Mientras tanto, consulta horarios y valores por WhatsApp.",
    ],
  },
  {
    slug: "entrenamiento-fisico",
    name: "Entrenamiento físico",
    location: "consultorio",
    tagline: "Fortalece tu cuerpo, previene lesiones",
    description:
      "Sesiones de acondicionamiento y fortalecimiento guiadas profesionalmente: fuerza, movilidad y prevención de lesiones, adaptadas a tu nivel y objetivos.",
    highlights: [
      "Fuerza y movilidad",
      "Prevención de lesiones",
      "Adaptado a tu nivel",
    ],
    variants: [],
    bookable: false,
    instructions: [
      "Sesión disponible próximamente en la reserva en línea.",
      "Mientras tanto, consulta horarios y valores por WhatsApp.",
    ],
  },
  {
    slug: "terapia-fisica-y-rehabilitacion-domicilio",
    name: "Terapia física y rehabilitación",
    location: "domicilio",
    tagline: "Atención personalizada en la comodidad de tu hogar",
    description:
      "El mismo programa de terapia física y rehabilitación, llevado a tu casa con equipamiento portátil. Ideal para postoperatorios, personas con movilidad reducida o agendas ajustadas.",
    highlights: [
      "Postoperatorios",
      "Movilidad reducida",
      "Equipamiento portátil",
    ],
    variants: [
      {
        durationMinutes: 60,
        price: 80,
        provisionalDuration: true,
      },
    ],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio cómodo y ventilado para la sesión.",
    ],
  },
  {
    slug: "masaje-antiestres-domicilio",
    name: "Masaje antiestrés",
    location: "domicilio",
    tagline: "Relajación sin salir de casa",
    description:
      "Disfruta del masaje antiestrés al estilo ALMAE en la comodidad de tu hogar: la profesional llega con todo lo necesario para una sesión completa de relajación.",
    highlights: [
      "Sin salir de casa",
      "Kit portátil completo",
      "Horario a tu medida",
    ],
    variants: [
      { durationMinutes: 60, price: 120 },
      { durationMinutes: 90, price: 150 },
    ],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio tranquilo para la sesión.",
    ],
  },
  {
    slug: "masaje-reductor-domicilio",
    name: "Masaje estético reductor",
    location: "domicilio",
    tagline: "Bienestar y cuidado profesional en tu hogar",
    description:
      "El programa reductor —drenaje linfático, moldeamiento y maderoterapia— aplicado en tu casa, con seguimiento personalizado por sesiones.",
    highlights: [
      "Drenaje linfático",
      "Moldeamiento y maderoterapia",
      "Seguimiento por sesiones",
    ],
    variants: [{ durationMinutes: 90, price: 200 }],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio cómodo y ventilado para la sesión.",
    ],
  },
  {
    slug: "reflexologia-domicilio",
    name: "Reflexología podal y facial",
    location: "domicilio",
    tagline: "Bienestar y relajación sin salir de casa",
    description:
      "La reflexología podal y facial, en la comodidad de tu hogar: liberación de tensión en puntos energéticos de rostro y pies, con la comodidad de no desplazarte.",
    highlights: [
      "Reflexología podal",
      "Puntos energéticos faciales",
      "Sin desplazarte",
    ],
    variants: [{ durationMinutes: 60, price: 70 }],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio tranquilo para la sesión.",
    ],
  },
];

export function getService(slug: string): Service | null {
  return services.find((s) => s.slug === slug) ?? null;
}

export function servicesByLocation(location: ServiceLocation): Service[] {
  return services.filter((s) => s.location === location);
}

export type FaqItem = { question: string; answer: string };

export const faqs: FaqItem[] = [
  {
    question: "¿Necesito una orden médica para empezar?",
    answer:
      "No es obligatorio para la valoración inicial. Si durante la evaluación encontramos señales que requieren atención médica, te lo indicaremos con claridad y te orientaremos al respecto.",
  },
  {
    question: "¿Cómo funciona la reserva con adelanto?",
    answer:
      "Eliges tu servicio, fecha y hora; ingresas tus datos de contacto y pagas un adelanto para confirmar. El horario queda reservado para ti unos minutos mientras pagas; si no se completa, queda disponible de nuevo.",
  },
  {
    question: "¿Atienden a domicilio?",
    answer:
      "Sí. La terapia física y los masajes se ofrecen también a domicilio, coordinados por WhatsApp: definimos juntos la zona, el horario y las indicaciones para la sesión en tu casa.",
  },
  {
    question: "¿Puedo reprogramar mi cita?",
    answer:
      "Sí. Desde el enlace de tu reserva puedes solicitar una reprogramación con anticipación suficiente, según la política de reservas publicada.",
  },
  {
    question: "¿Qué pasa si no puedo asistir?",
    answer:
      "Puedes cancelar o reprogramar desde tu enlace de reserva hasta el plazo indicado en la política de reservas. Te recomendamos avisar con la mayor anticipación posible para que el horario pueda atender a otra persona.",
  },
  {
    question: "¿Qué técnicas y equipos utilizan?",
    answer:
      "Contamos con ultrasonido, corriente TENS, láser, punción seca y ventosas, además de técnicas manuales, maderoterapia, acupuntura y reflexología según el servicio elegido.",
  },
  {
    question: "¿Cómo obtengo el reembolso del adelanto si cancelo?",
    answer:
      "Depende del plazo de aviso y del medio de pago, conforme a la política de reservas publicada. Ante cualquier duda, escríbenos por WhatsApp y lo resolvemos contigo.",
  },
];

export const scheduleNote =
  "Horario de referencia (provisional): lunes a viernes 8:00–13:00 y 16:00–20:00; sábados 9:00–13:00. Se confirmará con la agenda oficial.";
