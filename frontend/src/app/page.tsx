"use client";

import React, { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Patient {
  patient_name: string;
  species: string;
  urgency: "Dusuk" | "Orta" | "Acil";
  complaint: string;
  position?: number;
}

interface Room {
  room_id: string;
  status: "Bos" | "Dolu";
  current_patient: Patient | null;
}

interface StockItem {
  item_id: string;
  name: string;
  quantity: number;
  critical_threshold: number;
}

interface ClinicState {
  rooms: Room[];
  queue: Patient[];
  inventory: StockItem[];
  alerts: string[];
}

export default function ClinicDashboardPage() {
  const [state, setState] = useState<ClinicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [patientName, setPatientName] = useState("");
  const [species, setSpecies] = useState("Kedi");
  const [urgency, setUrgency] = useState<"Dusuk" | "Orta" | "Acil">("Orta");
  const [complaint, setComplaint] = useState("");
  const [submittingTriage, setSubmittingTriage] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState("OD-1");
  const [selectedItemId, setSelectedItemId] = useState("STK-1");
  const [usedQuantity, setUsedQuantity] = useState(1);
  const [completingTreatment, setCompletingTreatment] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/state`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Durum alınamadı (HTTP ${res.status})`);
      }
      const data: ClinicState = await res.json();
      setState(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Backend durumuna bağlanılamadı."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !complaint.trim()) return;

    try {
      setSubmittingTriage(true);
      setError(null);
      setNotice(null);

      const res = await fetch(`${API_BASE}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          species: species.trim() || "Kedi",
          urgency,
          complaint: complaint.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Triyaj kaydı başarısız oldu");
      }

      setState(data.state);
      setPatientName("");
      setComplaint("");
      setNotice(
        data.assignment === "room"
          ? `${data.patient.patient_name} doğrudan ${data.room_id} odasına alındı.`
          : `${data.patient.patient_name} kuyruğa eklendi (Sıra: #${data.position}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triyaj hatası oluştu");
    } finally {
      setSubmittingTriage(false);
    }
  };

  const handleCompleteTreatment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCompletingTreatment(true);
      setError(null);
      setNotice(null);

      const used_items =
        usedQuantity > 0 && selectedItemId
          ? [{ item_id: selectedItemId, quantity: Number(usedQuantity) }]
          : [];

      const res = await fetch(`${API_BASE}/treatment/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: selectedRoomId,
          used_items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Tedavi tamamlanamadı");
      }

      setState(data.state);
      setNotice(
        `${data.completed_room} odasındaki tedavi tamamlandı ve stok güncellendi.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Tedavi tamamlama hatası"
      );
    } finally {
      setCompletingTreatment(false);
    }
  };

  const urgencyBadge = (level: Patient["urgency"]) => {
    if (level === "Acil") {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (level === "Orta") {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              VetOps Twin — Klinik Operasyon Paneli
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Oda durumu, öncelikli triyaj kuyruğu, tedavi tamamlama ve stok takibi
            </p>
          </div>
          <button
            type="button"
            onClick={fetchState}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition cursor-pointer"
          >
            Durumu Yenile
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong>Hata:</strong> {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {state && state.alerts.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5">
            <h2 className="text-sm font-semibold text-amber-900">
              Kritik Stok Uyarıları ({state.alerts.length})
            </h2>
            <ul className="list-disc list-inside text-sm text-amber-800 space-y-0.5">
              {state.alerts.map((alertText, index) => (
                <li key={index}>{alertText}</li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            Klinik verileri yükleniyor...
          </div>
        ) : (
          state && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.rooms.map((room) => {
                  const isOccupied = room.status === "Dolu";
                  return (
                    <div
                      key={room.room_id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{room.room_id}</span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            isOccupied
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>

                      {room.current_patient ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              {room.current_patient.patient_name} (
                              {room.current_patient.species})
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded border ${urgencyBadge(
                                room.current_patient.urgency
                              )}`}
                            >
                              {room.current_patient.urgency}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Şikayet: {room.current_patient.complaint}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 py-3">
                          Odada şu anda aktif hasta bulunmuyor.
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleTriageSubmit}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
                >
                  <h2 className="text-lg font-semibold">Yeni Triyaj Kaydı</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Hasta Adı
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Örn: Zeytin"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tür
                      </label>
                      <input
                        type="text"
                        required
                        value={species}
                        onChange={(e) => setSpecies(e.target.value)}
                        placeholder="Kedi / Köpek"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Aciliyet Seviyesi
                      </label>
                      <select
                        value={urgency}
                        onChange={(e) =>
                          setUrgency(e.target.value as "Dusuk" | "Orta" | "Acil")
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="Acil">Acil</option>
                        <option value="Orta">Orta</option>
                        <option value="Dusuk">Dusuk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Şikayet
                      </label>
                      <input
                        type="text"
                        required
                        value={complaint}
                        onChange={(e) => setComplaint(e.target.value)}
                        placeholder="Örn: Travma, Kusma"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTriage}
                    className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submittingTriage ? "Kaydediliyor..." : "Triyaj Kaydı Oluştur"}
                  </button>
                </form>

                <form
                  onSubmit={handleCompleteTreatment}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
                >
                  <h2 className="text-lg font-semibold">
                    Tedavi Tamamla ve Stok Düş
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Oda
                      </label>
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        {state.rooms.map((r) => (
                          <option key={r.room_id} value={r.room_id}>
                            {r.room_id} ({r.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Kullanılan Stok Kalemi
                      </label>
                      <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        {state.inventory.map((item) => (
                          <option key={item.item_id} value={item.item_id}>
                            {item.item_id} — {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Miktar
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={usedQuantity}
                        onChange={(e) => setUsedQuantity(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={completingTreatment}
                    className="w-full rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    {completingTreatment
                      ? "Tamamlanıyor..."
                      : "Tedaviyi Tamamla"}
                  </button>
                </form>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <h2 className="text-lg font-semibold">
                    Bekleme Kuyruğu ({state.queue.length})
                  </h2>
                  {state.queue.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">
                      Bekleyen hasta yok.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {state.queue.map((item, idx) => (
                        <div
                          key={`${item.patient_name}-${idx}`}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-semibold text-sm">
                              #{item.position ?? idx + 1} {item.patient_name}
                            </span>{" "}
                            <span className="text-xs text-slate-500">
                              ({item.species}) — {item.complaint}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded border ${urgencyBadge(
                              item.urgency
                            )}`}
                          >
                            {item.urgency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <h2 className="text-lg font-semibold">Stok Envanteri</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="py-2 pr-3">Kod</th>
                          <th className="py-2 pr-3">Malzeme</th>
                          <th className="py-2 pr-3">Adet</th>
                          <th className="py-2">Eşik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.inventory.map((item) => {
                          const isCritical =
                            item.quantity <= item.critical_threshold;
                          return (
                            <tr
                              key={item.item_id}
                              className={isCritical ? "bg-amber-50/70" : ""}
                            >
                              <td className="py-2.5 pr-3 font-mono text-xs">
                                {item.item_id}
                              </td>
                              <td className="py-2.5 pr-3 font-medium">
                                {item.name}
                              </td>
                              <td className="py-2.5 pr-3 font-semibold">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 text-slate-500">
                                {item.critical_threshold}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          )
        )}
      </div>
    </main>
  );
}