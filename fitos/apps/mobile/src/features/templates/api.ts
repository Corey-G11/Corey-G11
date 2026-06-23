import { apiGet, apiPost } from '../../api/client';
import type { AdoptedProgram, ProgramTemplate } from './types';

export function fetchTemplates(token: string): Promise<ProgramTemplate[]> {
  return apiGet<ProgramTemplate[]>('/templates', token);
}

export function fetchTemplate(
  token: string,
  id: string,
): Promise<ProgramTemplate> {
  return apiGet<ProgramTemplate>(`/templates/${id}`, token);
}

export function adoptTemplate(
  token: string,
  id: string,
): Promise<AdoptedProgram> {
  return apiPost<AdoptedProgram>(`/templates/${id}/adopt`, {}, token);
}
