alter table public.learning_paths
  add column if not exists mind_map jsonb;

comment on column public.learning_paths.mind_map is
  'Structured React Flow graph generated for this learning path.';
