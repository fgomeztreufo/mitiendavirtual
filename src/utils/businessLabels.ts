export type BusinessType = 'ecommerce' | 'inmobiliaria' | 'clinica' | 'servicios' | 'restaurant'

interface BusinessLabels {
  catalog: string
  product: string
  products: string
  inventory: string
  services: string
  addProduct: string
  namePlaceholder: string
  nameLabel: string
  descLabel: string
  descPlaceholder: string
  priceLabel: string
  pricePlaceholder: string
  showCatalog: boolean
  showBrand: boolean
  showCategory: boolean
  categoryLabel: string
  categoryPlaceholder: string
  uploadSuccess: string
}

const LABELS: Record<BusinessType, BusinessLabels> = {
  ecommerce: {
    catalog: 'Mi Catálogo',
    product: 'Producto',
    products: 'Productos',
    inventory: 'Inventario',
    services: 'Mis Servicios',
    addProduct: 'Guardar en Catálogo',
    namePlaceholder: 'Ej: Zapatillas Adidas',
    nameLabel: 'Nombre del Producto',
    descLabel: 'Descripción para la IA',
    descPlaceholder: 'Detalla tallas, materiales y beneficios...',
    priceLabel: 'Precio ($ CLP)',
    pricePlaceholder: '9990',
    showCatalog: true,
    showBrand: true,
    showCategory: true,
    categoryLabel: 'Categoría',
    categoryPlaceholder: 'Ej: Calzado, Electrónica, Alimentos',
    uploadSuccess: 'Tu IA ya conoce este producto.',
  },
  inmobiliaria: {
    catalog: 'Mis Propiedades',
    product: 'Propiedad',
    products: 'Propiedades',
    inventory: 'Portafolio',
    services: 'Mis Servicios',
    addProduct: 'Publicar Propiedad',
    namePlaceholder: 'Ej: Departamento 2D+1B Providencia',
    nameLabel: 'Nombre de la Propiedad',
    descLabel: 'Descripción de la Propiedad',
    descPlaceholder: 'Detalla ubicación, estado, amenidades, cercanías...',
    priceLabel: 'Precio ($ CLP)',
    pricePlaceholder: '85000000',
    showCatalog: true,
    showBrand: false,
    showCategory: false,
    categoryLabel: 'Categoría',
    categoryPlaceholder: '',
    uploadSuccess: 'Tu IA ya conoce esta propiedad.',
  },
  clinica: {
    catalog: 'Mis Servicios',
    product: 'Servicio',
    products: 'Servicios',
    inventory: 'Catálogo de Servicios',
    services: 'Mis Prestaciones',
    addProduct: 'Agregar Servicio',
    namePlaceholder: 'Ej: Consulta Dermatológica',
    nameLabel: 'Nombre del Servicio',
    descLabel: 'Descripción del Servicio',
    descPlaceholder: 'Detalla el servicio, duración, preparación...',
    priceLabel: 'Precio ($ CLP)',
    pricePlaceholder: '35000',
    showCatalog: false,
    showBrand: false,
    showCategory: true,
    categoryLabel: 'Especialidad',
    categoryPlaceholder: 'Ej: Dermatología, Odontología',
    uploadSuccess: 'Tu IA ya conoce este servicio.',
  },
  servicios: {
    catalog: 'Mis Servicios',
    product: 'Servicio',
    products: 'Servicios',
    inventory: 'Catálogo',
    services: 'Mis Servicios',
    addProduct: 'Agregar Servicio',
    namePlaceholder: 'Ej: Corte de pelo clásico',
    nameLabel: 'Nombre del Servicio',
    descLabel: 'Descripción del Servicio',
    descPlaceholder: 'Detalla el servicio, duración, incluye...',
    priceLabel: 'Precio ($ CLP)',
    pricePlaceholder: '15000',
    showCatalog: false,
    showBrand: false,
    showCategory: true,
    categoryLabel: 'Categoría',
    categoryPlaceholder: 'Ej: Cortes, Tratamientos, Coloración',
    uploadSuccess: 'Tu IA ya conoce este servicio.',
  },
  restaurant: {
    catalog: 'Mi Carta',
    product: 'Plato',
    products: 'Platos',
    inventory: 'Menú',
    services: 'Mis Reservas',
    addProduct: 'Agregar Plato',
    namePlaceholder: 'Ej: Lomo saltado',
    nameLabel: 'Nombre del Plato',
    descLabel: 'Descripción del Plato',
    descPlaceholder: 'Detalla ingredientes, preparación, acompañamientos...',
    priceLabel: 'Precio ($ CLP)',
    pricePlaceholder: '8990',
    showCatalog: true,
    showBrand: false,
    showCategory: true,
    categoryLabel: 'Categoría',
    categoryPlaceholder: 'Ej: Entradas, Platos de fondo, Postres, Bebestibles',
    uploadSuccess: 'Tu IA ya conoce este plato.',
  },
}

export function getLabels(businessType?: string | null): BusinessLabels {
  const key = (businessType || 'ecommerce') as BusinessType
  return LABELS[key] || LABELS.ecommerce
}

export const OPERATION_TYPES = [
  { value: 'venta', label: 'Venta' },
  { value: 'arriendo', label: 'Arriendo' },
]

export const PROPERTY_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'local', label: 'Local Comercial' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'estacionamiento', label: 'Estacionamiento' },
]

export const PROPERTY_STATUSES = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arrendado', label: 'Arrendado' },
]
