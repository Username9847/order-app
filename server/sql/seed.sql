-- Seed data (only applied when menus table is empty)

insert into menus (name, description, price, image_url, stock_quantity)
values
  ('아메리카노(ICE)', '간단한 설명...', 4000, null, 8),
  ('아메리카노(HOT)', '간단한 설명...', 4000, null, 8),
  ('카페라떼', '간단한 설명...', 5000, null, 5);

-- Options for each menu
insert into options (menu_id, name, extra_price)
select m.id, '샷 추가', 500 from menus m;

insert into options (menu_id, name, extra_price)
select m.id, '시럽 추가', 0 from menus m;

