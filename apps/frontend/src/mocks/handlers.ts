import { http, HttpResponse } from 'msw';
import { calendarHandlers } from './handlers/calendar';

export const handlers = [
  ...calendarHandlers,
];
