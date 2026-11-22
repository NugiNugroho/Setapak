-- View pendukung modul Keuangan (security_invoker → tetap terfilter RLS).

-- Progres tujuan tabungan: setoran = pengeluaran bertaut ke tujuan, penarikan = pemasukan bertaut.
create or replace view public.savings_progress with (security_invoker = true) as
  select g.id, g.user_id, g.name, g.target_amount, g.deadline, g.wallet_id, g.goal_id, g.created_at,
         coalesce(sum(case when t.kind = 'expense' then t.amount
                           when t.kind = 'income' then -t.amount
                           else 0 end), 0)::bigint as saved
    from public.savings_goals g
    left join public.transactions t on t.savings_goal_id = g.id
   group by g.id;

-- Sisa hutang/piutang: pembayaran = transaksi bertaut ke debt.
-- Hutang (payable) dibayar lewat pengeluaran; piutang (receivable) diterima lewat pemasukan.
create or replace view public.debt_progress with (security_invoker = true) as
  select d.id, d.user_id, d.direction, d.counterparty, d.principal, d.installment, d.due_day,
         d.interest_rate, d.status, d.note, d.created_at,
         coalesce(sum(case
           when d.direction = 'payable' and t.kind = 'expense' then t.amount
           when d.direction = 'receivable' and t.kind = 'income' then t.amount
           else 0 end), 0)::bigint as paid,
         greatest(d.principal - coalesce(sum(case
           when d.direction = 'payable' and t.kind = 'expense' then t.amount
           when d.direction = 'receivable' and t.kind = 'income' then t.amount
           else 0 end), 0), 0)::bigint as remaining
    from public.debts d
    left join public.transactions t on t.debt_id = d.id
   group by d.id;

-- Nilai terbaru setiap aset.
create or replace view public.asset_latest with (security_invoker = true) as
  select a.id, a.user_id, a.name, a.kind, a.purchase_value, a.purchase_date, a.archived, a.created_at,
         v.value as current_value, v.valued_at
    from public.assets a
    left join lateral (
      select value, valued_at from public.asset_valuations av
       where av.asset_id = a.id
       order by valued_at desc, created_at desc
       limit 1
    ) v on true;

grant select on public.savings_progress, public.debt_progress, public.asset_latest,
  public.wallet_balances, public.identity_votes to authenticated;
