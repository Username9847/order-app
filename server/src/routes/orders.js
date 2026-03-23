import { Router } from "express";
import { pool } from "../db.js";

export const ordersRouter = Router();

function isValidNextStatus(current, next) {
  const allowed = {
    RECEIVED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: [],
  };
  return (allowed[current] ?? []).includes(next);
}

async function rollbackQuiet(client) {
  try {
    await client.query("rollback");
  } catch {
    // ignore (already rolled back or connection issue)
  }
}

// POST /api/orders
ordersRouter.post("/", async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Lock menus rows and validate stock
    const menuIds = [...new Set(items.map((i) => Number(i.menuId)))].filter(
      (n) => Number.isFinite(n) && n > 0,
    );
    if (menuIds.length === 0) {
      await rollbackQuiet(client);
      return res.status(400).json({ message: "Invalid menuId(s)" });
    }

    const menusRes = await client.query(
      `
      select id, name, price, stock_quantity
      from menus
      where id = any($1::bigint[])
      for update
      `,
      [menuIds],
    );
    const menusById = new Map(
      menusRes.rows.map((m) => [Number(m.id), { ...m, id: Number(m.id) }]),
    );
    if (menusById.size !== menuIds.length) {
      await rollbackQuiet(client);
      return res.status(400).json({ message: "Unknown menuId exists" });
    }

    // Preload all referenced options (and validate they belong to the menu)
    const optionIds = [
      ...new Set(
        items.flatMap((i) =>
          Array.isArray(i.optionIds) ? i.optionIds.map((x) => Number(x)) : [],
        ),
      ),
    ].filter((n) => Number.isFinite(n) && n > 0);

    const optionsById = new Map();
    if (optionIds.length > 0) {
      const optsRes = await client.query(
        `
        select id, menu_id, name, extra_price
        from options
        where id = any($1::bigint[])
        `,
        [optionIds],
      );
      for (const o of optsRes.rows) {
        optionsById.set(Number(o.id), {
          ...o,
          id: Number(o.id),
          menu_id: Number(o.menu_id),
        });
      }
      if (optionsById.size !== optionIds.length) {
        await rollbackQuiet(client);
        return res.status(400).json({ message: "Unknown optionId exists" });
      }
    }

    let totalAmount = 0;
    const computed = [];

    for (const raw of items) {
      const menuId = Number(raw.menuId);
      const quantity = Number(raw.quantity);
      const optIds = Array.isArray(raw.optionIds)
        ? raw.optionIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        : [];

      if (!Number.isFinite(menuId) || menuId <= 0) {
        await rollbackQuiet(client);
        return res.status(400).json({ message: "Invalid menuId" });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        await rollbackQuiet(client);
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const menu = menusById.get(menuId);
      if (menu.stock_quantity < quantity) {
        await rollbackQuiet(client);
        return res.status(409).json({
          message: "Insufficient stock",
          menuId,
          stockQuantity: menu.stock_quantity,
          requested: quantity,
        });
      }

      let extra = 0;
      const resolvedOptions = [];
      for (const oid of optIds) {
        const o = optionsById.get(oid);
        if (!o || o.menu_id !== menuId) {
          await rollbackQuiet(client);
          return res.status(400).json({ message: "Option does not belong to menu", menuId, optionId: oid });
        }
        extra += o.extra_price;
        resolvedOptions.push(o);
      }

      const unitPrice = menu.price + extra;
      const lineTotal = unitPrice * quantity;
      totalAmount += lineTotal;
      computed.push({
        menu,
        quantity,
        unitPrice,
        lineTotal,
        options: resolvedOptions,
      });
    }

    const orderRes = await client.query(
      `insert into orders (status, total_amount) values ('RECEIVED', $1) returning id, created_at, status, total_amount`,
      [totalAmount],
    );
    const order = orderRes.rows[0];

    for (const item of computed) {
      const itemRes = await client.query(
        `
        insert into order_items
          (order_id, menu_id, menu_name_snapshot, unit_price, quantity, line_total)
        values
          ($1, $2, $3, $4, $5, $6)
        returning id
        `,
        [
          order.id,
          item.menu.id,
          item.menu.name,
          item.unitPrice,
          item.quantity,
          item.lineTotal,
        ],
      );
      const orderItemId = itemRes.rows[0].id;

      for (const opt of item.options) {
        await client.query(
          `
          insert into order_item_options
            (order_item_id, option_id, option_name_snapshot, extra_price)
          values ($1, $2, $3, $4)
          `,
          [orderItemId, opt.id, opt.name, opt.extra_price],
        );
      }

      await client.query(
        `update menus set stock_quantity = stock_quantity - $1, updated_at = now() where id = $2`,
        [item.quantity, item.menu.id],
      );
    }

    await client.query("commit");

    return res.status(201).json({
      orderId: order.id,
      status: order.status,
      createdAt: order.created_at,
      totalAmount: order.total_amount,
    });
  } catch (e) {
    await client.query("rollback");
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Server error",
    });
  } finally {
    client.release();
  }
});

