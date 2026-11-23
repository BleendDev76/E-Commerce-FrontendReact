import {
  obtenerToken,
  verificarAccesoAdmin,
  cerrarSesion,
} from "./services/authService.js";
import {
  listarProductos,
  obtenerProductoPorId,
  listarCategorias,
  crearProducto,
  actualizarProducto,
  eliminarProducto as eliminarProductoAPI,
} from "./services/productoService.js";

// Elementos del DOM
const form = document.getElementById("form-producto");
const tablaBody = document.getElementById("tabla-productos-body");
const feedbackEl = document.getElementById("mensaje-feedback");
const btnCancelar = document.getElementById("btn-cancelar");
const formTitle = document.getElementById("form-title");
const btnSalir = document.getElementById("authSalir");
const selectCategoria = document.getElementById("prod-categoria");
const btnGuardar = document.getElementById("btn-guardar");

let editandoId = null;

// Menú del header en móvil: reusa la clase .nav-abierta del navbar público.
const headerInner = document.querySelector(".header-inner");
const navToggleAdmin = document.getElementById("navToggleAdmin");

if (headerInner && navToggleAdmin) {
  navToggleAdmin.addEventListener("click", () => {
    const abierto = headerInner.classList.toggle("nav-abierta");

    navToggleAdmin.setAttribute("aria-expanded", String(abierto));
    navToggleAdmin.setAttribute(
      "aria-label",
      abierto ? "Cerrar menú" : "Abrir menú",
    );
  });
}

// Inicialización con protección de ruta (RBAC)
document.addEventListener("DOMContentLoaded", async () => {
  const tieneAcceso = await verificarAccesoAdmin();
  if (!tieneAcceso) return;

  configurarEventos();
  await Promise.all([cargarCategorias(), obtenerProductos()]);
});

// Configuración de listeners globales de la página
function configurarEventos() {
  if (btnSalir) {
    btnSalir.addEventListener("click", async () => {
      try {
        const { error } = await cerrarSesion();
        if (error) {
          mostrarFeedback("Error al cerrar sesión: " + error.message, "error");
          return;
        }
        window.location.href = "/";
      } catch (err) {
        mostrarFeedback("Error al cerrar sesión: " + err.message, "error");
      }
    });
  }

  btnCancelar.addEventListener("click", resetearFormulario);

  tablaBody.addEventListener("click", (e) => {
    const btnEdit = e.target.closest(".btn-edit");
    const btnDelete = e.target.closest(".btn-delete");

    if (btnEdit) {
      const id = btnEdit.dataset.id;
      prepararEdicion(id);
    } else if (btnDelete) {
      const id = btnDelete.dataset.id;
      eliminarProducto(id);
    }
  });
}

function mostrarFeedback(mensaje, tipo) {
  feedbackEl.className = "";
  feedbackEl.classList.add(tipo === "error" ? "error" : "exito");
  feedbackEl.textContent = mensaje;
  feedbackEl.style.display = "block";
}

// Cargar y Listar Categorías dinámicamente desde el Backend
async function cargarCategorias() {
  if (!selectCategoria) return;
  try {
    const categorias = await listarCategorias();
    selectCategoria.innerHTML = '<option value="">-- Seleccionar --</option>';
    categorias.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nombre;
      selectCategoria.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar categorías:", error);
    mostrarFeedback(
      "No se pudieron cargar las categorías desde el backend: " + error.message,
      "error",
    );
  }
}

// Obtener y Listar Productos desde el Backend Spring Boot
async function obtenerProductos() {
  tablaBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Cargando inventario desde el servidor...</td></tr>`;

  try {
    const productos = await listarProductos();
    tablaBody.innerHTML = "";

    if (!productos || productos.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay productos registrados en el inventario.</td></tr>`;
      return;
    }

    // Ordenar de forma descendente por ID
    productos.sort((a, b) => (b.id || 0) - (a.id || 0));

    productos.forEach((prod) => {
      const stockCritico = prod.stockCritico ?? prod.stock_critico ?? 5;
      const esCritico = prod.stock <= stockCritico;
      const badgeClass = esCritico ? "stock-critico" : "stock-normal";
      const badgeTexto = esCritico ? `${prod.stock} ⚠️` : `${prod.stock}`;
      const categoriaNombre =
        prod.categoria?.nombre || prod.categoria || "Sin categoría";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${prod.codigo}</strong></td>
        <td>${prod.nombre}</td>
        <td>${categoriaNombre}</td>
        <td>$${Number(prod.precio).toLocaleString("es-CL")}</td>
        <td><span class="stock-badge ${badgeClass}">${badgeTexto}</span></td>
        <td>
          <button class="btn-edit" data-id="${prod.id}" title="Editar">✏️</button>
          <button class="btn-delete" data-id="${prod.id}" title="Eliminar">🗑️</button>
        </td>
      `;
      tablaBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error al cargar productos:", error);
    mostrarFeedback(
      "Error al cargar productos desde el backend: " + error.message,
      "error",
    );
    tablaBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-error, #d9534f);">Error al conectar con el backend. Asegúrate de que Spring Boot esté corriendo en el puerto 8081.</td></tr>`;
  }
}

