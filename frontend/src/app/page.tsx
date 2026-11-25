"use client";
import React, { useCallback, useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";
type Urg = "Dusuk" | "Orta" | "Acil";
interface Pat { patient_name: string; species: string; urgency: Urg; complaint: string; position?: number; }
interface Room { room_id: string; status: "Bos" | "Dolu"; current_patient: Pat | null; }
interface Stk { item_id: string; name: string; quantity: number; critical_threshold: number; }
interface CState { rooms: Room[]; queue: Pat[]; inventory: Stk[]; alerts: string[]; }

export default function Page() {
  const [d, setD] = useState<CState | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [sp, setSp] = useState("Kedi");
  const [urg, setUrg] = useState<Urg>("Acil");
  const [comp, setComp] = useState("");
  const [rid, setRid] = useState("OD-1");
  const [iid, setIid] = useState("STK-1");
  const [qty, setQty] = useState(1);

  const load = useCallback(async () => {
    try {
      setErr("");
      let r = await fetch(`${API}/clinic-state`, { cache: "no-store" });
      if (r.status === 404) r = await fetch(`${API}/state`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setD(await r.json());
    } catch (e) { setErr(e instanceof Error ? e.message : "Bağlantı hatası"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onTriage(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const r = await fetch(`${API}/triage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_name: name, species: sp, urgency: urg, complaint: comp }) });
    const j = await r.json();
    if (!r.ok) return setErr(j.detail || "Triyaj hatası");
    setD(j.state); setName(""); setComp(""); setMsg("Triyaj kaydı oluşturuldu.");
  }

  async function onComp(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const used_items = qty > 0 ? [{ item_id: iid, quantity: Number(qty) }] : [];
    const r = await fetch(`${API}/treatment/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_id: rid, used_items }) });
    const j = await r.json();
    if (!r.ok) return setErr(j.detail || "Tedavi hatası");
    setD(j.state); setMsg("Tedavi tamamlandı ve stok güncellendi.");
  }

  const bdg = (u: Urg) => u === "Acil" ? "bg-rose-500/20 text-rose-300 border-rose-400/40" : u === "Orta" ? "bg-amber-500/20 text-amber-300 border-amber-400/40" : "bg-sky-500/20 text-sky-300 border-sky-400/40";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-300 via-emerald-300 to-indigo-300 bg-clip-text text-transparent">VetOps Twin — Klinik Operasyon Merkezi</h1>
          <p className="text-xs text-slate-400">Odalar, öncelikli triyaj kuyruğu, tedavi tamamlama ve stok takibi</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-bold cursor-pointer">Durumu Yenile</button>
      </header>
      {err && <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-400/40 text-rose-200 text-sm">Hata: {err}</div>}
      {msg && <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-400/40 text-emerald-200 text-sm">{msg}</div>}
      {d && d.alerts.length > 0 && <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-400/40 text-amber-200 text-sm">{d.alerts.join(" | ")}</div>}
      {d && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {d.rooms.map((r) => (
              <div key={r.room_id} className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-2">
                <div className="flex justify-between font-bold"><span className="text-cyan-300">{r.room_id}</span><span className={r.status === "Dolu" ? "text-rose-300" : "text-emerald-300"}>{r.status}</span></div>
                <p className="text-sm text-slate-300">{r.current_patient ? `${r.current_patient.patient_name} (${r.current_patient.species}) - ${r.current_patient.urgency} - ${r.current_patient.complaint}` : "Oda boş"}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={onTriage} className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-3">
              <h2 className="font-bold text-sky-300">Yeni Triyaj</h2>
              <div className="grid grid-cols-2 gap-3">
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Hasta Adı" className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white" />
                <input required value={sp} onChange={(e) => setSp(e.target.value)} placeholder="Tür" className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={urg} onChange={(e) => setUrg(e.target.value as Urg)} className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white"><option value="Acil">Acil</option><option value="Orta">Orta</option><option value="Dusuk">Dusuk</option></select>
                <input required value={comp} onChange={(e) => setComp(e.target.value)} placeholder="Şikayet" className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-bold cursor-pointer">Kaydet</button>
            </form>
            <form onSubmit={onComp} className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-3">
              <h2 className="font-bold text-emerald-300">Tedavi Tamamla</h2>
              <div className="grid grid-cols-3 gap-3">
                <select value={rid} onChange={(e) => setRid(e.target.value)} className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white">{d.rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_id}</option>)}</select>
                <select value={iid} onChange={(e) => setIid(e.target.value)} className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white">{d.inventory.map((it) => <option key={it.item_id} value={it.item_id}>{it.item_id} - {it.name}</option>)}</select>
                <input type="number" min={1} required value={qty} onChange={(e) => setQty(Number(e.target.value))} className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 text-sm text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold cursor-pointer">Tamamla</button>
            </form>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-2">
              <h2 className="font-bold text-amber-300">Bekleme Kuyruğu ({d.queue.length})</h2>
              {d.queue.map((p, i) => <div key={i} className="flex justify-between items-center border-t border-white/10 pt-2 text-sm"><span><strong className="text-cyan-300">#{p.position ?? i + 1}</strong> {p.patient_name} ({p.species}) - {p.complaint}</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${bdg(p.urgency)}`}>{p.urgency}</span></div>)}
            </div>
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-2">
              <h2 className="font-bold text-fuchsia-300">Stok Envanteri</h2>
              {d.inventory.map((it) => <div key={it.item_id} className="flex justify-between border-t border-white/10 pt-2 text-sm"><span><strong className="text-cyan-300">{it.item_id}</strong> - {it.name}</span><span><strong className={it.quantity <= it.critical_threshold ? "text-rose-300" : "text-emerald-300"}>{it.quantity}</strong> <span className="text-amber-300">/ eşik {it.critical_threshold}</span></span></div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}