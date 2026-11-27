// Recuperación de contraseña. La misma página hace los dos pasos:
//
// 1. Sin sesión: pide el correo y manda el enlace de Supabase.
// 2. Con la sesión de recuperación que deja el enlace: pide la contraseña nueva.
//
// El correo de confirmación se configura con redirectTo a esta misma página.

import { supabase } from "./supabase.js";
import { errorCorreo } from "./validaciones.js";

const recuperarForm = document.getElementById("recuperarForm");
const restablecerForm = document.getElementById("restablecerForm");

function mostrarPaso(recuperacion) {
  if (recuperarForm) recuperarForm.hidden = recuperacion;
  if (restablecerForm) restablecerForm.hidden = !recuperacion;
}

// --- Paso 1: pedir el enlace ------------------------------------------------

const email = document.getElementById("recuperarEmail");
const emailError = document.getElementById("recuperarEmailError");
const botonEnviar = document.getElementById("recuperarButton");
const mensajeEnvio = document.getElementById("recuperarMessage");

recuperarForm?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const valor = email.value.trim();
  const error = errorCorreo(valor);

  emailError.textContent = error;
  email.setAttribute("aria-invalid", error ? "true" : "false");

  if (error) {
    email.focus();
    return;
  }

  botonEnviar.disabled = true;
  mensajeEnvio.className = "form-message";
  mensajeEnvio.textContent = "Enviando el enlace…";

  const { error: fallo } = await supabase.auth.resetPasswordForEmail(valor, {
    redirectTo: window.location.origin + "/src/pages/recuperar.html",
  });

  botonEnviar.disabled = false;

  if (fallo) console.error("No se pudo enviar el enlace:", fallo);

  // Mismo mensaje exista o no la cuenta: no se revela quién está registrado.
  mensajeEnvio.className = "form-message exito";
  mensajeEnvio.textContent =
    "Si el correo existe, te enviamos un enlace para restablecer la contraseña. Revisa también la carpeta de spam.";
});

// --- Paso 2: contraseña nueva ----------------------------------------------

const nueva = document.getElementById("nuevaPassword");
const repetir = document.getElementById("repetirPassword");
const nuevaError = document.getElementById("nuevaPasswordError");
const repetirError = document.getElementById("repetirPasswordError");
const botonRestablecer = document.getElementById("restablecerButton");
const mensajeRestablecer = document.getElementById("restablecerMessage");

restablecerForm?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const valor = nueva.value;
  const errorNueva =
    valor.length < 6 ? "La contraseña debe tener al menos 6 caracteres." : "";
  const errorRepetir =
    valor === repetir.value ? "" : "Las contraseñas no coinciden.";

  nuevaError.textContent = errorNueva;
  repetirError.textContent = errorRepetir;

  if (errorNueva) {
    nueva.focus();
    return;
  }

  if (errorRepetir) {
    repetir.focus();
    return;
  }

  botonRestablecer.disabled = true;

  const { error } = await supabase.auth.updateUser({ password: valor });

  botonRestablecer.disabled = false;

  if (error) {
    mensajeRestablecer.className = "form-message error";
    mensajeRestablecer.textContent =
      "No se pudo cambiar la contraseña. Pide un enlace nuevo.";
    return;
  }

  mensajeRestablecer.className = "form-message exito";
  mensajeRestablecer.textContent =
    "Contraseña actualizada. Te llevamos al inicio de sesión…";

  // La sesión de recuperación no sirve para navegar como usuario normal.
  await supabase.auth.signOut();
  setTimeout(() => {
    window.location.href = "/src/pages/login.html";
  }, 1200);
});

// --- Qué paso mostrar -------------------------------------------------------

// El enlace vuelve con la sesión de recuperación ya creada por supabase-js.
// Cualquier sesión abre el paso 2: es la misma operación que "cambiar
// contraseña" estando dentro de la cuenta.
async function resolverPaso() {
  const { data } = await supabase.auth.getSession();

  mostrarPaso(Boolean(data.session));
}

resolverPaso();

supabase.auth.onAuthStateChange((evento) => {
  if (evento === "PASSWORD_RECOVERY") mostrarPaso(true);
  if (evento === "SIGNED_OUT") mostrarPaso(false);
});
