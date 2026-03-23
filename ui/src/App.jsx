import "./App.css";
import React from "react";

function getApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  return "";
}

async function api(path, options) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      /failed to fetch|networkerror|load failed|연결|aborted/i.test(msg) ||
      err instanceof TypeError
    ) {
      throw new Error(
        "백엔드에 연결할 수 없습니다. server 폴더에서 npm run dev 를 실행했는지, 포트(기본 3000)가 맞는지 확인하세요.",
      );
    }
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
}

function formatKRW(amount) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function optionsKey(selectedOptionIds) {
  return [...selectedOptionIds].sort().join(",");
}

function summarizeOptions(menu, selectedOptionIds) {
  if (!selectedOptionIds || selectedOptionIds.length === 0) return "";
  const byId = new Map(menu.options.map((o) => [o.id, o]));
  const labels = [...selectedOptionIds]
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((o) => o.name);
  return labels.join(", ");
}

function App() {
  const [activeTab, setActiveTab] = React.useState("order"); // 'order' | 'admin'
  const [menus, setMenus] = React.useState([]);
  const [cartItems, setCartItems] = React.useState([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false);
  const [orders, setOrders] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [isLoadingMenus, setIsLoadingMenus] = React.useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  async function refreshMenus() {
    setIsLoadingMenus(true);
    try {
      const data = await api("/api/menus");
      setMenus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "메뉴를 불러오지 못했습니다.");
    } finally {
      setIsLoadingMenus(false);
    }
  }

  async function refreshOrders() {
    setIsLoadingOrders(true);
    try {
      const data = await api("/api/orders");
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문을 불러오지 못했습니다.");
    } finally {
      setIsLoadingOrders(false);
    }
  }

  async function refreshMenusAndOrders() {
    setIsLoadingMenus(true);
    setIsLoadingOrders(true);
    try {
      const [menusData, ordersData] = await Promise.all([
        api("/api/menus"),
        api("/api/orders"),
      ]);
      setMenus(menusData);
      setOrders(ordersData);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.",
      );
    } finally {
      setIsLoadingMenus(false);
      setIsLoadingOrders(false);
    }
  }

  React.useEffect(() => {
    refreshMenusAndOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToCart(menu, selectedOptionIds) {
    const selectedKey = optionsKey(selectedOptionIds);
    const optionsExtra = selectedOptionIds.reduce((sum, id) => {
      const opt = menu.options.find((o) => o.id === id);
      return sum + (opt ? opt.extraPrice : 0);
    }, 0);
    const unitPrice = menu.price + optionsExtra;

    setCartItems((prev) => {
      const idx = prev.findIndex(
        (it) => it.menuId === menu.id && it.selectedOptionsKey === selectedKey,
      );
      if (idx === -1) {
        return [
          ...prev,
          {
            id: `${menu.id}__${selectedKey}`,
            menuId: menu.id,
            menuName: menu.name,
            selectedOptions: [...selectedOptionIds].sort(),
            selectedOptionsKey: selectedKey,
            unitPrice,
            quantity: 1,
            lineTotal: unitPrice,
          },
        ];
      }

      const next = [...prev];
      const old = next[idx];
      const quantity = old.quantity + 1;
      next[idx] = {
        ...old,
        quantity,
        lineTotal: old.unitPrice * quantity,
      };
      return next;
    });
  }

  function setCartQuantity(cartItemId, nextQuantity) {
    setCartItems((prev) => {
      if (nextQuantity <= 0) return prev.filter((x) => x.id !== cartItemId);
      return prev.map((x) =>
        x.id === cartItemId
          ? { ...x, quantity: nextQuantity, lineTotal: x.unitPrice * nextQuantity }
          : x,
      );
    });
  }

  async function submitOrder() {
    if (cartItems.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((ci) => ({
            menuId: ci.menuId,
            quantity: ci.quantity,
            optionIds: ci.selectedOptions,
          })),
        }),
      });
      setCartItems([]);
      await refreshMenusAndOrders();
      setActiveTab("admin");
      setToast("새 주문이 접수되었습니다.");
      window.setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 처리에 실패했습니다.");
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  async function adjustStock(id, delta) {
    try {
      await api(`/api/menus/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ delta }),
      });
      await refreshMenus();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "재고 수정에 실패했습니다.");
    }
  }

  function stockStatus(quantity) {
    if (quantity === 0) return "품절";
    if (quantity < 5) return "주의";
    return "정상";
  }

  function stockStatusClass(quantity) {
    if (quantity === 0) return "badge danger";
    if (quantity < 5) return "badge warning";
    return "badge success";
  }

  async function advanceOrderStatus(order) {
    const next =
      order.status === "RECEIVED"
        ? "IN_PROGRESS"
        : order.status === "IN_PROGRESS"
          ? "COMPLETED"
          : null;
    if (!next) return;
    try {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await refreshOrders();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 상태 변경에 실패했습니다.");
    }
  }

  const dashboardCounts = React.useMemo(
    () => ({
      totalMenus: menus.length,
      totalStock: menus.reduce((sum, m) => sum + (m.stockQuantity ?? 0), 0),
      receivedOrders: orders.filter((o) => o.status === "RECEIVED").length,
      inProgressOrders: orders.filter((o) => o.status === "IN_PROGRESS").length,
    }),
    [menus, orders],
  );

  return (
    <div className="page">
      <div className="shell">
        <header className="topbar" role="banner">
          <button
            type="button"
            className="brand"
            onClick={() => setActiveTab("order")}
          >
            COZY
          </button>
          <nav className="tabs" aria-label="페이지 이동">
            <button
              type="button"
              className={`tab ${activeTab === "order" ? "active" : ""}`}
              aria-current={activeTab === "order" ? "page" : undefined}
              onClick={() => setActiveTab("order")}
            >
              주문하기
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "admin" ? "active" : ""}`}
              aria-current={activeTab === "admin" ? "page" : undefined}
              onClick={() => setActiveTab("admin")}
            >
              관리자
            </button>
          </nav>
        </header>

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        {error && (
          <div className="toast errorToast" role="alert">
            <span className="errorText">{error}</span>
            <button
              type="button"
              className="retryButton"
              onClick={() => refreshMenusAndOrders()}
            >
              다시 시도
            </button>
          </div>
        )}

        {activeTab === "admin" ? (
          <main className="content" role="main">
            <section className="adminSection">
              <h2 className="sectionTitle">관리자 대시보드</h2>
              <div className="dashboardGrid">
                <div className="dashboardCard">
                  <div className="dashLabel">메뉴 수</div>
                  <div className="dashValue">{dashboardCounts.totalMenus}</div>
                </div>
                <div className="dashboardCard">
                  <div className="dashLabel">전체 재고 수량</div>
                  <div className="dashValue">{dashboardCounts.totalStock}</div>
                </div>
                <div className="dashboardCard">
                  <div className="dashLabel">주문 접수</div>
                  <div className="dashValue">
                    {dashboardCounts.receivedOrders}
                  </div>
                </div>
                <div className="dashboardCard">
                  <div className="dashLabel">제조 중</div>
                  <div className="dashValue">
                    {dashboardCounts.inProgressOrders}
                  </div>
                </div>
              </div>
            </section>

            <section className="adminSection">
              <h2 className="sectionTitle">재고 현황</h2>
              <div className="stockTable">
                <div className="stockHeader">
                  <span>메뉴</span>
                  <span>재고</span>
                  <span>상태</span>
                  <span>조정</span>
                </div>
                {isLoadingMenus ? (
                  <p className="muted">불러오는 중...</p>
                ) : menus.length === 0 ? (
                  <p className="muted">메뉴 데이터가 없습니다.</p>
                ) : (
                  menus.slice(0, 3).map((m) => {
                    const qty = Number(m.stockQuantity ?? 0);
                    return (
                      <div key={m.id} className="stockRow">
                        <span className="stockName">{m.name}</span>
                        <span className="stockQty">{qty} 개</span>
                        <span className={stockStatusClass(qty)}>
                          {stockStatus(qty)}
                        </span>
                        <span className="stockActions">
                          <button
                            type="button"
                            className="iconButton"
                            onClick={() => adjustStock(m.id, -1)}
                            aria-label={`${m.name} 재고 감소`}
                          >
                            -
                          </button>
                          <button
                            type="button"
                            className="iconButton"
                            onClick={() => adjustStock(m.id, 1)}
                            aria-label={`${m.name} 재고 증가`}
                          >
                            +
                          </button>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="adminSection">
              <h2 className="sectionTitle">주문 현황</h2>
              {isLoadingOrders ? (
                <p className="muted">불러오는 중...</p>
              ) : orders.length === 0 ? (
                <p className="muted">아직 접수된 주문이 없습니다.</p>
              ) : (
                <div className="ordersTable">
                  <div className="ordersHeader">
                    <span>접수 일시</span>
                    <span>주문 내용</span>
                    <span>금액</span>
                    <span>상태</span>
                    <span>액션</span>
                  </div>
                  {orders.map((order) => (
                    <div key={order.id} className="ordersRow">
                      <span className="orderDate">
                        {new Date(order.createdAt).toLocaleString("ko-KR")}
                      </span>
                      <span className="orderItems">{order.itemsSummary}</span>
                      <span className="orderAmount">
                        {formatKRW(order.totalAmount)}
                      </span>
                      <span className="orderStatus">
                        {order.status === "RECEIVED"
                          ? "주문 접수"
                          : order.status === "IN_PROGRESS"
                            ? "제조 중"
                            : "완료"}
                      </span>
                      <span className="orderActions">
                        <button
                          type="button"
                          className="smallPrimaryButton"
                          disabled={order.status === "COMPLETED"}
                          onClick={() => advanceOrderStatus(order)}
                        >
                          {order.status === "RECEIVED"
                            ? "제조 시작"
                            : order.status === "IN_PROGRESS"
                              ? "완료 처리"
                              : "완료"}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        ) : (
          <main className="content" role="main">
            <section className="menuGrid" aria-label="메뉴 목록">
              {isLoadingMenus ? (
                <p className="muted">불러오는 중...</p>
              ) : (
                menus.map((menu) => (
                  <MenuCard key={menu.id} menu={menu} onAdd={addToCart} />
                ))
              )}
            </section>

            <section className="cartPanel" aria-label="장바구니">
              <h2 className="cartTitle">장바구니</h2>

              {cartItems.length === 0 ? (
                <p className="empty">장바구니가 비어 있습니다.</p>
              ) : (
                <div className="cartBody">
                  <div className="cartLeft">
                    <div className="cartLines" role="list">
                      {cartItems.map((item) => {
                        const menu = menus.find((m) => m.id === item.menuId);
                        const optionsText = menu
                          ? summarizeOptions(menu, item.selectedOptions)
                          : "";
                        const nameLine = optionsText
                          ? `${item.menuName} (${optionsText})`
                          : item.menuName;
                        return (
                          <div key={item.id} className="cartLine" role="listitem">
                            <div className="cartLineLeft">
                              <span className="cartItemName">{nameLine}</span>
                              <span className="qtyControls" aria-label="수량 조절">
                                <button
                                  type="button"
                                  className="qtyBtn"
                                  onClick={() => setCartQuantity(item.id, item.quantity - 1)}
                                  aria-label="수량 감소"
                                >
                                  -
                                </button>
                                <span className="qtyValue">{item.quantity}</span>
                                <button
                                  type="button"
                                  className="qtyBtn"
                                  onClick={() => setCartQuantity(item.id, item.quantity + 1)}
                                  aria-label="수량 증가"
                                >
                                  +
                                </button>
                              </span>
                            </div>
                            <div className="cartLineRight">
                              {formatKRW(item.lineTotal)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cartRight">
                    <div className="cartSummary">
                      <div className="totalLabel">총 금액</div>
                      <div className="totalValue">{formatKRW(cartTotal)}</div>
                    </div>

                    <div className="cartActions">
                      <button
                        type="button"
                        className="primaryButton"
                        onClick={submitOrder}
                        disabled={cartItems.length === 0 || isSubmittingOrder}
                      >
                        {isSubmittingOrder ? "주문 처리중..." : "주문하기"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;

function MenuCard({ menu, onAdd }) {
  const [selected, setSelected] = React.useState([]);

  function toggleOption(optionId) {
    setSelected((prev) => {
      if (prev.includes(optionId)) return prev.filter((x) => x !== optionId);
      return [...prev, optionId];
    });
  }

  function handleAdd() {
    onAdd(menu, selected);
    setSelected([]);
  }

  return (
    <article className="menuCard">
      {(() => {
        const name = String(menu.name ?? "");
        const variant = name.includes("ICE")
          ? "ice"
          : name.includes("HOT")
            ? "hot"
            : name.includes("라떼")
              ? "latte"
              : "default";
        return (
          <div className={`thumb thumb-${variant}`} aria-hidden="true" />
        );
      })()}
      <div className="menuMeta">
        <div className="menuName">{menu.name}</div>
        <div className="menuPrice">{formatKRW(menu.price)}</div>
        <div className="menuDesc">{menu.description}</div>
      </div>

      <div className="options">
        {menu.options.map((opt) => (
          <label key={opt.id} className="optionRow">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggleOption(opt.id)}
            />
            <span>
              {opt.name} ({opt.extraPrice === 0 ? "+0원" : `+${opt.extraPrice}원`})
            </span>
          </label>
        ))}
      </div>

      <button type="button" className="secondaryButton" onClick={handleAdd}>
        담기
      </button>
    </article>
  );
}