// MANEJO DEL FORMULARIO (Crear / Editar con Spring Boot)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  feedbackEl.style.display = "none";

  const codigo = document.getElementById("prod-codigo").value.trim();
  const nombre = document.getElementById("prod-nombre").value.trim();
  const categoria = document.getElementById("prod-categoria").value;
  const precioInput = document.getElementById("prod-precio").value.trim();
  const stockInput = document.getElementById("prod-stock").value.trim();
  const stockCriticoInput = document
    .getElementById("prod-stock-critico")
    .value.trim();
  const imagen = document.getElementById("prod-imagen").value.trim();
  const descripcion = document.getElementById("prod-descripcion").value.trim();

  const precio = Number(precioInput);
  const stock = Number(stockInput);
  const stockCritico = stockCriticoInput !== "" ? Number(stockCriticoInput) : 5;

  if (codigo.length < 3) {
    mostrarFeedback("El código debe tener al menos 3 caracteres.", "error");
    return;
  }

  if (nombre === "" || nombre.length > 100) {
    mostrarFeedback(
      "Ingresa un nombre válido (máximo 100 caracteres).",
      "error",
    );
    return;
  }

  if (categoria === "") {
    mostrarFeedback("Por favor, selecciona una categoría válida.", "error");
    return;
  }

  if (precioInput === "" || isNaN(precio) || precio <= 0) {
    mostrarFeedback("El precio debe ser un número mayor a 0.", "error");
    return;
  }

  if (
    stockInput === "" ||
    isNaN(stock) ||
    stock < 0 ||
    !Number.isInteger(stock)
  ) {
    mostrarFeedback(
      "El stock debe ser un número entero mayor o igual a 0.",
      "error",
    );
    return;
  }

  const payload = {
    codigo,
    nombre,
    descripcion,
    precio,
    stock,
    stockCritico,
    categoriaId: Number(categoria),
    imagenUrl: imagen,
    destacado: false,
  };

  // Prevenir envíos múltiples
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = editandoId ? "Actualizando..." : "Guardando...";
  }

  try {
    const token = await obtenerToken();
    if (!token) {
      mostrarFeedback(
        "Sesión expirada o no iniciada. Por favor, inicia sesión.",
        "error",
      );
      setTimeout(() => {
        window.location.href = "/src/pages/login.html";
      }, 2000);
      return;
    }

    if (editandoId) {
      await actualizarProducto(editandoId, payload, token);
      mostrarFeedback("¡Producto actualizado con éxito!", "exito");
    } else {
      await crearProducto(payload, token);
      mostrarFeedback("¡Producto creado con éxito!", "exito");
    }

    resetearFormulario();
    await obtenerProductos();
  } catch (error) {
    console.error("Error al procesar producto:", error);
    mostrarFeedback(error.message, "error");
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = editandoId
        ? "Actualizar Producto"
        : "Guardar Producto";
    }
  }
});

// Eliminar Producto vía Spring Boot
async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
    return;
  }

  try {
    const token = await obtenerToken();
    if (!token) {
      mostrarFeedback(
        "Sesión expirada. Por favor, vuelve a iniciar sesión.",
        "error",
      );
      return;
    }

    await eliminarProductoAPI(id, token);
    mostrarFeedback("Producto eliminado correctamente.", "exito");

    // Si estábamos editando este mismo producto, limpiamos el formulario
    if (String(editandoId) === String(id)) {
      resetearFormulario();
    }

    await obtenerProductos();
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    mostrarFeedback("Error al eliminar: " + error.message, "error");
  }
}

// Preparar edición vía Spring Boot
async function prepararEdicion(id) {
  try {
    const prod = await obtenerProductoPorId(id);
    if (!prod) return;

    editandoId = id;
    document.getElementById("prod-id").value = prod.id;
    document.getElementById("prod-codigo").value = prod.codigo;
    document.getElementById("prod-nombre").value = prod.nombre;
    document.getElementById("prod-categoria").value = prod.categoria?.id || "";
    document.getElementById("prod-precio").value = prod.precio;
    document.getElementById("prod-stock").value = prod.stock;
    document.getElementById("prod-stock-critico").value =
      prod.stockCritico ?? 5;
    document.getElementById("prod-imagen").value = prod.imagenUrl || "";
    document.getElementById("prod-descripcion").value = prod.descripcion || "";

    formTitle.textContent = "Editar Producto";
    btnCancelar.classList.remove("is-hidden");
    if (btnGuardar) btnGuardar.textContent = "Actualizar Producto";

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    mostrarFeedback(
      "No se pudo obtener el producto: " + error.message,
      "error",
    );
  }
}

function resetearFormulario() {
  editandoId = null;
  form.reset();
  formTitle.textContent = "Agregar Nuevo Producto";
  btnCancelar.classList.add("is-hidden");
  if (btnGuardar) {
    btnGuardar.textContent = "Guardar Producto";
    btnGuardar.disabled = false;
  }
}
