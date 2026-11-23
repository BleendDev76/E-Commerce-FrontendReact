/**
 * Configuración centralizada de la aplicación y conexión con el Backend
 *
 * En desarrollo local: toma VITE_API_URL desde .env (o fallback a http://localhost:8081/api)
 * En producción (Vercel, Netlify, Cloudflare Pages): toma la variable inyectada durante el build.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8081/api";

export const API_ENDPOINTS = {
  productos: `${API_BASE_URL}/productos`,
  categorias: `${API_BASE_URL}/categorias`,
  usuarios: `${API_BASE_URL}/usuarios`,
  boletas: `${API_BASE_URL}/boletas`,
};
