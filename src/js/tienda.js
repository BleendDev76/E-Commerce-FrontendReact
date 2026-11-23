import { listarProductos } from "./services/productoService.js";
import { escaparHTML as esc, precioCLP } from "./validaciones.js";
import { agregar, pintar } from "./carrito.js";

// Plantilla de cada producto renderizada desde el DTO del Backend
const PLANTILLA_PRODUCTO = (p) => {
  const imagen = p.imagenUrl || p.imagen_url || "";
  const categoriaNombre =
    p.categoria?.nombre || p.categoria || "Plato típico";
  const descripcion = p.descripcion || "";

  return `
  <article class="producto revelar" data-producto-id="${esc(p.id)}">
    <figure class="producto-img">
      ${
        imagen
          ? `<img
              src="${esc(imagen)}"
              alt="${esc(p.nombre)}"
              width="800"
              height="600"
              loading="lazy"
            />`
          : ""
      }
    </figure>

    <div class="producto-body">
      <p class="producto-categoria">${esc(categoriaNombre)}</p>
      <h3 class="producto-nombre">${esc(p.nombre)}</h3>
      <p class="producto-desc">${esc(descripcion)}</p>
      <p class="precio">${precioCLP(p.precio)}</p>

      <button
        type="button"
        class="btn-agregar-carrito"
        data-producto-id="${esc(p.id)}"
        data-producto-nombre="${esc(p.nombre)}"
        data-producto-precio="${p.precio}"
        aria-label="Agregar ${esc(p.nombre)} al carrito"
      >
        <span class="btn-agregar-texto">Agregar al carrito</span>
      </button>
    </div>
  </article>
`;
};

const contenedores = document.querySelectorAll("[data-catalogo]");

if (contenedores.length) {
  try {
    const productos = await listarProductos();

    if (!productos || !productos.length) {
      contenedores.forEach((contenedor) => {
        contenedor.innerHTML = `
          <p class="productos-lead">
            No hay platos disponibles en este momento.
          </p>
        `;
      });
    } else {
      contenedores.forEach((contenedor) => {
        const lista =
          contenedor.dataset.catalogo === "destacados"
            ? productos.filter((p) => p.destacado)
            : productos;

        if (!lista.length && contenedor.dataset.catalogo === "destacados") {
          // Si no hay ninguno marcado explícitamente como destacado, mostramos los primeros 3
          contenedor.innerHTML = productos.slice(0, 3).map(PLANTILLA_PRODUCTO).join("");
        } else {
          contenedor.innerHTML = lista.map(PLANTILLA_PRODUCTO).join("");
        }
      });
    }
  } catch (error) {
    console.error("No se pudo cargar el catálogo desde el backend:", error.message);

    contenedores.forEach((contenedor) => {
      contenedor.innerHTML = `
        <p class="productos-lead">
          No se pudo cargar la carta. Intenta de nuevo más tarde.
        </p>
      `;
    });
  } finally {
    document.dispatchEvent(new Event("catalogo-listo"));
  }
}

// El botón confirma el alta un instante antes de volver a su estado normal.
function marcarAgregado(boton) {
  const etiqueta = boton.querySelector(".btn-agregar-texto");

  if (!etiqueta) return;

  clearTimeout(boton.temporizadorTexto);

  boton.classList.add("is-agregado");
  etiqueta.textContent = "Agregado";

  boton.temporizadorTexto = setTimeout(() => {
    boton.classList.remove("is-agregado");
    etiqueta.textContent = "Agregar al carrito";
  }, 1200);
}

// Agregar productos al carrito. No pide sesión: el carrito es del navegador.
document.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".btn-agregar-carrito");

  if (!boton) return;

  agregar({
    id: boton.dataset.productoId,
    nombre: boton.dataset.productoNombre,
    precio: boton.dataset.productoPrecio,
  });

  pintar();
  marcarAgregado(boton);
});
