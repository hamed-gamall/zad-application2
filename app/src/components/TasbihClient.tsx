"use client";

import { useEffect, useMemo, useState } from "react";
import { addTasbih, getTasbihTotal, resetTasbih, getCustomTasbihPhrases, addCustomTasbihPhrase, removeCustomTasbihPhrase, type CustomTasbihPhrase } from "@/lib/storage";
import ImmersiveScreen from "@/components/ui/ImmersiveScreen";
import FloatingControl from "@/components/ui/FloatingControl";
import BottomSheet from "@/components/ui/BottomSheet";
import CircularCounter from "@/components/ui/CircularCounter";
import BeadsArt from "@/components/ui/BeadsArt";

const PRESETS = [
  { id: "p1", text: "سُبْحَانَ اللَّهِ", target: 33 },
  { id: "p2", text: "الْحَمْدُ لِلَّهِ", target: 33 },
  { id: "p3", text: "اللَّهُ أَكْبَرُ", target: 34 },
  { id: "p4", text: "لَا إِلَٰهَ إِلَّا اللَّهُ", target: 100 },
  { id: "p5", text: "أَسْتَغْفِرُ اللَّهَ", target: 100 },
];
const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ar = (n: number) => n.toLocaleString("ar-EG");

// A focused counter: the ring is the button. Tap anywhere in the middle.
export default function TasbihClient() {
  const [custom, setCustom] = useState<CustomTasbihPhrase[]>([]);
  const [selectedId, setSelectedId] = useState("p1");
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [sheet, setSheet] = useState<null | "presets" | "stats">(null);
  const [newText, setNewText] = useState("");
  const [newTarget, setNewTarget] = useState(33);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotal(getTasbihTotal());
    setCustom(getCustomTasbihPhrases());
  }, []);

  const all = useMemo(() => [...PRESETS, ...custom], [custom]);
  const active = all.find((p) => p.id === selectedId) ?? PRESETS[0];
  const target = active.target;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && !sheet) {
        e.preventDefault();
        tap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, count, sheet]);

  function tap() {
    setPulse((p) => p + 1);
    setCount((c) => {
      const next = c + 1;
      if (next >= target) {
        setRounds((r) => r + 1);
        setTotal(addTasbih(target));
        if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
        return 0;
      }
      if (navigator.vibrate) navigator.vibrate(7);
      return next;
    });
  }
  function resetAll() {
    setCount(0);
    setRounds(0);
    resetTasbih();
    setTotal(0);
  }
  function addPhrase() {
    if (!newText.trim()) return;
    const list = addCustomTasbihPhrase(newText, newTarget || 33);
    setCustom(list);
    setSelectedId(list[list.length - 1].id);
    setCount(0);
    setNewText("");
    setNewTarget(33);
    setSheet(null);
  }
  function deletePhrase(id: string) {
    setCustom(removeCustomTasbihPhrase(id));
    if (selectedId === id) {
      setSelectedId("p1");
      setCount(0);
    }
  }

  return (
    <ImmersiveScreen
      dark
      background={<BeadsArt className="absolute inset-x-0 bottom-0 h-[48%] opacity-55" />}
      backHref="/tools"
      title="السبحة"
      subtitle={`الجولات ${ar(rounds)} · الإجمالي ${ar(total)}`}
      alwaysShow
      bottom={
        <>
          <FloatingControl label="إعادة العدّ" onClick={() => setCount(0)}>
            <svg {...ico}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
          </FloatingControl>
          <FloatingControl label="زيادة واحد" onClick={tap}><span className="text-lg">+١</span></FloatingControl>
          <FloatingControl label="الأذكار المحفوظة" onClick={() => setSheet("presets")}>
            <svg {...ico}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </FloatingControl>
          <FloatingControl label="الإحصائيات" onClick={() => setSheet("stats")}>
            <svg {...ico}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
          </FloatingControl>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-24 pt-20">
        <p className="font-quran text-center text-4xl leading-[2] text-[var(--ivory)]" lang="ar">{active.text}</p>
        <button onClick={tap} aria-label={`اضغط للعدّ، الحالي ${count} من ${target}`} className="focus-ring rounded-full active:scale-[0.97]" style={{ transition: "transform .2s var(--ease-spring)" }}>
          <CircularCounter value={count} total={target} size={290} stroke={9} pulse={pulse}>
            <span className="font-display text-8xl leading-none tabular-nums text-[var(--ivory)]">{ar(count)}</span>
            <span className="mt-2 text-sm text-[var(--muted-on-night)]">من {ar(target)}</span>
          </CircularCounter>
        </button>
        <p className="text-xs text-[var(--muted-on-night)]">اضغط على الدائرة للعدّ</p>
      </div>

      <BottomSheet open={sheet === "presets"} onClose={() => setSheet(null)} title="اختر الذكر">
        <ul className="space-y-1">
          {all.map((p) => {
            const isPreset = PRESETS.some((x) => x.id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-2">
                <button onClick={() => { setSelectedId(p.id); setCount(0); setSheet(null); }} className={`pressable focus-ring flex flex-1 items-center justify-between rounded-2xl px-4 py-3 text-start ${p.id === selectedId ? "bg-gold/15 text-gold-bright" : "bg-white/[0.04]"}`}>
                  <span className="font-quran text-xl">{p.text}</span>
                  <span className="text-sm text-[var(--muted-on-night)]">{ar(p.target)}</span>
                </button>
                {!isPreset && <button onClick={() => deletePhrase(p.id)} aria-label="حذف" className="fcontrol focus-ring">×</button>}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex gap-2">
          <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="ذكر جديد" className="field" aria-label="نص الذكر" />
          <input type="number" min={1} value={newTarget} onChange={(e) => setNewTarget(Number(e.target.value))} className="field !w-24 text-center" aria-label="العدد" />
        </div>
        <button onClick={addPhrase} className="pressable focus-ring mt-3 h-12 w-full rounded-full bg-gradient-to-l from-gold-bright to-gold font-semibold text-[#1a1407]">إضافة</button>
      </BottomSheet>

      <BottomSheet open={sheet === "stats"} onClose={() => setSheet(null)} title="إحصائياتك">
        <dl className="grid grid-cols-2 gap-6 py-2 text-center">
          <div><dd className="font-display text-5xl text-gold-bright tabular-nums">{ar(rounds)}</dd><dt className="mt-1 text-sm text-[var(--muted-on-night)]">جولات هذه الجلسة</dt></div>
          <div><dd className="font-display text-5xl text-gold-bright tabular-nums">{ar(total)}</dd><dt className="mt-1 text-sm text-[var(--muted-on-night)]">إجمالي التسبيحات</dt></div>
        </dl>
        <button onClick={() => { resetAll(); setSheet(null); }} className="pressable focus-ring mt-6 h-12 w-full rounded-full bg-white/[0.07] text-[var(--ivory)]">تصفير كل العدّادات</button>
      </BottomSheet>
    </ImmersiveScreen>
  );
}
