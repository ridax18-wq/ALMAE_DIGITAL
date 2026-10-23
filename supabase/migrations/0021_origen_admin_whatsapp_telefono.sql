-- Hito 3.3-B: origenes de citas creadas desde el administrador.
-- Aplicada solo al stack local; sin despliegue remoto.
ALTER TYPE booking_origin ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE booking_origin ADD VALUE IF NOT EXISTS 'PHONE';
