import { z } from 'zod';

/** Data no formato YYYY-MM-DD, usada nos filtros de período. */
export const isoDateSchema = z.iso.date();

/** Data e hora em ISO 8601 (com offset), usada nas respostas. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
