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
  hero_mobile: boolean;
  hero_desktop: boolean;
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

export type ScheduleType = 'interval' | 'songs' | 'time';

export interface UserJingle {
  id: string;
  user_id: string;
  jingle_name: string;
  cloudinary_url?: string;
  cloudinary_public_id?: string;
  jingle_data?: string; // Base64 encoded audio data
  storage_type?: 'cloudinary' | 'base64';
  duration_seconds: number;
  file_size_bytes: number;
  play_order: number;
  is_active: boolean;
  schedule_type: ScheduleType;
  interval_minutes?: number;
  after_songs_count?: number;
  time_start?: string;
  time_end?: string;
  volume_boost_db?: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  username: string; // Add username field
  first_name: string; // Add first_name field
  last_name: string; // Add last_name field
  avatar_url?: string;
  bio?: string;
  phone_number?: string;
  country_code?: string;
  subscription_tier: 'none' | 'free' | 'basic-radio' | 'branded-radio' | 'host-radio';
  subscription_status: 'active' | 'inactive' | 'trial' | 'expired';
  theme_preference: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  business_category: string;
  custom_location?: string;
  venue_name?: string;
  jingle_url?: string;
  jingle_interval_minutes: number;
  my_radio_stream_url?: string;
  newsletter_subscribed?: boolean;
  cancel_at_period_end?: boolean;
  trial_ui_config?: any;
  recommended_stations?: string[];
  created_at?: string;
  subscription_ends_at?: string;
  trial_ends_at?: string;
  trial_started_at?: string;
  is_admin: boolean;
  confetti_shown: boolean;
  onboarding_completed: boolean;
  total_listening_minutes: number;
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
