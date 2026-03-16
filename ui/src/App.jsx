import "./App.css";
import React from "react";

const MENUS = [
  {
    id: "americano-ice",
    name: "아메리카노(ICE)",
    basePrice: 4000,
    description: "간단한 설명...",
    options: [
      { id: "shot", label: "샷 추가", extraPrice: 500 },
      { id: "syrup", label: "시럽 추가", extraPrice: 0 },
    ],
  },
  {
    id: "americano-hot",
    name: "아메리카노(HOT)",
    basePrice: 4000,
    description: "간단한 설명...",
    options: [
      { id: "shot", label: "샷 추가", extraPrice: 500 },
      { id: "syrup", label: "시럽 추가", extraPrice: 0 },
    ],
  },
  {
    id: "latte",
    name: "카페라떼",
    basePrice: 5000,
    description: "간단한 설명...",
    options: [
      { id: "shot", label: "샷 추가", extraPrice: 500 },
      { id: "syrup", label: "시럽 추가", extraPrice: 0 },
    ],
  },
];

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
    .map((o) => o.label);
  return labels.join(", ");
}

function App() {
  const [activeTab, setActiveTab] = React.useState("order"); // 'order' | 'admin'
  const [cartItems, setCartItems] = React.useState([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  function addToCart(menu, selectedOptionIds) {
    const selectedKey = optionsKey(selectedOptionIds);
    const optionsExtra = selectedOptionIds.reduce((sum, id) => {
      const opt = menu.options.find((o) => o.id === id);
      return sum + (opt ? opt.extraPrice : 0);
    }, 0);
    const unitPrice = menu.basePrice + optionsExtra;

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

  async function submitOrder() {
    if (cartItems.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    await new Promise((r) => setTimeout(r, 600));
    setCartItems([]);
    setIsSubmittingOrder(false);
    window.alert("주문이 접수되었습니다.");
  }

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

        {activeTab === "admin" ? (
          <main className="content" role="main">
            <div className="panel">
              <h2 className="panelTitle">관리자</h2>
              <p className="muted">관리자 화면은 다음 단계에서 구현합니다.</p>
            </div>
          </main>
        ) : (
          <main className="content" role="main">
            <section className="menuGrid" aria-label="메뉴 목록">
              {MENUS.map((menu) => (
                <MenuCard key={menu.id} menu={menu} onAdd={addToCart} />
              ))}
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
                        const menu = MENUS.find((m) => m.id === item.menuId);
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
                              <span className="cartItemQty">X {item.quantity}</span>
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
      <div className="thumb" aria-hidden="true" />
      <div className="menuMeta">
        <div className="menuName">{menu.name}</div>
        <div className="menuPrice">{formatKRW(menu.basePrice)}</div>
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
              {opt.label} ({opt.extraPrice === 0 ? "+0원" : `+${opt.extraPrice}원`})
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
