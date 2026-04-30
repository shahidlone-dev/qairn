// src/api/services.api.ts

import api from './client';
import type { ServiceListing, ServiceBooking, CursorPage, PageParams } from '../types/api.types';

type ServiceFilters = PageParams & {
  type?:  'tutor' | 'assignment';
  dept?:  string;
  query?: string;
};

const ServicesApi = {

  // ── Get services (paginated) ──────────────────────────────────────────────
  getServices: (filters: ServiceFilters = {}) => {
    const q = new URLSearchParams({ limit: String(filters.limit ?? 20) });
    if (filters.cursor) q.set('cursor', filters.cursor);
    if (filters.type)   q.set('type',   filters.type);
    if (filters.dept)   q.set('dept',   filters.dept);
    if (filters.query)  q.set('query',  filters.query);
    return api.get<CursorPage<ServiceListing>>(`/services?${q}`, false);
  },

  // ── Single service ────────────────────────────────────────────────────────
  getService: (id: string) =>
    api.get<{ service: ServiceListing }>(`/services/${id}`, false),

  // ── Book tutor session ────────────────────────────────────────────────────
  bookSession: (serviceId: string, body: { hours: number; session_time?: string }) =>
    api.post<{ booking: ServiceBooking }>(`/services/${serviceId}/book`, body),

  // ── Order assignment ──────────────────────────────────────────────────────
  orderAssignment: (serviceId: string, body: {
    pages:         number;
    deadline?:     string;
    instructions?: string;
  }) =>
    api.post<{ booking: ServiceBooking }>(`/services/${serviceId}/order`, body),

  // ── Confirm delivery ──────────────────────────────────────────────────────
  confirmDelivery: (serviceId: string) =>
    api.patch<{ booking: ServiceBooking }>(`/services/${serviceId}/confirm`, {}),

  // ── My bookings ───────────────────────────────────────────────────────────
  getMyBookings: (role: 'client' | 'provider' = 'client') =>
    api.get<{ bookings: ServiceBooking[] }>(`/services/bookings?role=${role}`),
};

export default ServicesApi;