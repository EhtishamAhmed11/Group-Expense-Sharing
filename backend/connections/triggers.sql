create trigger update_users_updated_at before update on users for each row execute function update_updated_at_column();
create trigger update_groups_updated_at before update on groups for each row execute function update_updated_at_column();
create trigger update_expenses_updated_at before update on expenses for each row execute function update_updated_at_column()l
create trigger update_settlements_updated_at before update on settlements for each row execute function update_updated_at_column();

create or replace function update_group_member_count()
returns trigger as $$
begin
	if TG_OP = 'INSERT' then
		update groups set member_count = member+1 where member_id=new.group_id;
		return new;
	elsif TG_OP = 'DELETE' then
		update groups set member_count = member_count-1 where id=old.group_id;
		return old
	end if;
	return null;
end;
$$ language 'plpgsql';

create trigger group_member_count_trigger
	after insert or delete on group_members
	for each row execute function update_group_member_count();

--views  (for common queries)
create view user_debt_summary as
select
	u.id as user_id,
	u.first_name|| ' ' || u.last_name as user_name,
	coalesce(sum(case when ep.user_id = u.id then ep.amount_owed else 0 end),0) as total_owed_by_user,
	 COALESCE(SUM(CASE WHEN e.paid_by = u.id THEN ep.amount_owed ELSE 0 END), 0) as total_owed_to_user,
    COALESCE(SUM(CASE WHEN e.paid_by = u.id THEN ep.amount_owed ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN ep.user_id = u.id THEN ep.amount_owed ELSE 0 END), 0) as net_balance
from users u 
left join expenses e on (e.created_by = u.id or e.paid_by = u.id)
left join expense_participants ep on e.id = ep.expense_id
where e.expense_type = 'group' and not ep.is_settled
group by u.id,u.first_name,u.last_name;

create view group_expense_summary as
select
	g.id as group_id,
	g.name as gorup_name,
	count(e.id) as total expenses,
	coalesce(sum(e.amount),0) as total_amount,
	avg(e.amount) as avg_expense_amount,
	max(e.created_at) as last_expense_date
from groups g
left join expenses e on g.id=e.group_id and e.expense_type = 'group'
group by g.id,g.name