import { supabase } from "../supabase.js";

/**
 * Servicio de Autenticación
 *
 * Abstrae la gestión de sesión, tokens y control de acceso (RBAC).
 * Permite que las vistas no dependan directamente del cliente de Supabase,
 * facilitando la migración completa de autenticación a Spring Boot.
 */

/**
 * Obtiene el token JWT actual para autorizar peticiones HTTP hacia el Backend.
 * Si el token está por expirar o ya expiró, intenta refrescar la sesión automáticamente.
 * @returns {Promise<string|null>} Token JWT o null si no hay sesión
 */
export async function obtenerToken() {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const ahora = Math.floor(Date.now() / 1000);

  // Si el token está próximo a expirar (en menos de 60 segundos) o ya expiró
  if (session.expires_at && session.expires_at <= ahora + 60) {
    console.log("Token JWT expirado o próximo a expirar. Refrescando sesión con Supabase...");
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData?.session) {
      console.warn("No se pudo refrescar la sesión automáticamente:", refreshError);
    } else {
      session = refreshData.session;
    }
  }

  // Diagnóstico del token en consola para verificar algoritmo y expiración
  try {
    const token = session.access_token;
    const [headerB64, payloadB64] = token.split(".");
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    const expirado = payload.exp <= ahora;

    console.log("Diagnóstico de Token JWT:", {
      alg: header.alg,
      expiracion: new Date(payload.exp * 1000).toLocaleString(),
      estaExpirado: expirado,
      email: payload.email,
      sub: payload.sub,
    });
  } catch (e) {
    // Si no se puede parsear atob, continuar
  }

  return session?.access_token || null;
}

/**
 * Obtiene la sesión activa
 * @returns {Promise<Object|null>}
 */
export async function obtenerSesion() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Guardia de ruta (RBAC): Valida si el usuario actual es Administrador o Vendedor.
 * Redirige si no tiene sesión o permisos.
 * @returns {Promise<boolean>}
 */
export async function verificarAccesoAdmin() {
  const session = await obtenerSesion();

  if (!session) {
    alert("Debes iniciar sesión para acceder al panel de administración.");
    window.location.href = "/src/pages/login.html";
    return false;
  }

  // Consultar el rol en public.usuarios
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (
    error ||
    !usuario ||
    !["Administrador", "Vendedor"].includes(usuario.rol)
  ) {
    alert("Acceso denegado: No tienes permisos para gestionar productos.");
    window.location.href = "/";
    return false;
  }

  return true;
}

/**
 * Cierra la sesión activa del usuario
 * @returns {Promise<{error: any}>}
 */
export async function cerrarSesion() {
  return await supabase.auth.signOut();
}
