export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  durationMinutes: number;
  price: number;
  advanceAmount: number;
  instructions: string[];
};

export const services: Service[] = [
  {
    slug: "terapia-fisica-y-rehabilitacion",
    name: "Terapia física y rehabilitación",
    tagline: "Alivio del dolor y recuperación funcional",
    description:
      "Programas de tratamiento para cervicalgia, lumbalgia y lesiones —esguinces, tendinitis, bursitis—, incluidas las lesiones deportivas. Cada plan empieza con una valoración profesional y avanza con objetivos medibles, apoyado en nuestros equipos de fisioterapia.",
    highlights: [
      "Cervicalgia y lumbalgia",
      "Esguinces, tendinitis y bursitis",
      "Lesiones deportivas",
      "Ultrasonido, TENS, láser",
      "Punción seca y ventosas",
    ],
    durationMinutes: 60,
    price: 120,
    advanceAmount: 40,
    instructions: [
      "Llega 10 minutos antes de tu cita.",
      "Viste ropa cómoda que permita evaluar la zona afectada.",
      "Trae informes médicos o estudios previos si los tienes.",
    ],
  },
  {
    slug: "masaje-antiestres",
    name: "Masaje antiestrés ALMAE",
    tagline: "Relajación profunda, estilo ALMAE",
    description:
      "Una experiencia de masaje que combina tres técnicas al estilo ALMAE: masaje holístico (energético), masaje relajante y masaje terapéutico. El equilibrio perfecto para soltar tensiones y volver a tu rutina con energía.",
    highlights: [
      "Masaje holístico (energético)",
      "Masaje relajante",
      "Masaje terapéutico",
    ],
    durationMinutes: 60,
    price: 110,
    advanceAmount: 40,
    instructions: [
      "Evita comidas abundantes justo antes de la sesión.",
      "Comunica en la reserva las zonas de mayor tensión.",
    ],
  },
  {
    slug: "masaje-reductor",
    name: "Masaje reductor",
    tagline: "Contorno, circulación y bienestar",
    description:
      "Tratamiento que incluye drenaje linfático brasileño y moldeamiento, complementado con maderoterapia: técnicas orientadas a estimular la circulación, reducir medidas y mejorar la apariencia de la piel con un plan por sesiones.",
    highlights: [
      "Drenaje linfático brasileño",
      "Moldeamiento",
      "Maderoterapia",
    ],
    durationMinutes: 60,
    price: 120,
    advanceAmount: 40,
    instructions: [
      "Hidrátate bien antes y después de la sesión.",
      "Consulta los paquetes por WhatsApp para mejores resultados.",
    ],
  },
  {
    slug: "reflexologia-facial-y-podal",
    name: "Reflexología facial y podal",
    tagline: "Tensión liberada en rostro y pies",
    description:
      "Técnica de masaje orientada a la liberación de tensión en puntos energéticos del rostro y los pies. Ideal para aliviar la fatiga acumulada, mejorar tu descanso y sentir alivio inmediato.",
    highlights: [
      "Puntos energéticos faciales",
      "Reflexología podal",
      "Liberación de tensión",
    ],
    durationMinutes: 45,
    price: 90,
    advanceAmount: 30,
    instructions: [
      "Llega con el rostro sin maquillaje si es posible.",
      "Informa cualquier lesión en pies o tobillos.",
    ],
  },
];

export function getService(slug: string): Service | null {
  return services.find((s) => s.slug === slug) ?? null;
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
      "Contamos con ultrasonido, corriente TENS, láser, punción seca y ventosas, además de técnicas manuales, maderoterapia y reflexología según el servicio elegido.",
  },
  {
    question: "¿Cómo obtengo el reembolso del adelanto si cancelo?",
    answer:
      "Depende del plazo de aviso y del medio de pago, conforme a la política de reservas publicada. Ante cualquier duda, escríbenos por WhatsApp y lo resolvemos contigo.",
  },
];

export const scheduleNote =
  "Horario de referencia (provisional): lunes a viernes 8:00–13:00 y 16:00–20:00; sábados 9:00–13:00. Se confirmará con la agenda oficial.";
