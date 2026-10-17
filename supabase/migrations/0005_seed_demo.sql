-- ALMAE DIGITAL — 0005: datos de demostración y configuración inicial
-- Datos marcados _DEMO hasta recibir la información oficial.
-- Precios tomados de las tarjetas oficiales aportadas por el propietario.

-- =====================================================================
-- Configuración del negocio
-- =====================================================================
insert into business_settings (
  timezone, currency,
  booking_hold_ttl_minutes, booking_gap_minutes,
  min_booking_lead_hours, max_advance_days, cancellation_policy_hours,
  whatsapp_number, address_public
) values (
  'America/Lima', 'PEN',
  10, 15,
  3, 30, 24,
  '51919608174',
  'Altos del Rímac 250, Rímac — Lima, Perú (provisional)'
);

-- =====================================================================
-- Orígenes comerciales de demostración
-- =====================================================================
insert into marketing_sources (name, kind) values
  ('Condominio A (demo)', 'whatsapp_group'),
  ('Condominio B (demo)', 'whatsapp_group'),
  ('Estado de WhatsApp (demo)', 'status'),
  ('Instagram (demo)', 'instagram'),
  ('Recomendación de paciente (demo)', 'referral'),
  ('Directo (demo)', 'direct');

-- =====================================================================
-- Horario laboral semanal (provisional)
-- =====================================================================
insert into business_hours (weekday, opens_at, closes_at, break_start, break_end) values
  (1, '08:00', '20:00', '13:00', '16:00'),
  (2, '08:00', '20:00', '13:00', '16:00'),
  (3, '08:00', '20:00', '13:00', '16:00'),
  (4, '08:00', '20:00', '13:00', '16:00'),
  (5, '08:00', '20:00', '13:00', '16:00'),
  (6, '09:00', '13:00', null, null);

-- =====================================================================
-- Catálogo de servicios (real, según tarjetas oficiales del propietario)
-- =====================================================================
insert into services (slug, name, description, location, instructions, sort_order) values
  ('terapia-fisica-y-rehabilitacion-consultorio',
   'Terapia física y rehabilitación',
   'Programas de tratamiento para cervicalgia, lumbalgia y lesiones —esguinces, tendinitis, bursitis—, incluidas las lesiones deportivas. Cada plan empieza con una valoración profesional y avanza con objetivos medibles, con atención personalizada.',
   'consultorio',
   'Llega 10 minutos antes de tu cita. Viste ropa cómoda que permita evaluar la zona afectada. Trae informes médicos o estudios previos si los tienes.',
   1),
  ('masaje-antiestres-consultorio',
   'Masaje antiestrés',
   'Un masaje al estilo ALMAE que libera la tensión acumulada del cuello, la espalda y los hombros. Ideal para recuperar calma, descansar mejor y cuidar tu cuerpo con manos profesionales.',
   'consultorio',
   'Evita comidas abundantes justo antes de la sesión. Comunica al reservar las zonas de mayor tensión.',
   2),
  ('masaje-reductor-consultorio',
   'Masaje estético reductor',
   'Tratamiento personalizado que combina drenaje linfático, moldeamiento y maderoterapia para estimular la circulación, reducir medidas y realzar tu bienestar, con un plan por sesiones.',
   'consultorio',
   'Hidrátate bien antes y después de la sesión. Consulta los paquetes por WhatsApp para mejores resultados.',
   3),
  ('reflexologia-consultorio',
   'Reflexología podal y facial',
   'Técnica de masaje orientada a la liberación de tensión en puntos energéticos de rostro y pies. Ideal para aliviar la fatiga acumulada, mejorar tu descanso y sentir alivio inmediato.',
   'consultorio',
   'Llega con el rostro sin maquillaje si es posible. Informa cualquier lesión en pies o tobillos.',
   4),
  ('acupuntura',
   'Acupuntura',
   'Sesiones de acupuntura para el manejo del dolor, la tensión muscular y el equilibrio general del cuerpo, aplicadas con técnica profesional y protocolos de bioseguridad.',
   'consultorio',
   'Sesión disponible próximamente en la reserva en línea. Mientras tanto, consulta horarios y valores por WhatsApp.',
   5),
  ('entrenamiento-fisico',
   'Entrenamiento físico',
   'Sesiones de acondicionamiento y fortalecimiento guiadas profesionalmente: fuerza, movilidad y prevención de lesiones, adaptadas a tu nivel y objetivos.',
   'consultorio',
   'Sesión disponible próximamente en la reserva en línea. Mientras tanto, consulta horarios y valores por WhatsApp.',
   6),
  ('terapia-fisica-y-rehabilitacion-domicilio',
   'Terapia física y rehabilitación',
   'El mismo programa de terapia física y rehabilitación, llevado a tu casa con equipamiento portátil. Ideal para postoperatorios, personas con movilidad reducida o agendas ajustadas.',
   'domicilio',
   'El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones. Prepara un espacio cómodo y ventilado para la sesión.',
   7),
  ('masaje-antiestres-domicilio',
   'Masaje antiestrés',
   'Disfruta del masaje antiestrés al estilo ALMAE en la comodidad de tu hogar: la profesional llega con todo lo necesario para una sesión completa de relajación.',
   'domicilio',
   'El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones. Prepara un espacio tranquilo para la sesión.',
   8),
  ('masaje-reductor-domicilio',
   'Masaje estético reductor',
   'El programa reductor —drenaje linfático, moldeamiento y maderoterapia— aplicado en tu casa, con seguimiento personalizado por sesiones.',
   'domicilio',
   'El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones. Prepara un espacio cómodo y ventilado para la sesión.',
   9),
  ('reflexologia-domicilio',
   'Reflexología podal y facial',
   'La reflexología podal y facial, en la comodidad de tu hogar: liberación de tensión en puntos energéticos de rostro y pies, sin desplazarte.',
   'domicilio',
   'El servicio a domicilio se coordina por WhatsApp: zona, horario e indicaciones. Prepara un espacio tranquilo para la sesión.',
   10);

insert into service_variants (service_id, duration_minutes, price, advance_amount)
select id, v.duration, v.price, null::numeric
from services s
join (values
  ('terapia-fisica-y-rehabilitacion-consultorio', 60, 50),
  ('masaje-antiestres-consultorio', 60, 70),
  ('masaje-antiestres-consultorio', 90, 90),
  ('masaje-reductor-consultorio', 90, 150),
  ('reflexologia-consultorio', 60, 60),
  ('terapia-fisica-y-rehabilitacion-domicilio', 60, 80),
  ('masaje-antiestres-domicilio', 60, 120),
  ('masaje-antiestres-domicilio', 90, 150),
  ('masaje-reductor-domicilio', 90, 200),
  ('reflexologia-domicilio', 60, 70)
) as v(slug, duration, price) on v.slug = s.slug;
