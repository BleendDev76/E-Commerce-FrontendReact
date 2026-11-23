import { API_ENDPOINTS } from "../config.js";

/**
 * Función auxiliar para procesar respuestas HTTP y formatear errores RFC 7807 (ProblemDetail)
 */
async function procesarRespuesta(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  const esJson = contentType && contentType.includes("application/json");
  let data = null;
  try {
    data = esJson ? await response.json() : await response.text();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    console.error("Error en la respuesta de la API:", {
      status: response.status,
      statusText: response.statusText,
      data,
      wwwAuthenticate: response.headers.get("www-authenticate"),
    });

    let mensajeError = `Error ${response.status}: ${response.statusText || "Error en el servidor"}`;

    if (data && typeof data === "object") {
      if (data.detail) {
        mensajeError = data.detail;
      } else if (data.title) {
        mensajeError = data.title;
      } else if (data.message) {
        mensajeError = data.message;
      } else if (data.error) {
        mensajeError = `Error ${response.status} (${data.error})`;
      }

      if (data.invalidParams && typeof data.invalidParams === "object") {
        const detalles = Object.entries(data.invalidParams)
          .map(([campo, msg]) => `${campo}: ${msg}`)
          .join(", ");
        mensajeError += ` (${detalles})`;
      }
    } else if (typeof data === "string" && data.trim().length > 0) {
      mensajeError = data.trim();
    }

    // Manejo específico de autenticación y autorización
    if (response.status === 401) {
      const authHeader = response.headers.get("www-authenticate");
      mensajeError = `Error 401 (No autorizado): El token JWT no es válido o ha expirado. ${
        authHeader ? "[" + authHeader + "]" : ""
      }`;
    } else if (response.status === 403) {
      mensajeError = `Error 403 (Acceso denegado): Tu usuario no tiene el rol ADMINISTRADOR o VENDEDOR en la base de datos del backend.`;
    }

    const error = new Error(mensajeError);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Obtiene la lista completa de productos desde el backend Spring Boot
 * @returns {Promise<Array>} Lista de productos (ProductoResponseDTO)
 */
export async function listarProductos() {
  const response = await fetch(API_ENDPOINTS.productos, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return procesarRespuesta(response);
}

/**
 * Obtiene el detalle de un producto por su ID
 * @param {number|string} id ID del producto
 * @returns {Promise<Object>} Producto (ProductoResponseDTO)
 */
export async function obtenerProductoPorId(id) {
  const response = await fetch(`${API_ENDPOINTS.productos}/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return procesarRespuesta(response);
}

/**
 * Obtiene la lista de categorías registradas en el backend
 * @returns {Promise<Array>} Lista de categorías (CategoriaResponseDTO)
 */
export async function listarCategorias() {
  const response = await fetch(API_ENDPOINTS.categorias, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return procesarRespuesta(response);
}

/**
 * Crea un nuevo producto (Requiere rol ADMINISTRADOR o VENDEDOR)
 * @param {Object} productoDTO Datos del producto
 * @param {string} token JWT de autorización
 * @returns {Promise<Object>} Producto creado
 */
export async function crearProducto(productoDTO, token) {
  const response = await fetch(API_ENDPOINTS.productos, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productoDTO),
  });
  return procesarRespuesta(response);
}

/**
 * Actualiza un producto existente (Requiere rol ADMINISTRADOR o VENDEDOR)
 * @param {number|string} id ID del producto
 * @param {Object} productoDTO Datos actualizados
 * @param {string} token JWT de autorización
 * @returns {Promise<Object>} Producto actualizado
 */
export async function actualizarProducto(id, productoDTO, token) {
  const response = await fetch(`${API_ENDPOINTS.productos}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productoDTO),
  });
  return procesarRespuesta(response);
}

/**
 * Elimina un producto por su ID (Requiere rol ADMINISTRADOR o VENDEDOR)
 * @param {number|string} id ID del producto
 * @param {string} token JWT de autorización
 * @returns {Promise<void>}
 */
export async function eliminarProducto(id, token) {
  const response = await fetch(`${API_ENDPOINTS.productos}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return procesarRespuesta(response);
}
