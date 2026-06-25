-- 021_add_product_brand_category.sql
-- Agrega columnas brand y category a la tabla products para mejorar
-- la indexación RAG y permitir filtrado por marca/categoría.

alter table public.products
  add column if not exists brand    text default '',
  add column if not exists category text default '';

create index if not exists idx_products_brand    on public.products (brand)    where brand <> '';
create index if not exists idx_products_category on public.products (category) where category <> '';
