-- 029: RPC para decrementar el contador de productos en profiles
-- Usado por ProductsListView al eliminar un producto

CREATE OR REPLACE FUNCTION decrement_product_count(user_id_to_update uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET current_products = GREATEST(current_products - 1, 0)
  WHERE id = user_id_to_update;
END;
$$;

REVOKE ALL ON FUNCTION decrement_product_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_product_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_product_count(uuid) TO service_role;
