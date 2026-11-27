import { supabase } from "./supabase.js";
import { poblarRegiones, regiones } from "./regiones.js";
import { errorCorreo, errorRut } from "./validaciones.js";

// El formulario de registro de cada página es este mismo, con o sin navbar.
function prepararRegiones() {
  const region = document.getElementById("region");
  const comuna = document.getElementById("comuna");

  // Ya poblado por una apertura anterior.
  if (region && region.options.length > 1) return;

  poblarRegiones(region, comuna);
}

prepararRegiones();

// El modal del navbar lo monta React: sus selects recién existen al abrirlo.
document.addEventListener(
  "toggle",
  (evento) => {
    if (evento.target.id === "authModalRegistro" && evento.target.open) {
      prepararRegiones();
    }
  },
  true,
);

console.log(" Script registro.js cargado correctamente");

// Correo del alta que quedó esperando confirmación. El formulario se limpia
// tras el alta, así que el reenvío no puede leerlo de vuelta del input.
let correoPendiente = "";

// Los formularios del navbar los monta React después de este módulo, así que
// se escucha en el documento y se filtra por id en vez de buscarlo al cargar.
document.addEventListener("submit", async function (event) {
  if (!event.target || event.target.id !== "registroForm") return;

  const registroForm = event.target;

  event.preventDefault();
  console.log(" Evento Submit disparado en el formulario de registro");

  const rut = document.getElementById("rut").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fechaNacimiento = document.getElementById("fechaNacimiento").value;
  const region = document.getElementById("region").value;
  const comuna = document.getElementById("comuna").value;
  const direccion = document.getElementById("direccion").value.trim();
  const terminos = document.getElementById("aceptaTerminos");

  const rutError = document.getElementById("rutError");
  const nombreError = document.getElementById("nombreError");
  const apellidosError = document.getElementById("apellidosError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const regionError = document.getElementById("regionError");
  const comunaError = document.getElementById("comunaError");
  const direccionError = document.getElementById("direccionError");
  const terminosError = document.getElementById("terminosError");
  const registroMessage = document.getElementById("registroMessage");
  const registroButton = document.getElementById("registroButton");

  // Limpiar mensajes
  if (rutError) rutError.textContent = "";
  if (nombreError) nombreError.textContent = "";
  if (apellidosError) apellidosError.textContent = "";
  if (emailError) emailError.textContent = "";
  if (passwordError) passwordError.textContent = "";
  if (regionError) regionError.textContent = "";
  if (comunaError) comunaError.textContent = "";
  if (direccionError) direccionError.textContent = "";
  if (terminosError) terminosError.textContent = "";
  if (registroMessage) registroMessage.textContent = "";

  let valido = true;

  const msgRut = errorRut(rut);
  if (msgRut) {
    if (rutError) rutError.textContent = msgRut;
    valido = false;
  }

  if (nombre === "") {
    if (nombreError) nombreError.textContent = "El nombre es obligatorio.";
    valido = false;
  }

  if (apellidos === "") {
    if (apellidosError)
      apellidosError.textContent = "Los apellidos son obligatorios.";
    valido = false;
  }

  const msgCorreo = errorCorreo(email);
  if (msgCorreo) {
    if (emailError) emailError.textContent = msgCorreo;
    valido = false;
  }

  if (password === "") {
    if (passwordError)
      passwordError.textContent = "La contraseña es obligatoria.";
    valido = false;
  } else if (password.length < 6) {
    if (passwordError)
      passwordError.textContent =
        "La contraseña debe tener al menos 6 caracteres.";
    valido = false;
  }

  if (region === "") {
    if (regionError)
      regionError.textContent = "Debes seleccionar una región.";
    valido = false;
  }

  if (comuna === "") {
    if (comunaError)
      comunaError.textContent = "Debes seleccionar una comuna.";
    valido = false;
  }

  if (direccion === "") {
    if (direccionError)
      direccionError.textContent = "La dirección es obligatoria.";
    valido = false;
  }

  if (terminos && !terminos.checked) {
    if (terminosError)
      terminosError.textContent =
        "Debes aceptar los términos y la política de privacidad.";
    terminos.setAttribute("aria-invalid", "true");
    valido = false;
  } else if (terminos) {
    terminos.removeAttribute("aria-invalid");
  }

  if (!valido) {
    console.warn(" Formulario inválido, revisa los campos en rojo");

    // El foco va al primer campo con error, casilla de términos incluida.
    const primerError = registroForm.querySelector(
      ".error-message:not(:empty)",
    );

    primerError?.parentElement?.querySelector("input, select")?.focus();
    return;
  }

  if (registroButton) {
    registroButton.disabled = true;
    registroButton.textContent = "Creando cuenta...";
  }

  try {
    const nombreRegion = regiones[region]?.nombre || region;

    // Un solo llamado a Supabase Auth. El Trigger se encarga de poblar la tabla `public.usuarios` automáticamente.
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // El enlace de confirmación deja la sesión creada en el home: el
        // usuario entra ya logueado, sin pasar por el formulario de login.
        emailRedirectTo: `${window.location.origin}/index.html`,
        data: {
          rut: rut,
          nombre: nombre,
          apellidos: apellidos,
          fecha_nacimiento: fechaNacimiento || null,
          region: nombreRegion,
          comuna: comuna,
          direccion: direccion,
        },
      },
    });

    if (error) {
      console.error("Error devuelto por Supabase Auth:", error);

      // Supabase Auth conoce las cuentas de auth.users; la tabla public.usuarios
      // no participa en esta comprobación.
      const yaExiste =
        error.code === "user_already_exists" ||
        /already registered/i.test(error.message);

      if (registroMessage) {
        registroMessage.textContent = yaExiste
          ? "Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña."
          : "Error: " + error.message;
      }
      return;
    }

    console.log("Usuario registrado con éxito en Auth:", data);

    // Con la confirmación por correo apagada en el panel de Supabase, el
    // alta ya devuelve sesión: no hay correo que esperar y el modal sobra.
    const conSesion = Boolean(data.session);

    if (registroMessage) {
      registroMessage.textContent = conSesion
        ? "Cuenta creada. Entrando a la tienda…"
        : "Cuenta creada correctamente. Revisa tu correo para confirmarla.";
    }

    // Con la sesión ya creada no hay nada que esperar: el alta deja al usuario
    // dentro y se va al home, no a una pantalla intermedia con un mensaje.
    if (conSesion) {
      registroForm.closest("dialog")?.close();
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 700);
      return;
    }

    registroForm.reset();
    correoPendiente = email;
    if (terminos) terminos.removeAttribute("aria-invalid");
  } catch (err) {
    console.error("Error inesperado en la ejecución del submit:", err);
    if (registroMessage) {
      registroMessage.textContent =
        "Ocurrió un error inesperado al procesar el registro.";
    }
  } finally {
    if (registroButton) {
      registroButton.disabled = false;
      registroButton.textContent = "Crear cuenta";
    }
  }
});

