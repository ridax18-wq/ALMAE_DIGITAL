import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function registrarAuditoria(entrada: {
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();

  await supabase.from("audit_logs").insert({
    actor_user_id: entrada.actorUserId,
    actor_role: entrada.actorRole ?? null,
    action: entrada.action,
    entity: entrada.entity,
    entity_id: entrada.entityId,
    before: entrada.before ?? null,
    after: entrada.after ?? null,
  });
}
