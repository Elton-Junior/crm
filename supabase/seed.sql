-- Substitua o e-mail pelo seu
do $$
declare
  v_user uuid;
  v_org  uuid;
  v_pipe uuid;
begin
  select id into v_user from auth.users where email = 'ensjuninho@gmail.com' limit 1;
  if v_user is null then raise exception 'Crie o usuário no Auth antes de rodar o seed'; end if;

  insert into organizations (name, slug) values ('Minha Empresa', 'minha-empresa')
  returning id into v_org;

  insert into memberships (org_id, user_id, role) values (v_org, v_user, 'owner');

  insert into pipelines (org_id, name, is_default, position)
  values (v_org, 'Pipeline de Vendas', true, 'a0') returning id into v_pipe;

  insert into pipeline_stages (org_id, pipeline_id, name, color, position, is_won, is_lost) values
    (v_org, v_pipe, 'Cliente entrou em contato', '#3b82f6', 'a0', false, false),
    (v_org, v_pipe, 'Reunião agendada',          '#8b5cf6', 'a1', false, false),
    (v_org, v_pipe, 'Preparando proposta',       '#f59e0b', 'a2', false, false),
    (v_org, v_pipe, 'Negociação',                '#06b6d4', 'a3', false, false),
    (v_org, v_pipe, 'Fechado — Ganho',           '#22c55e', 'a4', true,  false),
    (v_org, v_pipe, 'Fechado — Perdido',         '#ef4444', 'a5', false, true);
end $$;
