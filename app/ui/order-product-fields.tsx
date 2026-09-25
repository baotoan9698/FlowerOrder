"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Plus, X, Package } from "lucide-react";
import type { OrderView, ProductView, OrderItemInput } from "@/lib/validation";
import MoneyInput from "./money-input";
import { saveProduct } from "@/app/actions";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
type Row = OrderItemInput & { key: number; priceText: string };
export default function OrderProductFields({ order, products, onPrice }: {
  order: OrderView | "new"; products: ProductView[]; onPrice: (price: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => (order === "new"
    ? [{ name: "", productId: null, quantity: 1, unitPrice: 0 }]
    : order.items?.length ? order.items : [{ name: order.product, productId: order.productId, quantity: 1, unitPrice: order.price - (order.shippingFee ?? 0) + (order.discount ?? 0) }]
  ).map((item, key) => ({ ...item, key, priceText: order === "new" ? "" : String(item.unitPrice) })));
  const [nextKey, setNextKey] = useState(rows.length);
  const [focused, setFocused] = useState<number | null>(null);
  const [active, setActive] = useState(-1);
  const [addedProducts, setAddedProducts] = useState<ProductView[]>([]);
  const [savingKey, setSavingKey] = useState<number | null>(null);
  const saving = useRef(false);
  const [quickError, setQuickError] = useState("");
  const catalog = [...products, ...addedProducts.filter((item) => !products.some((product) => product.id === item.id))];
  async function quickAdd(row: Row) {
    if (saving.current) return;
    saving.current = true;
    setSavingKey(row.key); setQuickError("");
    const name = row.name.trim();
    try {
      const form = new FormData();
      form.set("name", name); form.set("description", ""); form.set("price", String(row.unitPrice));
      const result = await saveProduct(form);
      if (result.error || !result.id) { setQuickError(result.error || "Chưa thêm được sản phẩm."); return; }
      const product: ProductView = { id: result.id, name, price: row.unitPrice, description: "", archived: false, images: [] };
      setAddedProducts((previous) => [...previous, product]);
      setRows((previous) => previous.map((item) => item.key === row.key && item.name === row.name && !item.productId ? { ...item, name, productId: product.id } : item));
      setFocused(null);
    } catch { setQuickError("Chưa thêm được sản phẩm. Vui lòng thử lại."); }
    finally { saving.current = false; setSavingKey(null); }
  }
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const first = element.children[0] as HTMLElement | undefined;
      if (!first) return;
      const suggestions = first.querySelector<HTMLElement>(".product-suggestions");
      const suggestionHeight = suggestions ? suggestions.offsetHeight + parseFloat(getComputedStyle(suggestions).marginTop) : 0;
      element.style.height = `${(first.offsetHeight - suggestionHeight) * 3}px`;
    };
    const observer = new ResizeObserver(measure);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [rows.length]);
  function commit(next: Row[]) {
    setRows(next); onPrice(next.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  }
  function update(key: number, values: Partial<Row>) { commit(rows.map((row) => row.key === key ? { ...row, ...values } : row)); }
  function choose(key: number, product: ProductView) {
    update(key, { productId: product.id, name: product.name, unitPrice: product.price, priceText: String(product.price) }); setFocused(null); setActive(-1);
  }
  return <section className="order-section order-products">
    <div className="order-section-heading"><h3>Sản phẩm</h3><small>{rows.length} dòng · {rows.reduce((sum, row) => sum + row.quantity, 0)} sản phẩm</small></div>
    <input type="hidden" name="items" value={JSON.stringify(rows.map(({ key: _key, priceText: _priceText, ...item }) => item))} />
    <div ref={list} className={`order-items-scroll${rows.length > 3 ? " is-scrollable" : ""}`} role="region" aria-label="Sản phẩm trong đơn" tabIndex={rows.length > 3 ? 0 : undefined}>
    {rows.map((row, index) => {
      const terms = normalize(row.name).split(/\s+/).filter(Boolean);
      const suggestions = catalog.filter((product) => !product.archived && terms.every((term) => normalize(product.name).includes(term))).slice(0, 8);
      const canQuickAdd = !row.productId && row.name.trim() && !catalog.some((product) => !product.archived && normalize(product.name) === normalize(row.name));
      const expanded = focused === row.key && !row.productId;
      return <div className="order-item-row" key={row.key}>
        <div className="order-item-search">
          <label>{index === 0 ? "Sản phẩm" : `Sản phẩm ${index + 1}`}
            <input role="combobox" aria-expanded={expanded} aria-controls={expanded ? `${listId}-${row.key}` : undefined}
              aria-autocomplete="list" aria-activedescendant={expanded && active >= 0 ? `${listId}-${row.key}-${active}` : undefined}
              required maxLength={160} autoComplete="off" placeholder="Nhập tên sản phẩm…" value={row.name}
              onFocus={() => { setFocused(row.key); setActive(-1); }} onBlur={() => { setFocused(null); setActive(-1); }}
              onChange={(event) => { update(row.key, { name: event.target.value, productId: null }); setFocused(row.key); setActive(-1); }}
              onKeyDown={(event) => {
                if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setFocused(null); }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setFocused(row.key); setActive((old) => Math.max(-1, Math.min(suggestions.length - 1, old + (event.key === "ArrowDown" ? 1 : -1)))); }
                if (event.key === "Enter") { event.preventDefault(); if (expanded && active >= 0 && suggestions[active]) choose(row.key, suggestions[active]); else setFocused(null); }
              }} />
          </label>
          {expanded && <div className="product-suggestions" id={`${listId}-${row.key}`} role="listbox" aria-label={`Sản phẩm gợi ý ${index + 1}`}>
            {suggestions.map((product, option) => <button type="button" role="option" aria-selected={active === option} id={`${listId}-${row.key}-${option}`} key={product.id}
              onPointerDown={(event) => event.preventDefault()} onClick={() => choose(row.key, product)}>
              <Package size={18} /><span>{product.name}</span><strong>{money(product.price)}</strong>
            </button>)}
            {!suggestions.length && <p>Chưa có sản phẩm tương tự trong danh mục.</p>}
          </div>}
          <div className="quick-add-slot">{canQuickAdd && <button type="button" className="secondary quick-add-product" disabled={savingKey !== null} onPointerDown={(event) => event.preventDefault()} onClick={() => quickAdd(row)}><Plus size={14} />{savingKey === row.key ? "Đang thêm…" : "Thêm sản phẩm nhanh"}</button>}</div>
        </div>
        <label className="item-price">Đơn giá (₫)<MoneyInput name={`item-price-${row.key}`} value={row.priceText} onChange={(value) => update(row.key, { unitPrice: Number(value), priceText: value })} /></label>
        <label className="item-quantity">Số lượng<input type="number" inputMode="numeric" min={1} max={9999} required value={row.quantity || ""} onChange={(event) => update(row.key, { quantity: Number(event.target.value) })} /></label>
        <div className="item-subtotal"><strong>{money(row.quantity * row.unitPrice)}</strong></div>
        <button type="button" className="icon-button danger-text item-remove" aria-label={`Xóa sản phẩm ${index + 1}`} disabled={rows.length === 1} onClick={() => commit(rows.filter((item) => item.key !== row.key))}><X size={17} /></button>
      </div>;
    })}
    </div>
    {quickError && <p role="alert">{quickError}</p>}
    <button type="button" className="secondary add-order-product" disabled={rows.length >= 100} onClick={() => {
      commit([...rows, { key: nextKey, name: "", productId: null, quantity: 1, unitPrice: 0, priceText: "" }]); setNextKey(nextKey + 1);
    }}><Plus size={17} />Thêm sản phẩm</button>
  </section>;
}
