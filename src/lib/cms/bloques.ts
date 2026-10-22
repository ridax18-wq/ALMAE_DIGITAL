import { z } from "zod";
import { faqs as faqsDefecto } from "@/lib/faqs";

export const LIMITE_CAMPO = 300;
export const LIMITE_TEXTO = 2000;
export const LIMITE_LISTA = 12;

export function limpiarTexto(valor: string, max: number): string {
  let salida = "";
  for (const ch of valor.replace(/[<>]/g, "")) {
    const codigo = ch.codePointAt(0) ?? 0;
    if (codigo < 32 || codigo === 127) continue;
    salida += ch;
  }
  return salida.trim().slice(0, max);
}

const texto = (max = LIMITE_CAMPO) =>
  z
    .string()
    .transform((v) => limpiarTexto(v, max))
    .pipe(z.string().max(max));

const listaTextos = z
  .array(texto())
  .min(1)
  .max(LIMITE_LISTA)
  .transform((v) => v.map((x) => x.trim()).filter(Boolean));

const parTitulo = z.object({ title: texto(), text: texto(LIMITE_TEXTO) });
const itemFaq = z.object({ question: texto(), answer: texto(LIMITE_TEXTO) });

export const esquemas = {
  hero_home: z.object({
    eyebrow: texto(),
    title: texto(),
    description: texto(LIMITE_TEXTO),
    cta_primario: texto(60),
    cta_secundario: texto(60),
    beneficios: z.array(texto(80)).min(1).max(5),
  }),
  home_como_funciona: z.object({
    visible: z.boolean(),
    title: texto(),
    pasos: z.array(parTitulo).min(1).max(6),
  }),
  home_especialista: z.object({
    title: texto(),
    text: texto(LIMITE_TEXTO),
  }),
  home_promociones: z.object({
    visible: z.boolean(),
    title: texto(),
    text: texto(LIMITE_TEXTO),
  }),
  home_cta_final: z.object({
    title: texto(),
    text: texto(LIMITE_TEXTO),
    cta_primario: texto(60),
    cta_secundario: texto(60),
  }),
  intro_nosotros: z.object({
    hero_title: texto(),
    hero_description: texto(LIMITE_TEXTO),
    seccion_title: texto(),
    parrafos: listaTextos,
  }),
  servicios_intro: z.object({
    title: texto(),
    description: texto(LIMITE_TEXTO),
  }),
  contacto_intro: z.object({
    title: texto(),
    description: texto(LIMITE_TEXTO),
  }),
  faq_section: z.object({
    eyebrow: texto(),
    title: texto(),
    items: z.array(itemFaq).min(1).max(LIMITE_LISTA),
  }),
  footer_intro: z.object({
    text: texto(LIMITE_TEXTO),
  }),
} as const;

export type ClaveBloque = keyof typeof esquemas;
export type CuerpoBloque<K extends ClaveBloque> = z.infer<(typeof esquemas)[K]>;

export type Campo =
  | { nombre: string; etiqueta: string; tipo: "texto"; max?: number }
  | { nombre: string; etiqueta: string; tipo: "area" }
  | { nombre: string; etiqueta: string; tipo: "check" }
  | { nombre: string; etiqueta: string; tipo: "lista_textos" }
  | { nombre: string; etiqueta: string; tipo: "lista_pares"; etiquetaItem: string }
  | { nombre: string; etiqueta: string; tipo: "faq" };

export type DefBloque = {
  clave: ClaveBloque;
  pagina: string;
  descripcion: string;
  campos: Campo[];
  paths: string[];
  layout?: boolean;
  defecto: Record<string, unknown>;
};

