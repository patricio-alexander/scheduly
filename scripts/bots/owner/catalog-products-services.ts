/**
 * Tour Dueña · catálogo: crear/editar productos y servicios (nombres y precios).
 * Crea items de prueba, edita uno existente (y lo restaura), borra los de prueba.
 */
import { nowStamp } from "../../lib/menu-ui";
import {
  asArray,
  c,
  deleteJson,
  finishOwnerTour,
  getJson,
  loginAsOwner,
  logoutOwner,
  money,
  msgOf,
  printOwnerHeader,
  printScene,
  postJson,
  putJson,
  type StoryScene,
} from "./shared";

type ProductRow = {
  id?: number;
  name?: string;
  price?: number;
  stock?: number;
  categoryId?: number | null;
};

type ServiceRow = {
  id?: number;
  name?: string;
  price?: number;
  durationMinutes?: number;
  commissionPct?: number;
};

export async function runOwnerCatalogTour() {
  printOwnerHeader("Loja · productos y servicios");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "catalog-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 14;
  const { baseUrl, cookie } = session;
  const stamp = nowStamp().replace(/[: ]/g, "").slice(-6);

  // ── Productos ──
  const productsRes = await getJson(`${baseUrl}/api/products`, cookie);
  const products = asArray(productsRes.body) as ProductRow[];
  scenes.push({
    id: "products-list",
    title: "Lista productos",
    ok: productsRes.ok,
    lines: productsRes.ok
      ? [
          `Catálogo: ${c.bold}${products.length}${c.reset} producto(s)`,
          products[0]
            ? `Ej: ${products[0].name} · ${money(products[0].price)}`
            : `Sin productos aún`,
        ]
      : [`HTTP ${productsRes.status} ${msgOf(productsRes.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const createProduct = await postJson(
    `${baseUrl}/api/products`,
    {
      name: `Producto Tour ${stamp}`,
      price: 12.5,
      stock: 10,
    },
    cookie,
  );
  const createdProduct = (createProduct.body ?? {}) as ProductRow;
  scenes.push({
    id: "products-create",
    title: "Crea un producto",
    ok: createProduct.ok && Boolean(createdProduct.id),
    lines: createProduct.ok
      ? [
          `Creado: «${createdProduct.name}»`,
          `Precio: ${money(createdProduct.price)} · stock: ${createdProduct.stock}`,
          `id=${createdProduct.id}`,
        ]
      : [`HTTP ${createProduct.status} ${msgOf(createProduct.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (createProduct.ok && createdProduct.id) {
    const editCreated = await putJson(
      `${baseUrl}/api/products/${createdProduct.id}`,
      {
        name: `Producto Tour ${stamp} · editado`,
        price: 15.75,
        stock: Number(createdProduct.stock ?? 10),
        categoryId: createdProduct.categoryId ?? null,
      },
      cookie,
    );
    const edited = (editCreated.body ?? {}) as ProductRow;
    scenes.push({
      id: "products-edit-created",
      title: "Edita nombre y precio del producto nuevo",
      ok:
        editCreated.ok &&
        String(edited.name ?? "").includes("editado") &&
        Number(edited.price) === 15.75,
      lines: editCreated.ok
        ? [
            `Nombre → ${edited.name}`,
            `Precio → ${money(edited.price)}`,
          ]
        : [`HTTP ${editCreated.status} ${msgOf(editCreated.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // Editar uno existente (si hay) y restaurar
  const existingProduct = products.find((p) => p.id && p.id !== createdProduct.id);
  if (existingProduct?.id) {
    const original = {
      name: existingProduct.name ?? "Producto",
      price: Number(existingProduct.price ?? 0),
      stock: Number(existingProduct.stock ?? 0),
      categoryId: existingProduct.categoryId ?? null,
    };
    const tourPrice = Math.round((original.price + 1.11) * 100) / 100;
    const put = await putJson(
      `${baseUrl}/api/products/${existingProduct.id}`,
      {
        name: `${original.name} · Tour`,
        price: tourPrice,
        stock: original.stock,
        categoryId: original.categoryId,
      },
      cookie,
    );
    const mid = (put.body ?? {}) as ProductRow;
    scenes.push({
      id: "products-edit-existing",
      title: "Cambia nombre/precio de un producto existente",
      ok: put.ok && String(mid.name ?? "").includes("Tour"),
      lines: put.ok
        ? [
            `«${original.name}» → «${mid.name}»`,
            `${money(original.price)} → ${money(mid.price)}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

    const restore = await putJson(
      `${baseUrl}/api/products/${existingProduct.id}`,
      original,
      cookie,
    );
    const restored = (restore.body ?? {}) as ProductRow;
    scenes.push({
      id: "products-restore",
      title: "Restaura el producto existente",
      ok: restore.ok && restored.name === original.name,
      lines: restore.ok
        ? [
            `Nombre: ${restored.name}`,
            `Precio: ${money(restored.price)}`,
            `${c.green}Producto existente restaurado${c.reset}`,
          ]
        : [`HTTP ${restore.status} ${msgOf(restore.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  if (createdProduct.id) {
    const del = await deleteJson(
      `${baseUrl}/api/products/${createdProduct.id}`,
      cookie,
    );
    scenes.push({
      id: "products-delete",
      title: "Elimina el producto de prueba",
      ok: del.ok,
      lines: del.ok
        ? [`Producto tour ${createdProduct.id} eliminado`]
        : [`HTTP ${del.status} ${msgOf(del.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // ── Servicios ──
  const servicesRes = await getJson(`${baseUrl}/api/services`, cookie);
  const services = asArray(servicesRes.body) as ServiceRow[];
  scenes.push({
    id: "services-list",
    title: "Lista servicios",
    ok: servicesRes.ok,
    lines: servicesRes.ok
      ? [
          `Carta: ${c.bold}${services.length}${c.reset} servicio(s)`,
          services[0]
            ? `Ej: ${services[0].name} · ${money(services[0].price)}`
            : `Sin servicios aún`,
        ]
      : [`HTTP ${servicesRes.status} ${msgOf(servicesRes.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const createService = await postJson(
    `${baseUrl}/api/services`,
    {
      name: `Servicio Tour ${stamp}`,
      price: 18,
      durationMinutes: 40,
      commissionPct: 35,
    },
    cookie,
  );
  const createdService = (createService.body ?? {}) as ServiceRow;
  scenes.push({
    id: "services-create",
    title: "Crea un servicio",
    ok: createService.ok && Boolean(createdService.id),
    lines: createService.ok
      ? [
          `Creado: «${createdService.name}»`,
          `Precio: ${money(createdService.price)} · ${createdService.durationMinutes} min`,
          `id=${createdService.id}`,
        ]
      : [`HTTP ${createService.status} ${msgOf(createService.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (createService.ok && createdService.id) {
    const editCreated = await putJson(
      `${baseUrl}/api/services/${createdService.id}`,
      {
        name: `Servicio Tour ${stamp} · editado`,
        price: 22.5,
        durationMinutes: Number(createdService.durationMinutes ?? 40),
        commissionPct: Number(createdService.commissionPct ?? 35),
      },
      cookie,
    );
    const edited = (editCreated.body ?? {}) as ServiceRow;
    scenes.push({
      id: "services-edit-created",
      title: "Edita nombre y precio del servicio nuevo",
      ok:
        editCreated.ok &&
        String(edited.name ?? "").includes("editado") &&
        Number(edited.price) === 22.5,
      lines: editCreated.ok
        ? [
            `Nombre → ${edited.name}`,
            `Precio → ${money(edited.price)}`,
          ]
        : [`HTTP ${editCreated.status} ${msgOf(editCreated.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  const existingService = services.find((s) => s.id && s.id !== createdService.id);
  if (existingService?.id) {
    const original = {
      name: existingService.name ?? "Servicio",
      price: Number(existingService.price ?? 0),
      durationMinutes: Number(existingService.durationMinutes ?? 30),
      commissionPct: Number(existingService.commissionPct ?? 15),
    };
    const tourPrice = Math.round((original.price + 2.5) * 100) / 100;
    const put = await putJson(
      `${baseUrl}/api/services/${existingService.id}`,
      {
        name: `${original.name} · Tour`,
        price: tourPrice,
        durationMinutes: original.durationMinutes,
        commissionPct: original.commissionPct,
      },
      cookie,
    );
    const mid = (put.body ?? {}) as ServiceRow;
    scenes.push({
      id: "services-edit-existing",
      title: "Cambia nombre/precio de un servicio existente",
      ok: put.ok && String(mid.name ?? "").includes("Tour"),
      lines: put.ok
        ? [
            `«${original.name}» → «${mid.name}»`,
            `${money(original.price)} → ${money(mid.price)}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

    const restore = await putJson(
      `${baseUrl}/api/services/${existingService.id}`,
      original,
      cookie,
    );
    const restored = (restore.body ?? {}) as ServiceRow;
    scenes.push({
      id: "services-restore",
      title: "Restaura el servicio existente",
      ok: restore.ok && restored.name === original.name,
      lines: restore.ok
        ? [
            `Nombre: ${restored.name}`,
            `Precio: ${money(restored.price)}`,
            `${c.green}Servicio existente restaurado${c.reset}`,
          ]
        : [`HTTP ${restore.status} ${msgOf(restore.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  if (createdService.id) {
    const del = await deleteJson(
      `${baseUrl}/api/services/${createdService.id}`,
      cookie,
    );
    scenes.push({
      id: "services-delete",
      title: "Elimina el servicio de prueba",
      ok: del.ok,
      lines: del.ok
        ? [`Servicio tour ${createdService.id} eliminado`]
        : [`HTTP ${del.status} ${msgOf(del.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("catalog", scenes, baseUrl, session.started);
}