// --- Reenviar el correo de confirmación -------------------------------------
// El botón vive en el mismo formulario que el submit (página y modal), así que
// también se escucha en el documento.
document.addEventListener("click", async function (event) {
  const boton = event.target?.closest?.("#reenviarCorreo");
  if (!boton) return;

  const registroMessage = document.getElementById("registroMessage");
  const emailInput = document.getElementById("email");

  // Con sesión, el correo a verificar es el de la cuenta. Sin sesión (la
  // confirmación está activa y el alta no la crea), el escrito en el formulario.
  const { data } = await supabase.auth.getSession();
  const email = (
    data?.session?.user?.email ||
    correoPendiente ||
    emailInput?.value ||
    ""
  ).trim();

  if (!email) {
    if (registroMessage) {
      registroMessage.className = "form-message error";
      registroMessage.textContent =
        "Escribe tu correo para reenviar la confirmación.";
    }
    emailInput?.focus();
    return;
  }

  boton.disabled = true;
  if (registroMessage) {
    registroMessage.className = "form-message";
    registroMessage.textContent = "Enviando el correo de confirmación…";
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/index.html`,
    },
  });

  boton.disabled = false;

  if (error) {
    console.error("No se pudo reenviar el correo:", error);
    if (registroMessage) {
      registroMessage.className = "form-message error";
      registroMessage.textContent =
        "No se pudo reenviar el correo. Inténtalo de nuevo en unos minutos.";
    }
    return;
  }

  if (registroMessage) {
    registroMessage.className = "form-message exito";
    registroMessage.textContent = `Te enviamos otro correo de confirmación a ${email}. Revisa también la carpeta de spam.`;
  }
});
