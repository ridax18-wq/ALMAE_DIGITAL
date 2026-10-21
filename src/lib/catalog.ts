export type ServiceVariant = {
  durationMinutes: number;
  priceCents: number;
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
  "Viste ropa cÃ³moda que permita evaluar la zona afectada.",
  "Trae informes mÃ©dicos o estudios previos si los tienes.",
];

export const services: Service[] = [
  {
    slug: "terapia-fisica-y-rehabilitacion-consultorio",
    name: "Terapia fÃ­sica y rehabilitaciÃ³n",
    location: "consultorio",
    tagline: "Alivio del dolor y recuperaciÃ³n funcional",
    description:
      "Programas de tratamiento para cervicalgia, lumbalgia y lesiones â€”esguinces, tendinitis, bursitisâ€”, incluidas las lesiones deportivas. Cada plan empieza con una valoraciÃ³n profesional y avanza con objetivos medibles, con atenciÃ³n personalizada.",
    highlights: [
      "Cervicalgia y lumbalgia",
      "Esguinces, tendinitis y bursitis",
      "Lesiones deportivas",
      "Ultrasonido, TENS y lÃ¡ser",
      "PunciÃ³n seca y ventosas",
    ],
    variants: [
      {
        durationMinutes: 60,
        priceCents: 5000,
        provisionalDuration: true,
      },
    ],
    bookable: true,
    instructions: INSTRUCCIONES_TERAPEUTICO,
  },
  {
    slug: "masaje-antiestres-consultorio",
    name: "Masaje antiestrÃ©s",
    location: "consultorio",
    tagline: "RelajaciÃ³n y bienestar en nuestro consultorio",
    description:
      "Un masaje al estilo ALMAE que libera la tensiÃ³n acumulada del cuello, la espalda y los hombros. Ideal para recuperar calma, descansar mejor y cuidar tu cuerpo con manos profesionales.",
    highlights: [
      "TensiÃ³n en cuello y espalda",
      "RelajaciÃ³n profunda",
      "Mejora tu descanso",
    ],
    variants: [
      { durationMinutes: 60, priceCents: 7000 },
      { durationMinutes: 90, priceCents: 9000 },
    ],
    bookable: true,
    instructions: [
      "Evita comidas abundantes justo antes de la sesiÃ³n.",
      "Comunica al reservar las zonas de mayor tensiÃ³n.",
    ],
  },
  {
    slug: "masaje-reductor-consultorio",
    name: "Masaje estÃ©tico reductor",
    location: "consultorio",
    tagline: "Contorno, circulaciÃ³n y bienestar",
    description:
      "Tratamiento personalizado que combina drenaje linfÃ¡tico, moldeamiento y maderoterapia para estimular la circulaciÃ³n, reducir medidas y realzar tu bienestar, con un plan por sesiones.",
    highlights: [
      "Drenaje linfÃ¡tico",
      "Moldeamiento",
      "Maderoterapia",
    ],
    variants: [{ durationMinutes: 90, priceCents: 15000 }],
    bookable: true,
    instructions: [
      "HidrÃ¡tate bien antes y despuÃ©s de la sesiÃ³n.",
      "Consulta los paquetes por WhatsApp para mejores resultados.",
    ],
  },
  {
    slug: "reflexologia-consultorio",
    name: "ReflexologÃ­a podal y facial",
    location: "consultorio",
    tagline: "RelajaciÃ³n y bienestar de pies a rostro",
    description:
      "TÃ©cnica de masaje orientada a la liberaciÃ³n de tensiÃ³n en puntos energÃ©ticos de rostro y pies. Ideal para aliviar la fatiga acumulada, mejorar tu descanso y sentir alivio inmediato.",
    highlights: [
      "Puntos energÃ©ticos faciales",
      "ReflexologÃ­a podal",
      "LiberaciÃ³n de tensiÃ³n",
    ],
    variants: [{ durationMinutes: 60, priceCents: 6000 }],
    bookable: true,
    instructions: [
      "Llega con el rostro sin maquillaje si es posible.",
      "Informa cualquier lesiÃ³n en pies o tobillos.",
    ],
  },
  {
    slug: "acupuntura",
    name: "Acupuntura",
    location: "consultorio",
    tagline: "Medicina oriental para tu equilibrio",
    description:
      "Sesiones de acupuntura para el manejo del dolor, la tensiÃ³n muscular y el equilibrio general del cuerpo, aplicadas con tÃ©cnica profesional y protocolos de bioseguridad.",
    highlights: [
      "Manejo del dolor",
      "TensiÃ³n muscular",
      "Equilibrio general",
    ],
    variants: [],
    bookable: false,
    instructions: [
      "SesiÃ³n disponible prÃ³ximamente en la reserva en lÃ­nea.",
      "Mientras tanto, consulta horarios y valores por WhatsApp.",
    ],
  },
  {
    slug: "entrenamiento-fisico",
    name: "Entrenamiento fÃ­sico",
    location: "consultorio",
    tagline: "Fortalece tu cuerpo, previene lesiones",
    description:
      "Sesiones de acondicionamiento y fortalecimiento guiadas profesionalmente: fuerza, movilidad y prevenciÃ³n de lesiones, adaptadas a tu nivel y objetivos.",
    highlights: [
      "Fuerza y movilidad",
      "PrevenciÃ³n de lesiones",
      "Adaptado a tu nivel",
    ],
    variants: [],
    bookable: false,
    instructions: [
      "SesiÃ³n disponible prÃ³ximamente en la reserva en lÃ­nea.",
      "Mientras tanto, consulta horarios y valores por WhatsApp.",
    ],
  },
  {
    slug: "terapia-fisica-y-rehabilitacion-domicilio",
    name: "Terapia fÃ­sica y rehabilitaciÃ³n",
    location: "domicilio",
    tagline: "AtenciÃ³n personalizada en la comodidad de tu hogar",
    description:
      "El mismo programa de terapia fÃ­sica y rehabilitaciÃ³n, llevado a tu casa con equipamiento portÃ¡til. Ideal para postoperatorios, personas con movilidad reducida o agendas ajustadas.",
    highlights: [
      "Postoperatorios",
      "Movilidad reducida",
      "Equipamiento portÃ¡til",
    ],
    variants: [
      {
        durationMinutes: 60,
        priceCents: 8000,
        provisionalDuration: true,
      },
    ],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio cÃ³modo y ventilado para la sesiÃ³n.",
    ],
  },
  {
    slug: "masaje-antiestres-domicilio",
    name: "Masaje antiestrÃ©s",
    location: "domicilio",
    tagline: "RelajaciÃ³n sin salir de casa",
    description:
      "Disfruta del masaje antiestrÃ©s al estilo ALMAE en la comodidad de tu hogar: la profesional llega con todo lo necesario para una sesiÃ³n completa de relajaciÃ³n.",
    highlights: [
      "Sin salir de casa",
      "Kit portÃ¡til completo",
      "Horario a tu medida",
    ],
    variants: [
      { durationMinutes: 60, priceCents: 12000 },
      { durationMinutes: 90, priceCents: 15000 },
    ],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio tranquilo para la sesiÃ³n.",
    ],
  },
  {
    slug: "masaje-reductor-domicilio",
    name: "Masaje estÃ©tico reductor",
    location: "domicilio",
    tagline: "Bienestar y cuidado profesional en tu hogar",
    description:
      "El programa reductor â€”drenaje linfÃ¡tico, moldeamiento y maderoterapiaâ€” aplicado en tu casa, con seguimiento personalizado por sesiones.",
    highlights: [
      "Drenaje linfÃ¡tico",
      "Moldeamiento y maderoterapia",
      "Seguimiento por sesiones",
    ],
    variants: [{ durationMinutes: 90, priceCents: 20000 }],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio cÃ³modo y ventilado para la sesiÃ³n.",
    ],
  },
  {
    slug: "reflexologia-domicilio",
    name: "ReflexologÃ­a podal y facial",
    location: "domicilio",
    tagline: "Bienestar y relajaciÃ³n sin salir de casa",
    description:
      "La reflexologÃ­a podal y facial, en la comodidad de tu hogar: liberaciÃ³n de tensiÃ³n en puntos energÃ©ticos de rostro y pies, con la comodidad de no desplazarte.",
    highlights: [
      "ReflexologÃ­a podal",
      "Puntos energÃ©ticos faciales",
      "Sin desplazarte",
    ],
    variants: [{ durationMinutes: 60, priceCents: 7000 }],
    bookable: false,
    instructions: [
      "El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones.",
      "Prepara un espacio tranquilo para la sesiÃ³n.",
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
    question: "Â¿Necesito una orden mÃ©dica para empezar?",
    answer:
      "No es obligatorio para la valoraciÃ³n inicial. Si durante la evaluaciÃ³n encontramos seÃ±ales que requieren atenciÃ³n mÃ©dica, te lo indicaremos con claridad y te orientaremos al respecto.",
  },
  {
    question: "¿Cómo funciona la reserva con adelanto?",
    answer:
      "Eliges tu servicio, fecha y hora; ingresas tus datos de contacto y tu horario queda separado 15 minutos. Luego coordinas el pago del adelanto por WhatsApp con ALMAE y, al verificar tu pago, confirmamos tu cita en el sistema.",
  },
  {
    question: "Â¿Atienden a domicilio?",
    answer:
      "SÃ­. La terapia fÃ­sica y los masajes se ofrecen tambiÃ©n a domicilio, coordinados por WhatsApp: definimos juntos la zona, el horario y las indicaciones para la sesiÃ³n en tu casa.",
  },
  {
    question: "Â¿Puedo reprogramar mi cita?",
    answer:
      "SÃ­. Desde el enlace de tu reserva puedes solicitar una reprogramaciÃ³n con anticipaciÃ³n suficiente, segÃºn la polÃ­tica de reservas publicada.",
  },
  {
    question: "Â¿QuÃ© pasa si no puedo asistir?",
    answer:
      "Puedes cancelar o reprogramar desde tu enlace de reserva hasta el plazo indicado en la polÃ­tica de reservas. Te recomendamos avisar con la mayor anticipaciÃ³n posible para que el horario pueda atender a otra persona.",
  },
  {
    question: "Â¿QuÃ© tÃ©cnicas y equipos utilizan?",
    answer:
      "Contamos con ultrasonido, corriente TENS, lÃ¡ser, punciÃ³n seca y ventosas, ademÃ¡s de tÃ©cnicas manuales, maderoterapia, acupuntura y reflexologÃ­a segÃºn el servicio elegido.",
  },
  {
    question: "Â¿CÃ³mo obtengo el reembolso del adelanto si cancelo?",
    answer:
      "Depende del plazo de aviso y del medio de pago, conforme a la polÃ­tica de reservas publicada. Ante cualquier duda, escrÃ­benos por WhatsApp y lo resolvemos contigo.",
  },
];

export const scheduleNote =
  "Horario de referencia (provisional): lunes a viernes 8:00â€“13:00 y 16:00â€“20:00; sÃ¡bados 9:00â€“13:00. Se confirmarÃ¡ con la agenda oficial.";
