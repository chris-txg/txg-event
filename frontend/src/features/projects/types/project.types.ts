export interface SupportingDocument {
  id: string;
  file: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
}

export type ProjectStatus = 'draft' | 'created';

export interface EventProjectListItem {
  id: string;
  project_name: string;
  status: ProjectStatus;
  event_segment: string;
  event_category: string;
  event_subcategory?: string | null;
  organiser_name: string;
  official_email: string;
  event_city: string;
  event_country: string;
  proposed_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventProjectDetail extends EventProjectListItem {
  designation?: string | null;
  contact_number?: string | null;
  organiser_country?: string | null;
  organiser_region?: string | null;
  event_state?: string | null;
  event_locality?: string | null;
  duration?: string | null;
  expected_attendance?: number | null;
  target_audience?: string | null;
  project_description?: string | null;
  event_objective?: string | null;
  event_format?: string | null;
  estimated_budget_range?: string | null;
  currency?: string | null;
  required_services?: string[] | null;
  research_objective?: string | null;
  research_start_date?: string | null;
  research_end_date?: string | null;
  survey_count?: number;
  documents: SupportingDocument[];
}

export interface PaginatedProjectsResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: EventProjectListItem[];
}

export interface ProjectFilters {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}
