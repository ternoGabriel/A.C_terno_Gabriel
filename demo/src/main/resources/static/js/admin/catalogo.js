/* catalogo prendas reales con filtros visibles */
document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const grid = document.querySelector(".product-grid");
    const filtros = TG.catalogoFiltros();
    const buscador = document.querySelector("[data-product-search]");
    const soloVendidos = document.getElementById("soloVendidosAdmin");
    let prendas = [];

    const pintar = () => {
      const q = (buscador?.value || "").toLowerCase().trim();
      const lista = prendas.filter(
        (p) =>
          (soloVendidos?.checked
            ? p.estado === "Vendido"
            : p.estado !== "Vendido") &&
          filtros.pasa(p) &&
          (
            p.diseno +
            " " +
            (p.estilo || "") +
            " " +
            p.codigo +
            " " +
            (p.color || "") +
            " " +
            (p.componente || "")
          )
            .toLowerCase()
            .includes(q),
      );
      grid.innerHTML = lista.length
        ? TG.tarjetasCatalogo(lista)
        : '<p class="aviso-vacio">No hay prendas con esos filtros.</p>';
    };

    try {
      prendas = TG.prendasVisibles(await TG.prendas());
      pintar();
    } catch (err) {
      TG.toast(err.message);
    }

    filtros.onChange(pintar);
    buscador?.addEventListener("input", () => setTimeout(pintar, 0));
    soloVendidos?.addEventListener("change", pintar);

    /* restablecer todos los filtros vuelven a su valor por defecto */
    document
      .getElementById("resetFiltersBtn")
      ?.addEventListener("click", () => {
        filtros.reset();
        if (soloVendidos) soloVendidos.checked = false;
        pintar();
      });

    grid.addEventListener("click", (e) => {
      /* al tocar la foto se abre completa */
      const img = e.target.closest(".product-image img");
      if (img) {
        TG.verImagen(img.currentSrc || img.src, img.alt);
        return;
      }
      /* ver detalle la tarjeta se estira y se vuelve */
      const b = e.target.closest("[data-detalle]");
      if (b) TG.alternarDetalle(b);
    });
  }),
);
