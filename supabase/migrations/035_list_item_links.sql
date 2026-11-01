-- Store links texted onto the list (Nov 1 2026): a family member texts a Walmart product link,
-- the line keeps the link and Walmart's item id so "Add Walmart picks to cart" can put the exact products in a Walmart cart.
alter table public.list_items add column if not exists link_url text;
alter table public.list_items add column if not exists walmart_item_id bigint;
