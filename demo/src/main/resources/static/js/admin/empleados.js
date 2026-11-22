document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const tbody = document.querySelector(".data-table tbody");
    const contador = document.getElementById("contadorEmpleados");
    const buscador = document.getElementById("buscadorCodigo");
    const filtroEstado = document.getElementById("filtroEstado");
    const msg = document.getElementById("msgBusqueda");
    const pestanas = [...document.querySelectorAll("[data-pestana]")];
    let empleados = [],
      pestana = "empleados";

    buscador.addEventListener("input", () => {
      buscador.value = TG.reglas.codigoEmpleado.filtro(buscador.value);
      pintarTabla();
    });

    const cargar = async () => {
      empleados = await TG.get("/api/empleados");
      pintarTabla();
    };

    /* en la columna nombre se muestran nombre y apellido juntos */
    const completo = (e) => ((e.nombre || "") + " " + (e.apellido || "")).trim();
    const badgeRol = (r) =>
      '<span class="badge badge-role ' +
      (r === "Administrador" ? "role-admin" : "role-empleado") +
      '"><span class="dot"></span>' +
      TG.esc(r) +
      "</span>";

    const badgeEstado = (e) =>
      e === "Suspendido"
        ? TG.insigniaEstado("Suspendido")
        : '<span class="badge badge-status ' +
        (e === "Activo" ? "status-activo" : "status-inactivo") +
        '"><span class="dot"></span>' +
        TG.esc(e) +
        "</span>";

    const fila = (e) => {
      const sus = e.estado === "Suspendido";
      const editar =
        '<button class="btn-mini" type="button" data-editar="' +
        e.id +
        '">✎ Editar</button>';
      const acciones = sus
        ? '<div class="acciones-fila">' +
        editar +
        '<button class="btn-mini ok" type="button" data-reactivar="' +
        e.id +
        '">↺ Restablecer</button></div>'
        : '<div class="acciones-fila">' +
        editar +
        '<button class="btn-mini danger" type="button" data-suspender="' +
        e.id +
        '">⏸ Suspender</button>' +
        '<button class="btn-mini" type="button" data-clave="' +
        e.id +
        '">🔑 Restablecer contraseña</button></div>';
      return (
        '<tr data-id="' +
        e.id +
        '"><td class="col-name"><strong>' +
        TG.esc(e.codigo || "—") +
        '</strong></td><td class="col-name">' +
        TG.esc(completo(e)) +
        "</td><td>" +
        TG.esc(e.correo || "—") +
        "</td><td>" +
        TG.esc(
          e.telefono
            ? e.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
            : "—",
        ) +
        "</td><td>" +
        TG.esc(e.area || "—") +
        "</td><td>" +
        badgeRol(e.rol) +
        "</td><td>" +
        badgeEstado(e.estado) +
        '</td><td class="col-date">' +
        TG.fecha(e.desde) +
        "</td><td>" +
        acciones +
        "</td></tr>"
      );
    };

    function pintarTabla() {
      const sus = pestana === "suspendidos";
      const grupo = empleados.filter(
        (e) => (e.estado === "Suspendido") === sus,
      );
      contador.textContent = sus
        ? grupo.length + " suspendidos"
        : grupo.length +
        (grupo.length === 1 ? " empleado" : " empleados") +
        " con acceso al sistema";
      filtroEstado.style.display = sus ? "none" : "";

      let lista = grupo,
        aviso = "";
      const q = buscador.value;
      if (q.length === 4 && TG.reglas.codigoEmpleado.ok(q)) {
        const encontrado = empleados.find((x) => x.codigo === q);
        if (!encontrado) aviso = "Código no existe";
        else if (!sus && encontrado.estado === "Suspendido")
          aviso = "El empleado se encuentra suspendido";
        else if (sus && encontrado.estado !== "Suspendido")
          aviso = "El empleado no está suspendido";
        lista = aviso ? [] : [encontrado];
      } else if (!sus && filtroEstado.value !== "Todos") {
        lista = grupo.filter((x) => x.estado === filtroEstado.value);
      }
      msg.style.display = aviso ? "block" : "none";
      msg.textContent = aviso;
      tbody.innerHTML = lista.length
        ? lista
          .slice()
          .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""))
          .map(fila)
          .join("")
        : '<tr><td colspan="9" class="aviso-vacio">' +
        (aviso
          ? ""
          : sus
            ? "No hay empleados suspendidos."
            : "No hay empleados para mostrar.") +
        "</td></tr>";
    }

    pestanas.forEach((b) =>
      b.addEventListener("click", () => {
        pestanas.forEach((x) => x.classList.toggle("active", x === b));
        pestana = b.dataset.pestana;
        buscador.value = "";
        pintarTabla();
      }),
    );
    filtroEstado.addEventListener("change", pintarTabla);

    tbody.addEventListener("click", async (e) => {
      const bEd = e.target.closest("[data-editar]"),
        bSu = e.target.closest("[data-suspender]"),
        bRe = e.target.closest("[data-reactivar]"),
        bCl = e.target.closest("[data-clave]");
      try {
        if (bEd) {
          abrirEdicion(empleados.find((x) => x.id === Number(bEd.dataset.editar)));
          return;
        }
        if (bSu) {
          const emp = empleados.find(
            (x) => x.id === Number(bSu.dataset.suspender),
          );
          const yo = TG.usuario();
          if (yo && emp.nombre === yo.nombre) {
            TG.toast("No puedes suspender tu propia cuenta");
            return;
          }
          /* ventana de confirmacion en vez de la alerta del navegador */
          TG.confirmar({
            titulo: "Suspender empleado",
            mensaje:
              "¿Suspender a " +
              completo(emp) +
              "? Ya no podrá ingresar al sistema.",
            textoOk: "Suspender",
            textoCancelar: "Cancelar",
            onOk: async () => {
              try {
                await TG.put("/api/empleados/suspender/" + emp.id);
                TG.toast("Empleado suspendido");
                await cargar();
              } catch (err) {
                TG.toast(err.message);
              }
            },
          });
          return;
        }
        if (bRe) {
          await TG.put("/api/empleados/reactivar/" + bRe.dataset.reactivar);
          TG.toast("Empleado restablecido");
          await cargar();
        }
        if (bCl) {
          /* sin contrasena temporal se abre directo el formulario */
          const emp = empleados.find((x) => x.id === Number(bCl.dataset.clave));
          TG.modal({
            titulo: "Nueva contraseña",
            subtitulo:
              "Escribe la contraseña nueva de " +
              completo(emp) +
              ". Más de 8 caracteres, con mayúsculas, minúsculas y números; sin palabras fáciles como admin, clave o 1234.",
            textoOk: "Guardar contraseña",
            campos: [
              {
                name: "contrasena",
                label: "Contraseña nueva",
                type: "password",
                placeholder: "Ej. Luna7Cafe42",
                regla: "contrasenaSegura",
                autocomplete: false,
              },
            ],
            onOk: async (v) => {
              await TG.put("/api/empleados/contrasena/" + emp.id, {
                contrasena: v.contrasena,
              });
              TG.toast("Contraseña actualizada");
            },
          });
        }
      } catch (err) {
        TG.toast(err.message);
      }
    });

    /* campos del formulario el codigo el estado y la fecha */
    const camposEmpleado = (e) => {
      const ed = !!e;
      /* limpiaralclic al editar cada campo conserva su valor */
      const base = (c) => (ed ? { ...c, limpiarAlClic: true } : c);
      return [
        base({
          name: "nombre",
          label: "Nombre",
          placeholder: "Ej. Luis Alberto",
          regla: "nombre",
          value: ed ? e.nombre : undefined,
        }),
        base({
          name: "apellido",
          label: "Apellido",
          placeholder: "Ej. Salazar Ortiz",
          regla: "nombre",
          value: ed ? e.apellido || "" : undefined,
        }),
        base({
          name: "correo",
          label: "Correo electrónico (con él ingresa al sistema)",
          placeholder: "Ej. nombre@gmail.com",
          regla: "correoAcceso",
          value: ed ? e.correo : undefined,
        }),
        /* la contrasena solo se escribe al crear */
        ...(ed
          ? []
          : [
              {
                name: "contrasena",
                label:
                  "Contraseña (más de 8 caracteres, con mayúsculas, minúsculas y números)",
                placeholder: "Ej. Luna7Cafe42",
                regla: "contrasenaSegura",
              },
            ]),
        base({
          name: "telefono",
          label: "Teléfono",
          placeholder: "Ej. 987654321",
          regla: "celular",
          value: ed ? e.telefono : undefined,
        }),
        base({
          name: "area",
          label: "Área o puesto de trabajo",
          placeholder: "Ej. Ventas",
          regla: "area",
          value: ed ? e.area : undefined,
        }),
        {
          name: "rol",
          label: "Rol",
          options: ["Empleado", "Administrador"],
          value: ed ? e.rol : "Empleado",
        },
      ];
    };

    function abrirEdicion(emp) {
      if (!emp) return;
      TG.modal({
        titulo: "Editar empleado " + (emp.codigo || ""),
        subtitulo:
          "Haz clic en un campo para escribir un dato nuevo; los que no toques se quedan igual. Todos son obligatorios.",
        textoOk: "Guardar cambios",
        campos: camposEmpleado(emp),
        onOk: async (v) => {
          const datos = {
            nombre: v.nombre,
            apellido: v.apellido,
            usuario: v.correo.toLowerCase(),
            correo: v.correo.toLowerCase(),
            telefono: v.telefono,
            area: v.area,
            rol: v.rol,
          };
          await TG.put("/api/empleados/actualizar/" + emp.id, datos);
          TG.toast("Empleado actualizado");
          await cargar();
        },
      });
    }

    document
      .getElementById("btnAgregarEmpleado")
      .addEventListener("click", () => {
        TG.modal({
          titulo: "Agregar empleado",
          subtitulo: "El código se genera automáticamente.",
          textoOk: "Guardar empleado",
          campos: camposEmpleado(null),
          onOk: async (v) => {
            await TG.post("/api/empleados/nuevo", {
              ...v,
              correo: v.correo.toLowerCase(),
              usuario: v.correo.toLowerCase(),
              estado: "Activo",
            });
            TG.toast("Empleado agregado");
            await cargar();
          },
        });
      });

    try {
      await cargar();
    } catch (err) {
      TG.toast(err.message);
    }
  }),
);