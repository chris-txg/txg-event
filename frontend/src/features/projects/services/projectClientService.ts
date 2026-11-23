import { bffFetch, BffResponse } from '@/lib/api/bff-client';
import { BFF_ENDPOINTS } from '@/config/endpoints';
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
    const endpoint = `${BFF_ENDPOINTS.PROJECTS.LIST}${query ? `?${query}` : ''}`;
    return bffFetch<PaginatedProjectsResponse>(endpoint, { method: 'GET' });
  },

  async getProjectById(id: string): Promise<BffResponse<EventProjectDetail>> {
    return bffFetch<EventProjectDetail>(BFF_ENDPOINTS.PROJECTS.DETAIL(id), { method: 'GET' });
  },

  async createProject(formData: FormData): Promise<BffResponse<EventProjectDetail>> {
    return bffFetch<EventProjectDetail>(BFF_ENDPOINTS.PROJECTS.LIST, {
      method: 'POST',
      body: formData,
    });
  },

  async updateProject(id: string, formData: FormData): Promise<BffResponse<EventProjectDetail>> {
    return bffFetch<EventProjectDetail>(BFF_ENDPOINTS.PROJECTS.DETAIL(id), {
      method: 'PATCH',
      body: formData,
    });
  },

  async deleteDocument(projectId: string, documentId: string): Promise<BffResponse<unknown>> {
    return bffFetch<unknown>(BFF_ENDPOINTS.PROJECTS.DOCUMENT(projectId, documentId), {
      method: 'DELETE',
    });
  },
};
