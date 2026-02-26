import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

export default function ProductsListView({ session, onUpdate }: any) {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)

  // ESTADOS PARA EDICIÓN
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [editData, setEditData] = useState({ name: '', price: '', description: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    const results = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredProducts(results)
    setCurrentPage(1)
  }, [searchTerm, products])

  async function fetchProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error('Error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- FUNCIÓN DE INICIO DE EDICIÓN CORREGIDA ---
  const startEdit = (product: any) => {
    setEditingProduct(product);
    setEditData({
      name: product.name,
      price: product.price.toString(),
      description: product.description || ''
    });
  };

  const getFilePathFromUrl = (url: string) => {
    const parts = url.split('/products/');
    return parts.length > 1 ? parts[1] : null;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalImageUrl = editingProduct.image_url;
      const file = fileInputRef.current?.files?.[0];
  
      // 1. GESTIÓN DE STORAGE
      if (file) {
        console.log("📸 Nueva imagen. Borrando anterior...");
        await deleteStorageFile(editingProduct.image_url);
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('catalog').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }
  
      // 2. ACTUALIZAR PRODUCTO
      const { error: prodError } = await supabase
        .from('products')
        .update({
          name: editData.name,
          price: Number(editData.price),
          description: editData.description,
          image_url: finalImageUrl
        })
        .eq('id', editingProduct.id);
  
      if (prodError) throw prodError;
  
      // 3. SINCRONIZAR RAG (UPSERT)
      const nuevoContenidoIA = `Original_id: ${editingProduct.id} - Name: ${editData.name} - Descripcion: ${editData.description} - Precio: $${editData.price}`;
      
      console.log("🚀 Ejecutando Upsert Final para ID:", editingProduct.id);
  
      const { error: ragError } = await supabase
        .from('documents')
        .upsert({
          original_id_saas: editingProduct.id.toString(),
          content: nuevoContenidoIA,
          user_id: session.user.id,
          type: 'product',
          metadata: { 
            price: editData.price, 
            image_url: finalImageUrl 
          }
        }, { 
          onConflict: 'original_id_saas' 
        });
  
      if (ragError) throw ragError;
  
      console.log("✅ ¡TODO SINCRONIZADO!");
      Swal.fire({ icon: 'success', title: '¡Actualizado!', background: '#111827', color: '#fff', timer: 1500, showConfirmButton: false });
  
      setEditingProduct(null);
      fetchProducts();
      if (onUpdate) onUpdate();
  
    } catch (error: any) {
      console.error("❌ Error en handleUpdate:", error.message);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setUploading(false);
    }
  };
  const deleteStorageFile = async (imageUrl: string) => {
    try {
      const bucketName = 'catalog';
      
      // 1. Extraer lo que está después de /catalog/
      const parts = imageUrl.split(`/${bucketName}/`);
      if (parts.length < 2) return;
  
      // 2. LIMPIEZA ATÓMICA: 
      // Removemos saltos de línea, retornos de carro y CUALQUIER carácter 
      // que no sea alfanumérico, punto, guion o barra diagonal.
      const cleanPath = parts[1]
        .replace(/[\n\r]/g, '') // Quita saltos de línea
        .replace(/[^a-zA-Z0-9.\-\/]/g, '') // Solo deja caracteres legales de path
        .trim();
  
      console.log("🎯 Intentando borrado con Path Purificado:", `"${cleanPath}"`);
  
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([cleanPath]);
  
      if (error) {
        console.error("❌ Error de Permisos:", error.message);
      } else if (data && data.length > 0) {
        console.log("✅ ¡POR FIN! Archivo eliminado:", data);
      } else {
        // Si sigue dando [], imprimiremos el largo del string para ver si hay algo oculto
        console.error(`🚫 Sigue sin encontrarlo. Largo del path: ${cleanPath.length} caracteres.`);
        console.error("Path fallido:", `"${cleanPath}"`);
      }
    } catch (err) {
      console.error("❌ Error inesperado:", err);
    }
  };

  const handleDelete = async (product: any) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: "Se recuperará 1 cupo de tu capacidad de almacenamiento.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar todo',
      background: '#111827',
      color: '#fff'
    });
  
    if (result.isConfirmed) {
      try {
        setLoading(true);
  
        // 1. ELIMINAR FÍSICAMENTE DEL STORAGE (Usando tu función exitosa)
        if (product.image_url) {
          await deleteStorageFile(product.image_url);
        }
  
        // 2. ELIMINAR DEL RAG (Tabla documents)
        await supabase
          .from('documents')
          .delete()
          .eq('original_id_saas', product.id.toString());
  
        // 3. ELIMINAR DE LA TABLA PRODUCTS
        const { error: dbError } = await supabase
          .from('products')
          .delete()
          .eq('id', product.id);
  
        if (dbError) throw dbError;
  
        // 4. DESCONTAR DEL PERFIL (Llamamos a la función SQL)
        // Dentro de handleDelete, después de borrar el producto de la tabla...
        const { error: rpcError } = await supabase.rpc('decrement_product_count', { 
            user_id_to_update: session.user.id 
          });
          
          if (rpcError) {
            console.error("❌ Error al actualizar capacidad:", rpcError.message);
          } else {
            console.log("✅ Capacidad actualizada en current_products");
          }
  
        Swal.fire({ 
          icon: 'success', 
          title: 'Eliminado', 
          text: 'Capacidad actualizada.',
          background: '#111827', 
          color: '#fff', 
          timer: 1500, 
          showConfirmButton: false 
        });
  
        fetchProducts();
        if (onUpdate) onUpdate(); // Esto avisará al componente padre para refrescar la barra de "34/50"
  
      } catch (error: any) {
        Swal.fire('Error', 'No se pudo eliminar completamente', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  return (
    <div className="animate-fade-in space-y-6 pb-10 text-left">
      {/* MODAL EDICIÓN */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-800 w-full max-w-xl rounded-[2.5rem] p-8">
            <h2 className="text-xl font-black italic uppercase text-white mb-6">Editar Producto</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
               <div className="flex flex-col items-center gap-4 bg-black/40 p-4 rounded-3xl border border-gray-800 text-center">
                 <img src={editingProduct.image_url} className="w-24 h-24 object-cover rounded-xl border border-gray-700" />
                 <input type="file" ref={fileInputRef} accept="image/*" className="text-[10px] text-gray-400" />
               </div>
               <input className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white text-sm" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required />
               <input type="number" className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white text-sm" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} required />
               <textarea className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white text-sm h-24" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} />
               <div className="flex gap-3">
                 <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 text-gray-500 font-bold uppercase text-[10px]">Cancelar</button>
                 <button type="submit" disabled={uploading} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black text-[10px] text-white uppercase">{uploading ? 'Guardando...' : 'Confirmar'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#111827] p-6 rounded-[2rem] border border-gray-800">
        <h1 className="text-xl font-black text-white italic uppercase tracking-tighter">Mantenedor</h1>
        <input placeholder="FILTRAR PRODUCTOS..." className="bg-black border border-gray-800 rounded-xl py-2 px-4 text-[10px] font-black uppercase text-white outline-none focus:border-blue-500" onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* TABLA */}
      <div className="bg-[#111827] border border-gray-800 rounded-[2rem] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-800 text-left">
            <tr>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase">Producto</th>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {currentItems.map((product) => (
              <tr key={product.id} className="hover:bg-blue-600/5 transition-all group">
                <td className="p-4 flex items-center gap-3">
                  <img src={product.image_url} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-white uppercase">{product.name}</span>
                    <span className="text-green-500 text-[10px] font-black">${Number(product.price).toLocaleString('es-CL')}</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => startEdit(product)} 
                      className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase px-4"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(product)} 
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase px-4"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex justify-between bg-gray-900/20">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="text-[10px] font-black text-blue-500 disabled:opacity-20 uppercase">Anterior</button>
            <span className="text-[10px] text-gray-500 font-black">Pág {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-[10px] font-black text-blue-500 disabled:opacity-20 uppercase">Siguiente</button>
          </div>
        )}
      </div>
    </div>
  )
}