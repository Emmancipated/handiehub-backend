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
    id: 'home_kitchen',
    name: 'Home & Kitchen',
    icon: '🏡',
    description: 'Furniture, decor, appliances, home services, and more',
    color: '#EC4899',
    type: 'both',
    featured: true,
    order: 1,
    subCategories: [
      { id: 'furniture', name: 'Furniture' },
      { id: 'home_decor', name: 'Home Decor' },
      { id: 'kitchen_appliances', name: 'Kitchen Appliances' },
      { id: 'cookware_utensils', name: 'Cookware & Utensils' },
      { id: 'bedding_bath', name: 'Bedding & Bath' },
      { id: 'cleaning_supplies', name: 'Cleaning Supplies' },
      { id: 'home_improvement', name: 'Home Improvement' },
      { id: 'interior_design_services', name: 'Interior Design Services' },
      { id: 'home_cleaning_services', name: 'Home Cleaning Services' },
      { id: 'moving_relocation_services', name: 'Moving & Relocation Services' },
    ],
  },
  {
    id: 'electronics_technology',
    name: 'Electronics & Technology',
    icon: '💻',
    description: 'Devices, accessories, smart home, and tech services',
    color: '#3B82F6',
    type: 'both',
    featured: true,
    order: 2,
    subCategories: [
      { id: 'smartphones', name: 'Smartphones' },
      { id: 'computers_laptops', name: 'Computers & Laptops' },
      { id: 'electronics_accessories', name: 'Accessories' },
      { id: 'smart_home_devices', name: 'Smart Home Devices' },
      { id: 'tv_audio_systems', name: 'TV & Audio Systems' },
      { id: 'electronics_repair_services', name: 'Repair Services' },
      { id: 'it_support_services', name: 'IT Support Services' },
      { id: 'software_development_services', name: 'Software Development Services' },
    ],
  },
  {
    id: 'fashion_beauty',
    name: 'Fashion & Beauty',
    icon: '👗',
    description: 'Clothing, accessories, beauty products, and style services',
    color: '#DB2777',
    type: 'both',
    featured: true,
    order: 3,
    subCategories: [
      { id: 'mens_clothing', name: "Men's Clothing" },
      { id: 'womens_clothing', name: "Women's Clothing" },
      { id: 'kids_fashion', name: 'Kids Fashion' },
      { id: 'shoes', name: 'Shoes' },
      { id: 'bags_accessories', name: 'Bags & Accessories' },
      { id: 'jewelry_watches', name: 'Jewelry & Watches' },
      { id: 'makeup_cosmetics', name: 'Makeup & Cosmetics' },
      { id: 'hair_beauty_services', name: 'Hair & Beauty Services' },
      { id: 'tailoring_fashion_design_services', name: 'Tailoring & Fashion Design Services' },
    ],
  },
  {
    id: 'health_wellness',
    name: 'Health & Wellness',
    icon: '🏃',
    description: 'Fitness, medical supplies, supplements, and wellness care',
    color: '#10B981',
    type: 'both',
    featured: true,
    order: 4,
    subCategories: [
      { id: 'fitness_equipment', name: 'Fitness Equipment' },
      { id: 'supplements_vitamins', name: 'Supplements & Vitamins' },
      { id: 'medical_supplies', name: 'Medical Supplies' },
      { id: 'personal_care_products', name: 'Personal Care Products' },
      { id: 'gym_fitness_training', name: 'Gym & Fitness Training' },
      { id: 'physiotherapy_services', name: 'Physiotherapy Services' },
      { id: 'home_healthcare_services', name: 'Home Healthcare Services' },
    ],
  },
  {
    id: 'automobiles',
    name: 'Automobiles',
    icon: '🚗',
    description: 'Vehicles, parts, rental, and automotive services',
    color: '#64748B',
    type: 'both',
    featured: true,
    order: 5,
    subCategories: [
      { id: 'cars_for_sale', name: 'Cars for Sale' },
      { id: 'motorcycles', name: 'Motorcycles' },
      { id: 'auto_parts_accessories', name: 'Auto Parts & Accessories' },
      { id: 'vehicle_rental', name: 'Vehicle Rental' },
      { id: 'mechanic_services', name: 'Mechanic Services' },
      { id: 'car_wash_detailing', name: 'Car Wash & Detailing' },
      { id: 'logistics_delivery_services', name: 'Logistics & Delivery Services' },
    ],
  },
  {
    id: 'real_estate_property',
    name: 'Real Estate & Property',
    icon: '🏢',
    description: 'Homes, land, commercial space, and property services',
    color: '#059669',
    type: 'both',
    featured: true,
    order: 6,
    subCategories: [
      { id: 'houses_for_sale', name: 'Houses for Sale' },
      { id: 'houses_for_rent', name: 'Houses for Rent' },
      { id: 'land', name: 'Land' },
      { id: 'commercial_property', name: 'Commercial Property' },
      { id: 'property_management_services', name: 'Property Management Services' },
      { id: 'facility_maintenance_services', name: 'Facility Maintenance Services' },
    ],
  },
  {
    id: 'business_professional_services',
    name: 'Business & Professional Services',
    icon: '💼',
    description: 'Accounting, legal, marketing, HR, and business support',
    color: '#6366F1',
    type: 'both',
    featured: true,
    order: 7,
    subCategories: [
      { id: 'accounting_services', name: 'Accounting Services' },
      { id: 'legal_services', name: 'Legal Services' },
      { id: 'marketing_advertising', name: 'Marketing & Advertising' },
      { id: 'business_consulting', name: 'Business Consulting' },
      { id: 'printing_branding', name: 'Printing & Branding' },
      { id: 'hr_recruitment_services', name: 'HR & Recruitment Services' },
    ],
  },
  {
    id: 'education_training',
    name: 'Education & Training',
    icon: '📚',
    description: 'Courses, tutoring, skills, and career development',
    color: '#8B5CF6',
    type: 'both',
    featured: true,
    order: 8,
    subCategories: [
      { id: 'online_courses', name: 'Online Courses' },
      { id: 'private_tutors', name: 'Private Tutors' },
      { id: 'skill_training', name: 'Skill Training' },
      { id: 'career_coaching', name: 'Career Coaching' },
      { id: 'certification_programs', name: 'Certification Programs' },
    ],
  },
  {
    id: 'events_entertainment',
    name: 'Events & Entertainment',
    icon: '🎉',
    description: 'Planning, media, music, decor, and event catering',
    color: '#F59E0B',
    type: 'both',
    order: 9,
    subCategories: [
      { id: 'event_planning', name: 'Event Planning' },
      { id: 'photography_videography', name: 'Photography & Videography' },
      { id: 'dj_music_services', name: 'DJ & Music Services' },
      { id: 'decorations_rentals', name: 'Decorations & Rentals' },
      { id: 'events_catering_services', name: 'Catering Services' },
    ],
  },
  {
    id: 'agriculture_food',
    name: 'Agriculture & Food',
    icon: '🌾',
    description: 'Farm produce, livestock, equipment, and food services',
    color: '#84CC16',
    type: 'both',
    order: 10,
    subCategories: [
      { id: 'farm_produce', name: 'Farm Produce' },
      { id: 'livestock', name: 'Livestock' },
      { id: 'agricultural_equipment', name: 'Agricultural Equipment' },
      { id: 'food_delivery', name: 'Food Delivery' },
      { id: 'agriculture_catering_services', name: 'Catering Services' },
      { id: 'farming_consultation', name: 'Farming Consultation' },
    ],
  },
  {
    id: 'construction_engineering',
    name: 'Construction & Engineering',
    icon: '🏗️',
    description: 'Materials, contractors, design, and trades',
    color: '#78716C',
    type: 'both',
    order: 11,
    subCategories: [
      { id: 'building_materials', name: 'Building Materials' },
      { id: 'contractors', name: 'Contractors' },
      { id: 'architects_engineers', name: 'Architects & Engineers' },
      { id: 'renovation_services', name: 'Renovation Services' },
      { id: 'electrical_plumbing_services', name: 'Electrical & Plumbing Services' },
    ],
  },
  {
    id: 'freelance_digital_services',
    name: 'Freelance & Digital Services',
    icon: '🎨',
    description: 'Design, content, web, VA, and translation',
    color: '#06B6D4',
    type: 'both',
    order: 12,
    subCategories: [
      { id: 'graphic_design', name: 'Graphic Design' },
      { id: 'content_writing', name: 'Content Writing' },
      { id: 'social_media_management', name: 'Social Media Management' },
      { id: 'web_development', name: 'Web Development' },
      { id: 'virtual_assistance', name: 'Virtual Assistance' },
      { id: 'translation_services', name: 'Translation Services' },
    ],
  },
  {
    id: 'travel_hospitality',
    name: 'Travel & Hospitality',
    icon: '✈️',
    description: 'Stays, packages, transport, tours, and visa help',
    color: '#0EA5E9',
    type: 'both',
    order: 13,
    subCategories: [
      { id: 'hotels_apartments', name: 'Hotels & Apartments' },
      { id: 'travel_packages', name: 'Travel Packages' },
      { id: 'car_hire', name: 'Car Hire' },
      { id: 'tour_guides', name: 'Tour Guides' },
      { id: 'visa_assistance_services', name: 'Visa Assistance Services' },
    ],
  },
  {
    id: 'kids_babies',
    name: 'Kids & Babies',
    icon: '👶',
    description: 'Baby gear, toys, school items, and child-related services',
    color: '#F97316',
    type: 'both',
    order: 14,
    subCategories: [
      { id: 'baby_clothing', name: 'Baby Clothing' },
      { id: 'toys', name: 'Toys' },
      { id: 'school_supplies', name: 'School Supplies' },
      { id: 'babysitting_services', name: 'Babysitting Services' },
      { id: 'kids_event_services', name: 'Kids Event Services' },
    ],
  },
  {
    id: 'other_services',
    name: 'Other Services',
    icon: '📦',
    description: 'Repairs, errands, security, cleaning, and handyman work',
    color: '#94A3B8',
    type: 'both',
    order: 15,
    subCategories: [
      { id: 'other_repair_services', name: 'Repair Services' },
      { id: 'personal_errands', name: 'Personal Errands' },
      { id: 'security_services', name: 'Security Services' },
      { id: 'other_cleaning_services', name: 'Cleaning Services' },
      { id: 'handyman_services', name: 'Handyman Services' },
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
