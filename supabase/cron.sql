-- ============================================================================
-- Recordatorios automáticos: la base llama a la función `reminders` cada 30 min.
-- Correr DESPUÉS de publicar las funciones, en SQL Editor, reemplazando:
--   TU_PROYECTO  → el ID del proyecto (lo que va antes de .supabase.co)
--   TU_SECRETO   → el mismo valor que pusiste en el secreto CRON_SECRET
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'nube-recordatorios',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://TU_PROYECTO.supabase.co/functions/v1/reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer TU_SECRETO"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Para ver si corre:   select * from cron.job_run_details order by start_time desc limit 5;
-- Para frenarlo:       select cron.unschedule('nube-recordatorios');
