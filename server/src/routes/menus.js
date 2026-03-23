import { Router } from "express";
import { pool } from "../db.js";

export const menusRouter = Router();

// GET /api/menus
menusRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `
    select
      m.id as menu_id,
      m.name as menu_name,
      m.description as menu_description,
      m.price as menu_price,
      m.image_url as menu_image_url,
      m.stock_quantity as menu_stock_quantity,
      o.id as option_id,
      o.name as option_name,
      o.extra_price as option_extra_price
    from menus m
    left join options o on o.menu_id = m.id
    order by m.id asc, o.id asc
    `,
  );

  const map = new Map();
  for (const r of rows) {
    const mid = Number(r.menu_id);
    if (!map.has(mid)) {
      map.set(mid, {
        id: mid,
        name: r.menu_name,
        description: r.menu_description ?? "",
        price: Number(r.menu_price),
        imageUrl: r.menu_image_url,
        stockQuantity: Number(r.menu_stock_quantity),
        options: [],
      });
    }
    if (r.option_id) {
      map.get(mid).options.push({
        id: Number(r.option_id),
        name: r.option_name,
        extraPrice: Number(r.option_extra_price),
      });
    }
  }

  return res.json([...map.values()]);
});

// PATCH /api/menus/:menuId/stock
menusRouter.patch("/:menuId/stock", async (req, res) => {
  const menuId = Number(req.params.menuId);
  const delta = Number(req.body?.delta);

  if (!Number.isFinite(menuId) || menuId <= 0) {
    return res.status(400).json({ message: "Invalid menuId" });
  }
  if (!Number.isFinite(delta)) {
    return res.status(400).json({ message: "Invalid delta" });
  }

  const { rows } = await pool.query(
    `
    update menus
    set stock_quantity = greatest(stock_quantity + $1::int, 0),
        updated_at = now()
    where id = $2
    returning id, stock_quantity as "stockQuantity"
    `,
    [delta, menuId],
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "Menu not found" });
  }

  const row = rows[0];
  return res.json({
    id: Number(row.id),
    stockQuantity: Number(row.stockQuantity),
  });
});