// GET /api/orders
ordersRouter.get("/", async (req, res) => {
  const statusParam = typeof req.query.status === "string" ? req.query.status : "";
  const statuses = statusParam
    ? statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const { rows } = await pool.query(
    `
    select
      o.id,
      o.created_at,
      o.status,
      o.total_amount,
      coalesce(string_agg(oi.menu_name_snapshot || ' X ' || oi.quantity, ', ' order by oi.id), '') as items_summary
    from orders o
    left join order_items oi on oi.order_id = o.id
    where ($1::text[] is null) or (o.status = any($1::text[]))
    group by o.id
    order by o.created_at desc
    limit 100
    `,
    [statuses.length ? statuses : null],
  );

  return res.json(
    rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      totalAmount: r.total_amount,
      itemsSummary: r.items_summary,
    })),
  );
});

// GET /api/orders/:orderId
ordersRouter.get("/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid orderId" });
  }

  const orderRes = await pool.query(
    `select id, created_at, status, total_amount from orders where id = $1`,
    [orderId],
  );
  if (orderRes.rows.length === 0) {
    return res.status(404).json({ message: "Order not found" });
  }

  const itemsRes = await pool.query(
    `
    select
      oi.id as order_item_id,
      oi.menu_name_snapshot,
      oi.quantity,
      oi.unit_price,
      oi.line_total,
      oio.option_name_snapshot,
      oio.extra_price
    from order_items oi
    left join order_item_options oio on oio.order_item_id = oi.id
    where oi.order_id = $1
    order by oi.id asc, oio.id asc
    `,
    [orderId],
  );

  const itemsMap = new Map();
  for (const r of itemsRes.rows) {
    if (!itemsMap.has(r.order_item_id)) {
      itemsMap.set(r.order_item_id, {
        menuName: r.menu_name_snapshot,
        quantity: r.quantity,
        unitPrice: r.unit_price,
        lineTotal: r.line_total,
        options: [],
      });
    }
    if (r.option_name_snapshot) {
      itemsMap.get(r.order_item_id).options.push(r.option_name_snapshot);
    }
  }

  const order = orderRes.rows[0];
  return res.json({
    id: order.id,
    createdAt: order.created_at,
    status: order.status,
    totalAmount: order.total_amount,
    items: [...itemsMap.values()],
  });
});

// PATCH /api/orders/:orderId/status
ordersRouter.patch("/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const nextStatus = req.body?.status;
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid orderId" });
  }
  if (!nextStatus || typeof nextStatus !== "string") {
    return res.status(400).json({ message: "status is required" });
  }

  const curRes = await pool.query(`select status from orders where id = $1`, [orderId]);
  if (curRes.rows.length === 0) {
    return res.status(404).json({ message: "Order not found" });
  }
  const current = curRes.rows[0].status;
  if (!isValidNextStatus(current, nextStatus)) {
    return res.status(400).json({ message: "Invalid status transition", current, next: nextStatus });
  }

  const updRes = await pool.query(
    `update orders set status = $1 where id = $2 returning id, created_at, status, total_amount`,
    [nextStatus, orderId],
  );

  const o = updRes.rows[0];
  return res.json({
    id: o.id,
    createdAt: o.created_at,
    status: o.status,
    totalAmount: o.total_amount,
  });
});

