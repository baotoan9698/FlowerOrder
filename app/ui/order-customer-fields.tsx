"use client";
import { useId, useRef, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { addCustomer } from "../actions";
import type { CustomerView, OrderView } from "@/lib/validation";

export default function OrderCustomerFields({ order, customers: initialCustomers }: { order: OrderView | "new"; customers: CustomerView[] }) {
  const [savedCustomers, setSavedCustomers] = useState<CustomerView[]>([]);
  const customers = [...initialCustomers.filter((customer) => !savedCustomers.some((saved) => saved.id === customer.id)), ...savedCustomers];
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [selected, setSelected] = useState(order === "new" ? "" : order.customerId ?? "");
  const [query, setQuery] = useState(order === "new" ? "" : order.customer);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(order === "new" ? "" : order.customer);
  const [phone, setPhone] = useState(order === "new" ? "" : order.phone);
  const [address, setAddress] = useState(order === "new" ? "" : order.address);
  const initialProfile = order === "new" ? undefined : initialCustomers.find((customer) => customer.id === order.customerId);
  const [email, setEmail] = useState(initialProfile?.email ?? "");
  const [birthday, setBirthday] = useState(initialProfile?.birthday ?? "");
  const [gender, setGender] = useState(initialProfile?.gender ?? "");
  function clearProfile() { setEmail(""); setBirthday(""); setGender(""); setSaveNotice(""); setSaveError(""); }
  const matched = customers.find((customer) => customer.name.trim() === name.trim() && customer.phone.replace(/[ ()-]/g, "") === phone.trim().replace(/[ ()-]/g, ""));
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
  const term = normalize(query);
  const digits = query.replace(/\D/g, "");
  const phoneQuery = /^[+\d ()-]+$/.test(query.trim()) && digits.length > 0;
  const matches = term ? customers.filter((customer) => normalize(customer.name).includes(term) || normalize(customer.code).includes(term) || (phoneQuery && customer.phone.replace(/\D/g, "").includes(digits))) : [];
  const shown = matches.slice(0, 8);
  function choose(id: string) {
    setSelected(id);
    const customer = customers.find((item) => item.id === id);
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setAddress(customer?.address ?? "");
    setEmail(customer?.email ?? ""); setBirthday(customer?.birthday ?? ""); setGender(customer?.gender ?? "");
    setSaveNotice(""); setSaveError("");
    setQuery(customer?.name ?? "");
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }
  function newCustomer() {
    setSelected("");
    setName(phoneQuery ? "" : query.trim());
    setPhone(phoneQuery ? query.trim() : selected ? "" : phone);
    if (selected) { setAddress(""); clearProfile(); }
    setOpen(false);
    setActive(-1);
  }
  return <>
    <div className="span-two compact-customer-heading"><h3>Khách hàng</h3>
      <select aria-label="Giới tính" name="customerGender" value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Giới tính</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option>
      </select>
    </div>
    <input type="hidden" name="customerId" value={selected} />
    <div className="customer-autocomplete" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <input aria-label="Khách hàng" ref={input} role="combobox" aria-autocomplete="list" aria-expanded={open && !!term} aria-controls={listId} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" maxLength={100} value={query}
        placeholder="Tên khách hàng / SĐT"
        onFocus={() => { if (!selected) setOpen(true); }}
        onChange={(e) => {
          const value = e.target.value;
          if (selected) { setPhone(""); setAddress(""); clearProfile(); }
          setSelected(""); setQuery(value); setOpen(true); setActive(-1);
          const isPhone = /^[+\d ()-]+$/.test(value.trim()) && /\d/.test(value);
          setName(isPhone ? "" : value);
          if (isPhone) setPhone(value.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setActive(-1); }
          else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive((index) => shown.length ? (index + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length : -1); }
          else if (e.key === "Enter" && open && term) { e.preventDefault(); if (active >= 0 && shown[active]) choose(shown[active].id); else newCustomer(); }
        }} />
      {open && !!term && <div className="customer-suggestions">
        <div id={listId} role="listbox" aria-label="Khách hàng gợi ý">{shown.map((customer, index) => <button type="button" role="option" id={`${listId}-${index}`} aria-selected={active === index} key={customer.id} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(customer.id)}>
          <strong>{customer.name}</strong><small>{customer.phone} · {customer.code}</small>
        </button>)}</div>
        {!shown.length && <p role="status">Chưa tìm thấy khách phù hợp.</p>}
        {matches.length > 8 && <p>Hiển thị 8 khách đầu tiên. Nhập thêm để tìm chính xác hơn.</p>}
        <button type="button" className="customer-add" onMouseDown={(e) => e.preventDefault()} onClick={newCustomer}>+ Thêm khách hàng mới</button>
      </div>}
    </div>
    <input aria-label="Số điện thoại" placeholder="SĐT" name="phone" type="tel" required maxLength={20} value={phone} readOnly={!!selected} onChange={(e) => setPhone(e.target.value)} />
    {!selected && phoneQuery ? <input className="span-two" aria-label="Tên khách hàng mới" placeholder="Tên khách hàng mới" name="customer" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /> : <input type="hidden" name="customer" value={name} />}
    <input aria-label="Email khách hàng" placeholder="Email (không bắt buộc)" name="customerEmail" type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
    <div className="compact-birthday"><input aria-label="Ngày sinh" name="customerBirthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} data-empty={!birthday} />{!birthday && <span>Ngày sinh</span>}</div>
    <input className="span-two" aria-label="Địa chỉ" placeholder="Địa chỉ" name="address" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} />
    <div className="span-two customer-save">
      <button type="button" className="secondary" disabled={saving} onClick={() => {
        setSaveError(""); setSaveNotice(""); setOpen(false);
        const form = new FormData();
        form.set("id", selected || matched?.id || "");
        form.set("name", name); form.set("phone", phone); form.set("address", address);
        form.set("email", email); form.set("birthday", birthday); form.set("gender", gender);
        startSave(async () => {
          try {
            const result = await addCustomer(form);
            if (result.error) { setSaveError(result.error); return; }
            if ("customer" in result && result.customer) {
              const customer = result.customer;
              setSavedCustomers((previous) => [...previous.filter((item) => item.id !== customer.id), customer]);
              setSelected(customer.id); setQuery(customer.name); setName(customer.name); setPhone(customer.phone); setAddress(customer.address);
              setSaveNotice(`Đã lưu thông tin khách hàng ${customer.code}.`);
            }
          } catch { setSaveError("Chưa thể lưu thông tin khách hàng. Vui lòng thử lại."); }
        });
      }}><Save size={16} />{saving ? "Đang lưu…" : "Lưu thông tin khách hàng"}</button>
      {saveError && <p className="error" role="alert">{saveError}</p>}
      {saveNotice && <p className="customer-code-hint" role="status">{saveNotice}</p>}
    </div>
  </>;
}