export const BLOQUES: DefBloque[] = [
  {
    clave: "hero_home",
    pagina: "Inicio",
    descripcion: "Portada: t\u00edtulo principal, descripci\u00f3n y botones de acci\u00f3n.",
    campos: [
      { nombre: "eyebrow", etiqueta: "Texto superior", tipo: "texto" },
      { nombre: "title", etiqueta: "T\u00edtulo principal", tipo: "texto" },
      { nombre: "description", etiqueta: "Descripci\u00f3n", tipo: "area" },
      { nombre: "cta_primario", etiqueta: "Bot\u00f3n principal (texto)", tipo: "texto", max: 60 },
      { nombre: "cta_secundario", etiqueta: "Bot\u00f3n WhatsApp (texto)", tipo: "texto", max: 60 },
      { nombre: "beneficios", etiqueta: "Beneficios destacados", tipo: "lista_textos" },
    ],
    paths: ["/"],
    defecto: {
      eyebrow: "Fisioterapia, rehabilitaci\u00f3n y bienestar",
      title: "Tu bienestar comienza con el movimiento",
      description:
        "En ALMAE te acompa\u00f1amos con atenci\u00f3n personalizada en fisioterapia, rehabilitaci\u00f3n y bienestar, para ayudarte a recuperar movimiento, funcionalidad y calidad de vida.",
      cta_primario: "Agendar mi cita",
      cta_secundario: "Consultar por WhatsApp",
      beneficios: [
        "Confirmaci\u00f3n con adelanto verificado",
        "Horarios en tiempo real",
        "Coordinaci\u00f3n por WhatsApp",
      ],
    },
  },
  {
    clave: "home_como_funciona",
    pagina: "Inicio",
    descripcion: "Secci\u00f3n C\u00f3mo funciona: pasos para reservar.",
    campos: [
      { nombre: "visible", etiqueta: "Mostrar secci\u00f3n", tipo: "check" },
      { nombre: "title", etiqueta: "T\u00edtulo de secci\u00f3n", tipo: "texto" },
      { nombre: "pasos", etiqueta: "Pasos", tipo: "lista_pares", etiquetaItem: "Paso" },
    ],
    paths: ["/"],
    defecto: {
      visible: true,
      title: "Reservar tu cita es muy simple",
      pasos: [
        { title: "Elige tu terapia", text: "Selecciona el servicio que necesitas entre nuestros tratamientos." },
        { title: "Selecciona fecha y hora", text: "Ver\u00e1s los horarios disponibles y reservas el que mejor te acomode." },
        { title: "Coordinas tu adelanto", text: "Tu horario queda separado 15 minutos; el adelanto se coordina por WhatsApp." },
        { title: "Recibe tu confirmaci\u00f3n", text: "ALMAE verifica tu pago y confirma tu cita; guardas el enlace para revisarla." },
      ],
    },
  },
  {
    clave: "home_especialista",
    pagina: "Inicio",
    descripcion: "Secci\u00f3n Tu especialista.",
    campos: [
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "text", etiqueta: "Texto", tipo: "area" },
    ],
    paths: ["/"],
    defecto: {
      title: "Atenci\u00f3n profesional dedicada",
      text: "Cada sesi\u00f3n es atendida personalmente por nuestra profesional: valoraci\u00f3n cuidadosa, explicaci\u00f3n clara de tu condici\u00f3n y un plan de trabajo realista, con t\u00e9cnicas manuales y los equipos adecuados para cada caso.",
    },
  },
  {
    clave: "home_promociones",
    pagina: "Inicio",
    descripcion: "Secci\u00f3n de promociones del inicio.",
    campos: [
      { nombre: "visible", etiqueta: "Mostrar secci\u00f3n", tipo: "check" },
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "text", etiqueta: "Texto", tipo: "area" },
    ],
    paths: ["/"],
    defecto: {
      visible: true,
      title: "Beneficios y novedades",
      text: "No publicamos ofertas sin aprobaci\u00f3n y configuraci\u00f3n administrativa. Cuando existan promociones vigentes, las encontrar\u00e1s aqu\u00ed y en nuestra p\u00e1gina de promociones.",
    },
  },
  {
    clave: "home_cta_final",
    pagina: "Inicio",
    descripcion: "Llamada final del inicio.",
    campos: [
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "text", etiqueta: "Texto", tipo: "area" },
      { nombre: "cta_primario", etiqueta: "Bot\u00f3n principal (texto)", tipo: "texto", max: 60 },
      { nombre: "cta_secundario", etiqueta: "Bot\u00f3n WhatsApp (texto)", tipo: "texto", max: 60 },
    ],
    paths: ["/"],
    defecto: {
      title: "\u00bfListo para empezar tu recuperaci\u00f3n?",
      text: "Reserva tu cita en minutos: eliges horario, coordinas el adelanto por WhatsApp y tu espacio queda asegurado.",
      cta_primario: "Agendar cita",
      cta_secundario: "Hacer una consulta",
    },
  },
  {
    clave: "intro_nosotros",
    pagina: "Nosotros",
    descripcion: "Portada y texto de la p\u00e1gina Nosotros.",
    campos: [
      { nombre: "hero_title", etiqueta: "T\u00edtulo de portada", tipo: "texto" },
      { nombre: "hero_description", etiqueta: "Descripci\u00f3n de portada", tipo: "area" },
      { nombre: "seccion_title", etiqueta: "T\u00edtulo de secci\u00f3n", tipo: "texto" },
      { nombre: "parrafos", etiqueta: "P\u00e1rrafos (uno por l\u00ednea)", tipo: "lista_textos" },
    ],
    paths: ["/nosotros"],
    defecto: {
      hero_title: "Bienestar con criterio, trato con calidez",
      hero_description:
        "ALMAE Terapia y Spa nace con la idea de que la recuperaci\u00f3n debe explicarse con claridad y vivirse con tranquilidad: profesionales dedicados, procesos simples y trato humano.",
      seccion_title: "Una consulta enfocada en ti",
      parrafos: [
        "Somos una consulta de fisioterapia, rehabilitaci\u00f3n y bienestar en Lima. Atendemos de forma presencial con nuestra profesional, para que cada persona reciba tiempo, atenci\u00f3n y explicaciones claras sobre su condici\u00f3n.",
        "Trabajamos con un enfoque funcional: primero entender el origen del problema, luego un plan de tratamiento medible y ajustable, y siempre con indicaciones que puedes practicar desde casa.",
        "Adem\u00e1s de la terapia f\u00edsica y la rehabilitaci\u00f3n, cuidamos el bienestar integral con masajes antiestr\u00e9s, masaje reductor y reflexolog\u00eda facial y podal.",
      ],
    },
  },
  {
    clave: "servicios_intro",
    pagina: "Servicios",
    descripcion: "Textos generales de la p\u00e1gina Servicios.",
    campos: [
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "description", etiqueta: "Descripci\u00f3n", tipo: "area" },
    ],
    paths: ["/servicios"],
    defecto: {
      title: "Servicios para tu recuperaci\u00f3n y bienestar",
      description:
        "Atenci\u00f3n presencial en nuestro consultorio del R\u00edmac y tambi\u00e9n a domicilio. Los servicios a domicilio y las sesiones en definici\u00f3n de precio se coordinan por WhatsApp.",
    },
  },
  {
    clave: "contacto_intro",
    pagina: "Contacto",
    descripcion: "Textos de la p\u00e1gina Contacto.",
    campos: [
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "description", etiqueta: "Descripci\u00f3n", tipo: "area" },
    ],
    paths: ["/contacto"],
    defecto: {
      title: "Hablemos por WhatsApp",
      description:
        "La forma m\u00e1s r\u00e1pida de contactarnos es WhatsApp. Elige el motivo de tu consulta y te responderemos en horario de atenci\u00f3n.",
    },
  },
  {
    clave: "faq_section",
    pagina: "Preguntas frecuentes",
    descripcion: "Preguntas y respuestas del inicio.",
    campos: [
      { nombre: "eyebrow", etiqueta: "Texto superior", tipo: "texto" },
      { nombre: "title", etiqueta: "T\u00edtulo", tipo: "texto" },
      { nombre: "items", etiqueta: "Preguntas", tipo: "faq" },
    ],
    paths: ["/"],
    defecto: {
      eyebrow: "Preguntas frecuentes",
      title: "Dudas comunes antes de reservar",
      items: faqsDefecto,
    },
  },
  {
    clave: "footer_intro",
    pagina: "Pie de p\u00e1gina",
    descripcion: "Texto descriptivo del pie de p\u00e1gina (en todas las p\u00e1ginas).",
    campos: [{ nombre: "text", etiqueta: "Texto", tipo: "area" }],
    paths: ["/"],
    layout: true,
    defecto: {
      text: "Fisioterapia, rehabilitaci\u00f3n y bienestar. Atenci\u00f3n presencial con un profesional dedicado en Lima.",
    },
  },
];

export const MAPA_BLOQUES = new Map<string, DefBloque>(BLOQUES.map((b) => [b.clave, b]));

export function esClaveBloque(valor: string): valor is ClaveBloque {
  return MAPA_BLOQUES.has(valor);
}

export function cuerpoDefecto<K extends ClaveBloque>(clave: K): CuerpoBloque<K> {
  const def = MAPA_BLOQUES.get(clave);
  return esquemas[clave].parse(def?.defecto ?? {}) as CuerpoBloque<K>;
}

export function validarCuerpo<K extends ClaveBloque>(
  clave: K,
  cuerpo: unknown,
): CuerpoBloque<K> {
  return esquemas[clave].parse(cuerpo) as CuerpoBloque<K>;
}
