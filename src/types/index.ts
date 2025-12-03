export interface RadioStation {
  id: string;
  name: string;
  description: string | null;
  genre: string;
  logo_url: string | null;
  stream_url: string;
  medicp_id: string | null;
  bitrate: number;
  is_featured: boolean;
  is_active: boolean;
  listener_count: number;
  icon_url: string | null;
  icon_emoji: string;
  background_url: string | null;
  background_color: string | null;
  background_type: 'solid' | 'gradient' | 'image';
  grid_row: number | null;
  grid_column: number | null;
  grid_page: number;
  recommended_for: string[]; // Lista objekata za koje je stanica preporučena
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  country_code: string;
  subscription_tier: 'free' | 'ad-free' | 'branded-radio';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'trial';
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  trial_started_at: string | null;
  cancel_at_period_end: boolean;
  theme_preference: 'light' | 'dark';
  total_listening_minutes: number;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  newsletter_subscribed: boolean;
  email_notifications: boolean;
  business_category: string | null;
  custom_location: string | null; // Korisnik unosi gde će puštati radio ako izabere "Ostalo"
  selected_plan_id: string | null;
  onboarding_completed: boolean;
  confetti_shown: boolean;
  trial_ui_config: TrialUIConfig | null;
  recommended_stations: string[]; // ID-jevi stanica koje admin preporučuje ovom korisniku
  jingle_url: string | null; // URL do mp3 fajla za džingl
  jingle_interval_minutes: number; // Interval u minutima za puštanje džingla (default: 7)
}

export interface TrialUIConfig {
  id: string;
  background_color: string;
  background_gradient_start: string;
  background_gradient_end: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  welcome_message: string;
  trial_badge_text: string;
  features_enabled: string[];
  show_confetti: boolean;
  show_timer: boolean;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'basic-radio' | 'branded-radio' | 'host-radio';
  paypal_subscription_id: string | null;
  paypal_customer_id: string | null;
  status: 'active' | 'inactive' | 'cancelled';
  started_at: string;
  ends_at: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrialPeriod {
  id: string;
  user_id: string;
  subscription_tier: 'basic-radio' | 'branded-radio' | 'host-radio';
  started_at: string;
  ends_at: string;
  is_active: boolean;
  converted_to_paid: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  paypal_payment_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payment_method: string | null;
  created_at: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  trialDays?: number;
  popular?: boolean;
}

export interface BusinessCategory {
  id: string;
  name: string;
  display_name_sr: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}
