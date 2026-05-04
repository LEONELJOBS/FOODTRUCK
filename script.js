const productos = [
  { id: "salchipapa", nombre: "Salchipapa", grupo: "platos" },
  { id: "pollo", nombre: "Pollo", grupo: "platos" },
  { id: "hamburguesero", nombre: "Hamburguesero", grupo: "platos" },
  { id: "fresco_hervido", nombre: "Fresco hervido", grupo: "frescos" },
  { id: "fresco_personal", nombre: "Fresco personal", grupo: "frescos" },
];

const storageKey = "historialVentasNegocioV1";
const currency = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  minimumFractionDigits: 2,
});

const $ = (selector) => document.querySelector(selector);

function money(value) {
  return currency.format(Number(value || 0)).replace("BOB", "Bs");
}

function numberValue(input) {
  return Number(input.value || 0);
}

function getFechaTrabajo() {
  const ahora = new Date();
  const corte = $("#horaCorte").value || "06:00";
  const [hora, minuto] = corte.split(":").map(Number);
  const fechaCorte = new Date(ahora);
  fechaCorte.setHours(hora, minuto || 0, 0, 0);

  const fechaTrabajo = new Date(ahora);
  if (ahora < fechaCorte) {
    fechaTrabajo.setDate(fechaTrabajo.getDate() - 1);
  }

  return fechaTrabajo;
}

function formatFecha(date) {
  return date.toLocaleDateString("es-BO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fechaClave(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderItems() {
  const template = $("#itemTemplate");
  const platosContainer = $("#platosContainer");
  const frescosContainer = $("#frescosContainer");

  productos.forEach((producto) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".item-card");
    card.dataset.id = producto.id;
    card.dataset.grupo = producto.grupo;
    card.querySelector("h3").textContent = producto.nombre;
    card.querySelector(".precio").id = `${producto.id}_precio`;
    card.querySelector(".cantidad").id = `${producto.id}_cantidad`;

    if (producto.grupo === "platos") {
      platosContainer.appendChild(clone);
    } else {
      frescosContainer.appendChild(clone);
    }
  });
}

function calcular() {
  let totalPlatos = 0;
  let totalFrescos = 0;

  document.querySelectorAll(".item-card").forEach((card) => {
    const precio = numberValue(card.querySelector(".precio"));
    const cantidad = numberValue(card.querySelector(".cantidad"));
    const subtotal = precio * cantidad;
    card.querySelector(".item-total strong").textContent = money(subtotal);

    if (card.dataset.grupo === "platos") totalPlatos += subtotal;
    if (card.dataset.grupo === "frescos") totalFrescos += subtotal;
  });

  const totalQr = numberValue($("#qrLlegado")) + numberValue($("#qrExtra"));
  const totalGeneral = totalPlatos + totalFrescos + totalQr;

  $("#totalPlatos").textContent = money(totalPlatos);
  $("#totalFrescos").textContent = money(totalFrescos);
  $("#totalQr").textContent = money(totalQr);
  $("#totalGeneral").textContent = money(totalGeneral);
  $("#fechaTrabajo").textContent = formatFecha(getFechaTrabajo());

  return { totalPlatos, totalFrescos, totalQr, totalGeneral };
}

function leerDetalle() {
  return productos.map((producto) => {
    const precio = numberValue($(`#${producto.id}_precio`));
    const cantidad = numberValue($(`#${producto.id}_cantidad`));
    return {
      nombre: producto.nombre,
      grupo: producto.grupo,
      precio,
      cantidad,
      subtotal: precio * cantidad,
    };
  });
}

function obtenerHistorial() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch (error) {
    return [];
  }
}

function guardarHistorial(historial) {
  localStorage.setItem(storageKey, JSON.stringify(historial));
}

function guardarRegistro() {
  const fecha = getFechaTrabajo();
  const totales = calcular();
  const historial = obtenerHistorial();
  const registro = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    nombre: $("#nombreRegistro").value.trim() || "Cierre de ventas",
    fechaClave: fechaClave(fecha),
    fechaTexto: formatFecha(fecha),
    guardadoEn: new Date().toLocaleString("es-BO"),
    qrLlegado: numberValue($("#qrLlegado")),
    qrExtra: numberValue($("#qrExtra")),
    detalle: leerDetalle(),
    ...totales,
  };

  historial.unshift(registro);
  guardarHistorial(historial);
  renderHistorial();
}

function limpiarFormulario() {
  document.querySelectorAll("input[type='number']").forEach((input) => {
    input.value = "";
  });
  $("#nombreRegistro").value = "";
  calcular();
}

function borrarHistorial() {
  const seguro = confirm("¿Seguro que quieres borrar todo el historial guardado?");
  if (!seguro) return;
  localStorage.removeItem(storageKey);
  renderHistorial();
}

function renderHistorial() {
  const container = $("#historial");
  const historial = obtenerHistorial();

  if (!historial.length) {
    container.innerHTML = '<div class="history-empty">Todavía no hay registros guardados.</div>';
    return;
  }

  container.innerHTML = historial.map((registro) => {
    const vendidos = registro.detalle
      .filter((item) => item.cantidad > 0 || item.precio > 0)
      .map((item) => `${item.nombre}: ${item.cantidad} × ${money(item.precio)} = ${money(item.subtotal)}`)
      .join(" · ") || "Sin productos registrados";

    return `
      <article class="history-card">
        <div class="history-head">
          <div>
            <h3>${registro.nombre}</h3>
            <small>${registro.fechaTexto} · guardado: ${registro.guardadoEn}</small>
          </div>
          <strong>${money(registro.totalGeneral)}</strong>
        </div>
        <div class="history-row"><span>Total platos</span><strong>${money(registro.totalPlatos)}</strong></div>
        <div class="history-row"><span>Total frescos</span><strong>${money(registro.totalFrescos)}</strong></div>
        <div class="history-row"><span>QR + monto adicional</span><strong>${money(registro.totalQr)}</strong></div>
        <div class="history-details">${vendidos}</div>
      </article>
    `;
  }).join("");
}

function iniciar() {
  renderItems();
  calcular();
  renderHistorial();

  document.addEventListener("input", (event) => {
    if (event.target.matches("input")) calcular();
  });

  $("#guardarBtn").addEventListener("click", guardarRegistro);
  $("#limpiarBtn").addEventListener("click", limpiarFormulario);
  $("#borrarHistorialBtn").addEventListener("click", borrarHistorial);
}

iniciar();
