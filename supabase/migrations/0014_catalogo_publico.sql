-- ALMAE DIGITAL — 0014: catálogo público desde la base de datos (M1)
-- Agrega los campos de presentación que el sitio público ya usaba
-- (antes congelados en catalog.ts) para que el panel los administre.

alter table services
  add column tagline text not null default '',
  add column highlights jsonb not null default '[]'::jsonb;

update services set tagline = 'Alivio del dolor y recuperación funcional',
  highlights = '["Cervicalgia y lumbalgia","Esguinces, tendinitis y bursitis","Lesiones deportivas","Ultrasonido, TENS y láser","Punción seca y ventosas"]'::jsonb
where slug = 'terapia-fisica-y-rehabilitacion-consultorio';

update services set tagline = 'Relajación y bienestar en nuestro consultorio',
  highlights = '["Tensión en cuello y espalda","Relajación profunda","Mejora tu descanso"]'::jsonb
where slug = 'masaje-antiestres-consultorio';

update services set tagline = 'Contorno, circulación y bienestar',
  highlights = '["Drenaje linfático","Moldeamiento","Maderoterapia"]'::jsonb
where slug = 'masaje-reductor-consultorio';

update services set tagline = 'Relajación y bienestar de pies a rostro',
  highlights = '["Puntos energéticos faciales","Reflexología podal","Liberación de tensión"]'::jsonb
where slug = 'reflexologia-consultorio';

update services set tagline = 'Medicina oriental para tu equilibrio',
  highlights = '["Manejo del dolor","Tensión muscular","Equilibrio general"]'::jsonb
where slug = 'acupuntura';

update services set tagline = 'Fortalece tu cuerpo, previene lesiones',
  highlights = '["Fuerza y movilidad","Prevención de lesiones","Adaptado a tu nivel"]'::jsonb
where slug = 'entrenamiento-fisico';

update services set tagline = 'Atención personalizada en la comodidad de tu hogar',
  highlights = '["Postoperatorios","Movilidad reducida","Equipamiento portátil"]'::jsonb
where slug = 'terapia-fisica-y-rehabilitacion-domicilio';

update services set tagline = 'Relajación sin salir de casa',
  highlights = '["Sin salir de casa","Kit portátil completo","Horario a tu medida"]'::jsonb
where slug = 'masaje-antiestres-domicilio';

update services set tagline = 'Bienestar y cuidado profesional en tu hogar',
  highlights = '["Drenaje linfático","Moldeamiento y maderoterapia","Seguimiento por sesiones"]'::jsonb
where slug = 'masaje-reductor-domicilio';

update services set tagline = 'Bienestar y relajación sin salir de casa',
  highlights = '["Reflexología podal","Puntos energéticos faciales","Sin desplazarte"]'::jsonb
where slug = 'reflexologia-domicilio';
