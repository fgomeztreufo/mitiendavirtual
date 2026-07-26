-- 045_business_type_and_realestate.sql
-- Agrega business_type a profiles, campos inmobiliarios a products,
-- y tabla product_images para galería multi-foto.

-- ==================== PROFILES: TIPO DE NEGOCIO ====================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'ecommerce';

-- ==================== PRODUCTS: CAMPOS INMOBILIARIOS ====================
ALTER TABLE products ADD COLUMN IF NOT EXISTS operation_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS property_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS area_m2 numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bedrooms integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bathrooms integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parking_spots integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS property_status text DEFAULT 'disponible';

CREATE INDEX IF NOT EXISTS idx_products_operation_type ON products(operation_type) WHERE operation_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_property_type ON products(property_type) WHERE property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_comuna ON products(comuna) WHERE comuna IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_property_status ON products(property_status) WHERE property_status IS NOT NULL;

-- ==================== PRODUCT_IMAGES: GALERÍA MULTI-FOTO ====================
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_images_user ON product_images(user_id);

-- RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_product_images" ON product_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert_product_images" ON product_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update_product_images" ON product_images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner_delete_product_images" ON product_images
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "service_role_product_images" ON product_images
  FOR ALL USING (auth.role() = 'service_role');
