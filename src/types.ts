export interface SiteSettings {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue_line: string | null;
  story_title: string | null;
  story_body: string | null;
  hero_image_url: string | null;
  page_color: string;
  bg_color: string;
  page_width: number;
  heading_font: string;
  body_font: string;
  typography: Record<string, TypeStyle>;
  rsvp_intro: string | null;
  rsvp_deadline: string | null;
  show_rsvp_button: boolean;
  show_rsvp_section: boolean;
  welcome_layout: string;
  cta_text: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_radius: number;
  cta_size: string;
  env_color: string;
  env_liner_color: string;
  seal_color: string;
  seal_style: string;
  env_greeting: string | null;
  env_button_text: string;
  monogram_url: string | null;
  letter_body: string | null;
  letter_font: string;
  env_liner_pattern: string;
  password_enabled: boolean;
  public_password: string | null;
  env_cta_type: 'internal' | 'external';
  env_cta_link: string | null;
  env_font_color: string;
  footer_monogram_url: string | null;
  site_monogram_url: string | null;
  footer_text: string | null;
  footer_bg_color: string;
  hero_pretitle_text: string | null;
  hero_married_text: string | null;
  music_url: string | null;
  music_autoplay: boolean;
  petal_animation_enabled: boolean;
  petal_color: string;
  petal_size: number;
  petal_count: number;
  petal_speed: number;
  // Invitation designer fields
  invitation_envelope_color: string | null;
  invitation_wax_seal_color: string | null;
  invitation_wax_seal_image_url: string | null;
  invitation_flap_show_name: boolean;
  invitation_flap_name_text: string | null;
  invitation_flap_name_color: string | null;
  invitation_flap_name_font: string;
  invitation_paper_background_color: string | null;
  invitation_paper_text_color: string | null;
  invitation_paper_border_color: string | null;
  invitation_paper_image_url: string | null;
  invitation_paper_heading_font: string | null;
  invitation_paper_heading_color: string | null;
  invitation_paper_show_names: boolean | null;
  invitation_paper_body_font: string | null;
  invitation_paper_body: string | null;
  invitation_paper_buttons: InvitationButton[];
  invitation_email_photo_url: string | null;
  invitation_email_attachments: EmailAttachment[];
  invitation_email_subject: string | null;
  invitation_email_body_html: string | null;
  gate_title_color: string | null;
  gate_title_font: string | null;
  gate_button_bg_color: string | null;
  gate_button_text_color: string | null;
  gate_button_radius: number | null;
  portal_button_bg_color: string | null;
  portal_button_text_color: string | null;
  portal_bg_color: string | null;
  portal_text_color: string | null;
  portal_text_font: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitationButton {
  label: string;
  link_type: 'rsvp' | 'find_table' | 'welcome' | 'page' | 'external';
  link_value: string;
}

export interface EmailAttachment {
  name: string;
  url: string;
}

export interface TypeStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  map_url: string | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface WeddingEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  parent_id: string | null;
  venue_id: string | null;
  display_order: number;
  rsvp_enabled: boolean;
  show_location: boolean;
  show_venue_photo: boolean;
  photo_url: string | null;
  created_at: string;
  venue?: Venue | null;
  sub_events?: WeddingEvent[];
}

export interface GalleryPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  layout: string;
  display_order: number;
  created_at: string;
}

export interface RsvpQuestion {
  id: string;
  label: string;
  field_key: string;
  input_type: string;
  options: string[];
  required: boolean;
  display_order: number;
  event_id: string | null;
  column_name: string | null;
  yes_text: string;
  no_text: string;
  is_attendance: boolean;
  guest_tags: string[];
  question_type: string;
  sub_question: string | null;
  yes_label: string | null;
  no_label: string | null;
  terms_body: string | null;
  accept_label: string | null;
  conditional_sub_questions: ConditionalSubQuestion[];
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  party_size: number;
  plus_ones: number;
  rsvp_status: string;
  attendance: Record<string, string>;
  dietary: string | null;
  plus_one_name: string | null;
  song_requests: string | null;
  notes: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  proxy_guest_name: string | null;
  party_id: string | null;
  tags: string[];
  plus_one_allowed: boolean;
  is_party_leader: boolean;
  name_on_card: string | null;
  created_at: string;
}

