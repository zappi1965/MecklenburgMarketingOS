# SQL Fixed Note

Diese Version behebt den Fehler:

`relation "public.notification_queue" does not exist`

Ursache:
Policies wurden auf Tabellen angewendet, bevor die Tabellen sicher existierten.

Fix:
- notification_queue, worker_jobs, workflow_runs, activity_logs und customer_files werden sicher angelegt
- RLS/Policies werden danach angelegt
- der frühe generische Policy-Loop wurde entschärft
