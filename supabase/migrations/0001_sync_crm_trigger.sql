-- =============================================================================
-- Espelho Propostas → CRM: trigger que avisa o CRM a cada mudança em proposals.
-- Chama crm.jottahub.com.br/api/sync/proposta (INSERT/UPDATE/DELETE) via pg_net.
-- Status web → pipeline do CRM: pending=Proposta, sent=Negociação,
-- approved=Ganho, expired/rejected/archived=Perdido.
-- COMO USAR: Supabase Studio (banco jottahub-propostas) → SQL Editor → Run.
-- =============================================================================
create extension if not exists pg_net;

create or replace function public.notify_crm_proposta() returns trigger as $$
begin
  perform net.http_post(
    url := 'https://crm.jottahub.com.br/api/sync/proposta',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', TG_OP,
      'record',     case when TG_OP='DELETE' then null else to_jsonb(NEW) end,
      'old_record', case when TG_OP='DELETE' then to_jsonb(OLD) else null end
    )
  );
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_crm_proposta on public.proposals;
create trigger trg_sync_crm_proposta
  after insert or update or delete on public.proposals
  for each row execute function public.notify_crm_proposta();
