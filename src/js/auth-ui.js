// Modales de login y registro.
//
// El navbar lo monta React después de este módulo, así que acá no se buscan
// elementos al cargar: se delegan los clics en el documento y cada modal se
// resuelve en el momento. Antes el archivo devolvía temprano cuando no
// encontraba los botones del header, y con eso dejaba muertos los enlaces
// [data-auth-abrir] del checkout y de Mi cuenta.

const MODALES = {
  login: "authModalLogin",
  registro: "authModalRegistro",
};

function modal(quien) {
  return document.getElementById(MODALES[quien] || "");
}

function abrir(quien) {
  const dialogo = modal(quien);

  if (dialogo && !dialogo.open) dialogo.showModal();
}

function cerrarTodos() {
  Object.values(MODALES).forEach((id) => {
    const dialogo = document.getElementById(id);

    if (dialogo && dialogo.open) dialogo.close();
  });
}

document.addEventListener("click", (evento) => {
  // Abrir login o registro desde cualquier página.
  const abre = evento.target.closest("[data-auth-abrir]");

  if (abre) {
    evento.preventDefault();
    abrir(abre.dataset.authAbrir);
    return;
  }

  if (evento.target.closest("[data-auth-cerrar]")) {
    cerrarTodos();
    return;
  }

  // Cambiar entre login y registro.
  const ir = evento.target.closest("[data-auth-ir]");

  if (ir) {
    evento.preventDefault();
    cerrarTodos();
    abrir(ir.dataset.authIr);
    return;
  }

  // Clic fuera del modal: el propio <dialog> también es target de su padding,
  // así que se comparan las coordenadas con su caja, no event.target.
  if (
    evento.target instanceof HTMLDialogElement &&
    evento.target.classList.contains("auth-modal")
  ) {
    const caja = evento.target.getBoundingClientRect();
    const dentro =
      evento.clientX >= caja.left &&
      evento.clientX <= caja.right &&
      evento.clientY >= caja.top &&
      evento.clientY <= caja.bottom;

    if (!dentro) evento.target.close();
  }
});