export interface GuestEventRsvp {
  id: string;
  guest_id: string;
  event_id: string;
  status: string;
  created_at: string;
}

export interface RsvpAnswer {
  id: string;
  guest_id: string;
  question_id: string;
  answer: string | null;
}

export interface SeatingTable {
  id: string;
  name: string;
  shape: 'round' | 'rectangular' | 'banquet';
  capacity: number;
  display_order: number;
  created_at: string;
  assignments?: SeatAssignment[];
}

export interface SeatAssignment {
  id: string;
  table_id: string;
  guest_id: string;
  seat_number: number;
  created_at: string;
  guest?: Guest | null;
}

export interface Invitation {
  id: string;
  guest_id: string;
  token: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
  guest?: Guest | null;
}

export interface EmailSettings {
  id: string;
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  from_email: string | null;
  from_name: string | null;
  subject_line: string;
  email_body: string;
  site_url: string | null;
  email_photo_url: string | null;
  email_body_html: string | null;
  email_attachments: EmailAttachment[];
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  template: 'welcome' | 'story' | 'gallery' | 'schedule' | 'rsvp' | 'find-table' | 'venue' | 'entourage' | 'document' | 'custom' | 'information';
  is_visible: boolean;
  display_order: number;
  config: Record<string, unknown>;
  hero_image_url: string | null;
  body_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryMilestone {
  id: string;
  page_id: string;
  title: string;
  milestone_date: string | null;
  body: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
}

export interface ConditionalSubQuestion {
  option_value: string;
  label: string;
  field_key: string;
  input_type: string;
  placeholder?: string;
}

export interface EntourageColumn {
  label: string;
  side?: 'bride' | 'groom' | 'neutral';
  names: string[];
  label_font_family?: string;
  label_font_size?: number;
  label_font_color?: string;
  label_bold?: boolean;
  label_italic?: boolean;
  label_underline?: boolean;
  name_font_family?: string;
  name_font_size?: number;
  name_font_color?: string;
  name_bold?: boolean;
  name_italic?: boolean;
  name_underline?: boolean;
}

export interface EntourageBlock {
  sub_header: string;
  sub_header_font_family?: string;
  sub_header_font_size?: number;
  sub_header_font_color?: string;
  sub_header_bold?: boolean;
  sub_header_italic?: boolean;
  sub_header_underline?: boolean;
  columns: EntourageColumn[];
}

export interface EntourageSection {
  title: string;
  font_family?: string;
  font_size?: number;
  font_color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  blocks: EntourageBlock[];
}

export interface EntourageConfig {
  title: string;
  sections: EntourageSection[];
}

export interface InformationBlock {
  heading: string;
  body_html: string;
  photo_url: string | null;
  heading_font_family?: string;
  heading_font_color?: string;
  heading_font_size?: number;
  body_font_family?: string;
  body_font_color?: string;
  body_font_size?: number;
}

export interface InformationConfig {
  title: string;
  blocks: InformationBlock[];
}

export interface Party {
  id: string;
  name: string;
  guest_token: string | null;
  created_at: string;
}

export interface Collaborator {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  created_at: string;
}

export interface EntourageMember {
  id: string;
  page_id: string;
  block_header: string;
  block_subheader: string | null;
  name: string;
  role_title: string | null;
  photo_url: string | null;
  display_order: number;
  created_at: string;
}

export type EntityType = 'site_settings' | 'venues' | 'events' | 'gallery_photos' | 'rsvp_questions' | 'guests' | 'guest_event_rsvps' | 'rsvp_answers' | 'seating_tables' | 'seat_assignments' | 'invitations' | 'email_settings' | 'pages' | 'story_milestones' | 'parties' | 'collaborators' | 'entourage_members';
