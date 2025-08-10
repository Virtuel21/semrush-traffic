import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";

// Courbe CTR par défaut (moyennes secteur, éditables)
const defaultCtrCurve = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06, 6: 0.05, 7: 0.045, 8: 0.04,
  9: 0.036, 10: 0.032, 11: 0.028, 12: 0.025, 13: 0.023, 14: 0.021, 15: 0.019,
  16: 0.017, 17: 0.016, 18: 0.015, 19: 0.014, 20: 0.013,
};

function cleanNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = String(val).replace(/\s|\u00A0|€/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function inferColumn(columns, candidates) {
  const lower = columns.map((c) => c.toLowerCase());
  for (const cand of candidates) {
    const i = lower.indexOf(cand.toLowerCase());
    if (i !== -1) return columns[i];
  }
  return columns[0] || "";
}

function estimateClicks({ volume, position, trafficCol, ctrCurve }) {
  const vol = Math.max(0, volume || 0);
  if (trafficCol && trafficCol > 0) return Math.min(vol, trafficCol);
  const p = Math.max(1, Math.min(20, Math.round(position || 20)));
  const ctr = ctrCurve[p] ?? 0;
  return Math.min(vol, vol * ctr);
}

function estimateTargetClicks({ volume, targetPos, ctrCurve, uplift = 0 }) {
  const vol = Math.max(0, volume || 0);
  const p = Math.max(1, Math.min(20, targetPos || 1));
  const ctr = (ctrCurve[p] ?? 0) * (1 + uplift);
  return Math.min(vol, vol * ctr);
}

function exportToExcel({ rows, columns, filename = "incremental_traffic.xlsx" }) {
  const data = rows.map((r) => {
    const out = {};
    columns.forEach((col) => (out[col.label] = r[col.key]));
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, filename);
}

export default function App() {
  const [rawRows, setRawRows] = useState([]);
  const [columns, setColumns] = useState([]);

  const [mapKeyword, setMapKeyword] = useState("");
  const [mapPosition, setMapPosition] = useState("");
  const [mapVolume, setMapVolume] = useState("");
  const [mapTraffic, setMapTraffic] = useState("");

  const [ctrCurve, setCtrCurve] = useState({ ...defaultCtrCurve });
  const [upliftPct, setUpliftPct] = useState(0);
  const [minVolume, setMinVolume] = useState(10);
  const [maxPosition, setMaxPosition] = useState(50);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    setLoading(true);
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const cols = Object.keys(json[0] || {});
      if (!cols.length) throw new Error("Feuille vide ou en-têtes manquants");
      setRawRows(json);
      setColumns(cols);
      setMapKeyword(inferColumn(cols, ["Keyword", "Mot clé", "Requête", "Query"]));
      setMapPosition(inferColumn(cols, ["Position", "Pos", "Rank", "Ranking"]));
      setMapVolume(inferColumn(cols, ["Search Volume", "Volume de recherche", "Volume"]));
      setMapTraffic(inferColumn(cols, ["Traffic", "Trafic", "Clicks", "Clics"]));
    } catch (e) {
      setError(e?.message || "Erreur de lecture du fichier");
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    if (!rawRows.length || !mapKeyword || !mapPosition || !mapVolume) return [];
    return rawRows
      .map((r) => {
        const keyword = r[mapKeyword];
        const position = cleanNumber(r[mapPosition]);
        const volume = cleanNumber(r[mapVolume]);
        const trafficCol = cleanNumber(r[mapTraffic]);
        const currentClicks = estimateClicks({ volume, position, trafficCol, ctrCurve });
        const t1 = estimateTargetClicks({ volume, targetPos: 3, ctrCurve, uplift: upliftPct / 100 });
        const t2 = estimateTargetClicks({ volume, targetPos: 2, ctrCurve, uplift: upliftPct / 100 });
        const t3 = estimateTargetClicks({ volume, targetPos: 1, ctrCurve, uplift: upliftPct / 100 });
        return {
          keyword,
          position,
          volume,
          currentClicks,
          clicksP3: t1,
          clicksP2: t2,
          clicksP1: t3,
          incrP3: Math.max(0, t1 - currentClicks),
          incrP2: Math.max(0, t2 - currentClicks),
          incrP1: Math.max(0, t3 - currentClicks),
        };
      })
      .filter((r) => r?.keyword && r.volume >= minVolume && (r.position || 99) <= maxPosition)
      .sort((a, b) => b.incrP1 - a.incrP1);
  }, [rawRows, mapKeyword, mapPosition, mapVolume, mapTraffic, ctrCurve, upliftPct, minVolume, maxPosition]);

  const totals = useMemo(() => {
    const sum = (arr, key) => arr.reduce((acc, x) => acc + (x[key] || 0), 0);
    return {
      current: Math.round(sum(rows, "currentClicks")),
      p3: Math.round(sum(rows, "clicksP3")),
      p2: Math.round(sum(rows, "clicksP2")),
      p1: Math.round(sum(rows, "clicksP1")),
      incrP3: Math.round(sum(rows, "incrP3")),
      incrP2: Math.round(sum(rows, "incrP2")),
      incrP1: Math.round(sum(rows, "incrP1")),
    };
  }, [rows]);

  const handleCtrChange = (pos, value) => {
    const num = parseFloat(value);
    setCtrCurve((prev) => ({ ...prev, [pos]: Number.isFinite(num) ? num : 0 }));
  };

  return (
    <div className="min-h-screen w-full p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />Importer un export SEMrush
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {loading && <div className="text-sm text-slate-500">Chargement…</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}

            {columns.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <label className="text-xs">Colonne Requête
                  <select
                    className="w-full mt-1 p-2 rounded border"
                    value={mapKeyword}
                    onChange={(e) => setMapKeyword(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">Colonne Position
                  <select
                    className="w-full mt-1 p-2 rounded border"
                    value={mapPosition}
                    onChange={(e) => setMapPosition(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">Colonne Volume
                  <select
                    className="w-full mt-1 p-2 rounded border"
                    value={mapVolume}
                    onChange={(e) => setMapVolume(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">Colonne Trafic (optionnel)
                  <select
                    className="w-full mt-1 p-2 rounded border"
                    value={mapTraffic}
                    onChange={(e) => setMapTraffic(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {columns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Courbe de CTR (éditable)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((pos) => (
                  <div key={pos} className="p-3 rounded-xl border bg-white">
                    <div className="text-xs text-slate-500">Position {pos}</div>
                    <Input
                      type="number"
                      step="0.001"
                      value={ctrCurve[pos] ?? 0}
                      onChange={(e) => handleCtrChange(pos, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">Astuce : 0.28 = 28% de CTR.</div>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résultats & Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="text-xs">Volume minimal
                  <Input
                    type="number"
                    value={minVolume}
                    onChange={(e) => setMinVolume(cleanNumber(e.target.value))}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs">Position max
                  <Input
                    type="number"
                    value={maxPosition}
                    onChange={(e) => setMaxPosition(cleanNumber(e.target.value))}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs">Uplift CTR (%)
                  <Input
                    type="number"
                    value={upliftPct}
                    onChange={(e) => setUpliftPct(cleanNumber(e.target.value))}
                    className="mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-100">
                  <div className="text-xs text-slate-500">Clics actuels (estimés)</div>
                  <div className="text-xl font-semibold">{totals.current.toLocaleString("fr-FR")}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100">
                  <div className="text-xs text-slate-500">Incrémental jusqu'à P3</div>
                  <div className="text-xl font-semibold">{totals.incrP3.toLocaleString("fr-FR")}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100">
                  <div className="text-xs text-slate-500">Incrémental jusqu'à P1</div>
                  <div className="text-xl font-semibold">{totals.incrP1.toLocaleString("fr-FR")}</div>
                </div>
              </div>

              <Button
                onClick={() =>
                  exportToExcel({
                    rows,
                    columns: [
                      { key: "keyword", label: "Requête" },
                      { key: "position", label: "Position" },
                      { key: "volume", label: "Volume" },
                      { key: "currentClicks", label: "Clics actuels (estimés)" },
                      { key: "clicksP3", label: "Clics à P3" },
                      { key: "clicksP2", label: "Clics à P2" },
                      { key: "clicksP1", label: "Clics à P1" },
                      { key: "incrP3", label: "Incrémental P3" },
                      { key: "incrP2", label: "Incrémental P2" },
                      { key: "incrP1", label: "Incrémental P1" },
                    ],
                    filename: "incremental_traffic.xlsx",
                  })
                }
              >
                <Download className="w-4 h-4 mr-2" />Exporter Excel
              </Button>

              <div className="overflow-auto rounded-2xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 text-left">Requête</th>
                      <th className="p-2 text-right">Pos</th>
                      <th className="p-2 text-right">Vol</th>
                      <th className="p-2 text-right">Clics actuels</th>
                      <th className="p-2 text-right">Clics à P3</th>
                      <th className="p-2 text-right">Clics à P2</th>
                      <th className="p-2 text-right">Clics à P1</th>
                      <th className="p-2 text-right">Incr. P3</th>
                      <th className="p-2 text-right">Incr. P2</th>
                      <th className="p-2 text-right">Incr. P1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 2000).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{r.keyword}</td>
                        <td className="p-2 text-right">{r.position}</td>
                        <td className="p-2 text-right">{r.volume.toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right">{Math.round(r.currentClicks).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right">{Math.round(r.clicksP3).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right">{Math.round(r.clicksP2).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right">{Math.round(r.clicksP1).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right font-medium">{Math.round(r.incrP3).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right font-medium">{Math.round(r.incrP2).toLocaleString("fr-FR")}</td>
                        <td className="p-2 text-right font-semibold">{Math.round(r.incrP1).toLocaleString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
