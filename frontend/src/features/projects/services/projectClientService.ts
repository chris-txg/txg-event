import { bffFetch, BffResponse } from '@/lib/api/bff-client';
import {
  EventProjectDetail,
  PaginatedProjectsResponse,
  ProjectFilters,
} from '@/features/projects/types/project.types';

export const projectClientService = {
  async getProjects(filters?: ProjectFilters): Promise<BffResponse<PaginatedProjectsResponse>> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.page_size) params.set('page_size', filters.page_size.toString());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString();
    const endpoint = `/api/projects${query ? `?${query}` : ''}`;
    return bffFetch<PaginatedProjectsResponse>(endpoint, { method: 'GET' });
  },

  async getProjectById(id: string): Promise<BffResponse<EventProjectDetail>> {
    return bffFetch<EventProjectDetail>(`/api/projects/${id}`, { method: 'GET' });
  },

  async createProject(formData: FormData): Promise<BffResponse<EventProjectDetail>> {
    return bffFetch<EventProjectDetail>('/api/projects', {
      method: 'POST',
      body: formData,
    });
  },
};
