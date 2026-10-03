import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';

import { renderErrorPage } from './lib/error-page';

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
});

/**
 * Cabeçalhos de segurança em todas as respostas do servidor (SSR, 404 e server
 * functions). O dashboard exibe dados de pacientes: não pode ser embutido em
 * outros sites nem indexado por buscadores. Uma CSP completa exigiria nonce nos
 * scripts inline do SSR; aqui ela restringe só quem pode embutir a página.
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
};

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  // Aplicado na resposta final para cobrir também as respostas montadas pelo
  // próprio framework (ex.: 404), que ignoram setResponseHeaders.
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    result.response.headers.set(name, value);
  }
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
