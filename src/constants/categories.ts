/**
 * Category Constants for HandieHub Backend
 * This should match the frontend Categories.ts file
 */

export interface SubCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  type: 'product' | 'service' | 'both';
  subCategories: SubCategory[];
  featured?: boolean;
  order?: number;
}

export const CATEGORIES: Category[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    description: 'Professional plumbing services & supplies',
    color: '#3B82F6',
    type: 'both',
    featured: true,
    order: 1,
    subCategories: [
      { id: 'pipe_repair', name: 'Pipe Repair & Installation' },
      { id: 'drain_cleaning', name: 'Drain Cleaning' },
      { id: 'water_heater', name: 'Water Heater Services' },
      { id: 'toilet_repair', name: 'Toilet Repair' },
      { id: 'faucet_installation', name: 'Faucet Installation' },
      { id: 'plumbing_supplies', name: 'Plumbing Supplies' },
      { id: 'bathroom_plumbing', name: 'Bathroom Plumbing' },
      { id: 'kitchen_plumbing', name: 'Kitchen Plumbing' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: '⚡',
    description: 'Licensed electrical services & supplies',
    color: '#FBBF24',
    type: 'both',
    featured: true,
    order: 2,
    subCategories: [
      { id: 'wiring', name: 'Wiring & Rewiring' },
      { id: 'lighting', name: 'Lighting Installation' },
      { id: 'panel_upgrade', name: 'Panel Upgrade' },
      { id: 'outlet_install', name: 'Outlet Installation' },
      { id: 'fan_installation', name: 'Fan Installation' },
      { id: 'electrical_supplies', name: 'Electrical Supplies' },
      { id: 'generator', name: 'Generator Services' },
      { id: 'smart_home', name: 'Smart Home Setup' },
    ],
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: '🪚',
    description: 'Expert woodworking & furniture',
    color: '#F59E0B',
    type: 'both',
    featured: true,
    order: 3,
    subCategories: [
      { id: 'furniture_making', name: 'Custom Furniture' },
      { id: 'door_installation', name: 'Door Installation' },
      { id: 'cabinet_work', name: 'Cabinet Work' },
      { id: 'wood_repair', name: 'Wood Repair' },
      { id: 'shelving', name: 'Shelving & Storage' },
      { id: 'wood_products', name: 'Wood Products' },
      { id: 'deck_building', name: 'Deck Building' },
      { id: 'wood_flooring', name: 'Wood Flooring' },
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: '🎨',
    description: 'Professional painting services',
    color: '#8B5CF6',
    type: 'both',
    featured: true,
    order: 4,
    subCategories: [
      { id: 'interior_painting', name: 'Interior Painting' },
      { id: 'exterior_painting', name: 'Exterior Painting' },
      { id: 'wall_texturing', name: 'Wall Texturing' },
      { id: 'wallpaper', name: 'Wallpaper Installation' },
      { id: 'paint_supplies', name: 'Paint & Supplies' },
      { id: 'cabinet_refinishing', name: 'Cabinet Refinishing' },
      { id: 'pressure_washing', name: 'Pressure Washing' },
    ],
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: '🧹',
    description: 'Professional cleaning services',
    color: '#10B981',
    type: 'both',
    featured: true,
    order: 5,
    subCategories: [
      { id: 'house_cleaning', name: 'House Cleaning' },
      { id: 'deep_cleaning', name: 'Deep Cleaning' },
      { id: 'carpet_cleaning', name: 'Carpet Cleaning' },
      { id: 'window_cleaning', name: 'Window Cleaning' },
      { id: 'move_in_out', name: 'Move-in/Move-out' },
      { id: 'cleaning_supplies', name: 'Cleaning Supplies' },
      { id: 'office_cleaning', name: 'Office Cleaning' },
      { id: 'post_construction', name: 'Post-Construction' },
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC & Cooling',
    icon: '❄️',
    description: 'Heating, ventilation & AC services',
    color: '#06B6D4',
    type: 'both',
    featured: true,
    order: 6,
    subCategories: [
      { id: 'ac_installation', name: 'AC Installation' },
      { id: 'ac_repair', name: 'AC Repair' },
      { id: 'heating', name: 'Heating Systems' },
      { id: 'ventilation', name: 'Ventilation' },
      { id: 'hvac_products', name: 'HVAC Products' },
      { id: 'duct_cleaning', name: 'Duct Cleaning' },
    ],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: '🔌',
    description: 'Home appliance repair services',
    color: '#6366F1',
    type: 'both',
    featured: true,
    order: 7,
    subCategories: [
      { id: 'washing_machine', name: 'Washing Machine' },
      { id: 'refrigerator', name: 'Refrigerator' },
      { id: 'microwave', name: 'Microwave & Oven' },
      { id: 'dishwasher', name: 'Dishwasher' },
      { id: 'small_appliances', name: 'Small Appliances' },
      { id: 'tv_repair', name: 'TV Repair' },
    ],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: '🌱',
    description: 'Garden & outdoor services',
    color: '#059669',
    type: 'both',
    featured: true,
    order: 8,
    subCategories: [
      { id: 'lawn_care', name: 'Lawn Care' },
      { id: 'garden_design', name: 'Garden Design' },
      { id: 'tree_service', name: 'Tree Service' },
      { id: 'irrigation', name: 'Irrigation Systems' },
      { id: 'garden_supplies', name: 'Garden Supplies' },
      { id: 'hardscaping', name: 'Hardscaping' },
      { id: 'pest_control', name: 'Pest Control' },
    ],
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: '🏠',
    description: 'Roofing installation & repair',
    color: '#78716C',
    type: 'both',
    order: 9,
    subCategories: [
      { id: 'roof_repair', name: 'Roof Repair' },
      { id: 'roof_installation', name: 'Roof Installation' },
      { id: 'gutter_service', name: 'Gutter Services' },
      { id: 'waterproofing', name: 'Waterproofing' },
      { id: 'roofing_materials', name: 'Roofing Materials' },
    ],
  },
  {
    id: 'welding',
    name: 'Welding & Metal',
    icon: '🔥',
    description: 'Metal fabrication & welding',
    color: '#EF4444',
    type: 'both',
    order: 10,
    subCategories: [
      { id: 'gate_fabrication', name: 'Gate Fabrication' },
      { id: 'burglar_proof', name: 'Burglar Proof' },
      { id: 'metal_repair', name: 'Metal Repair' },
      { id: 'railings', name: 'Railings' },
      { id: 'metal_products', name: 'Metal Products' },
      { id: 'structural_welding', name: 'Structural Welding' },
    ],
  },
  {
    id: 'tiling',
    name: 'Tiling & Flooring',
    icon: '🔲',
    description: 'Tile and flooring services',
    color: '#D97706',
    type: 'both',
    order: 11,
    subCategories: [
      { id: 'floor_tiling', name: 'Floor Tiling' },
      { id: 'wall_tiling', name: 'Wall Tiling' },
      { id: 'wood_flooring', name: 'Wood Flooring' },
      { id: 'epoxy_flooring', name: 'Epoxy Flooring' },
      { id: 'tiles_supplies', name: 'Tiles & Supplies' },
    ],
  },
  {
    id: 'security',
    name: 'Security Systems',
    icon: '🔒',
    description: 'Security installation & products',
    color: '#1E293B',
    type: 'both',
    order: 12,
    subCategories: [
      { id: 'cctv', name: 'CCTV Installation' },
      { id: 'alarm_systems', name: 'Alarm Systems' },
      { id: 'access_control', name: 'Access Control' },
      { id: 'intercom', name: 'Intercom Systems' },
      { id: 'security_products', name: 'Security Products' },
    ],
  },
  {
    id: 'home_kitchen',
    name: 'Home & Kitchen',
    icon: '🏡',
    description: 'Home improvement products',
    color: '#EC4899',
    type: 'product',
    order: 13,
    subCategories: [
      { id: 'kitchen_appliances', name: 'Kitchen Appliances' },
      { id: 'home_decor', name: 'Home Decor' },
      { id: 'storage_org', name: 'Storage & Organization' },
      { id: 'bedding', name: 'Bedding & Linens' },
      { id: 'bathroom', name: 'Bathroom Accessories' },
    ],
  },
  {
    id: 'tools',
    name: 'Tools & Equipment',
    icon: '🛠️',
    description: 'Professional tools & equipment',
    color: '#64748B',
    type: 'product',
    order: 14,
    subCategories: [
      { id: 'power_tools', name: 'Power Tools' },
      { id: 'hand_tools', name: 'Hand Tools' },
      { id: 'measuring_tools', name: 'Measuring Tools' },
      { id: 'safety_gear', name: 'Safety Gear' },
      { id: 'tool_storage', name: 'Tool Storage' },
    ],
  },
  {
    id: 'moving',
    name: 'Moving & Logistics',
    icon: '🚚',
    description: 'Moving and hauling services',
    color: '#0EA5E9',
    type: 'service',
    order: 15,
    subCategories: [
      { id: 'home_moving', name: 'Home Moving' },
      { id: 'office_moving', name: 'Office Moving' },
      { id: 'furniture_assembly', name: 'Furniture Assembly' },
      { id: 'hauling', name: 'Hauling & Disposal' },
      { id: 'packing', name: 'Packing Services' },
    ],
  },
  {
    id: 'other',
    name: 'Other Services',
    icon: '📦',
    description: 'Miscellaneous services & products',
    color: '#94A3B8',
    type: 'both',
    order: 99,
    subCategories: [
      { id: 'handyman', name: 'General Handyman' },
      { id: 'pest_control', name: 'Pest Control' },
      { id: 'miscellaneous', name: 'Miscellaneous' },
    ],
  },
];

// Helper functions
export const getAllCategoryIds = (): string[] => {
  return CATEGORIES.map(cat => cat.id);
};

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find(cat => cat.id === id);
};

export const isValidCategoryId = (id: string): boolean => {
  return getAllCategoryIds().includes(id);
};

export const getFeaturedCategories = (): Category[] => {
  return CATEGORIES.filter(cat => cat.featured);
};
