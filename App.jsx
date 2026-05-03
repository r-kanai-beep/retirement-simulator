import { useState, useMemo } from "react";

const DEFAULT = {
  fatherAge: 79,
  motherAge: 76,
  fatherPension: 20, // 万円/月
  motherPension: 11,
  facilityFatherStart: 85, // 父が施設入居する年齢
  facilityCostFather: 20, // 万円/月
  facilityCostMother: 20,
  motherEndAge: 100,
  fatherEndAge: 95, // 父が亡くなる想定年齢（シミュレーション用）
  survivorPensionRatio: 0.75, // 遺族厚生年金（父の厚生年金の3/4相当）
  savings: 0, // 預金（万円）
  stocks: 0, // 株（万円）
  landValue: 2000, // 土地（万円）
  useLand: true,
};

function formatMan(value) {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}億円`;
  return `${Math.round(value).toLocaleString()}万円`;
}

export default function App() {
  const [p, setP] = useState(DEFAULT);
  const [showAssets, setShowAssets] = useState(false);

  const set = (key, val) => setP((prev) => ({ ...prev, [key]: Number(val) }));
  const toggle = (key) => setP((prev) => ({ ...prev, [key]: !prev[key] }));

  const sim = useMemo(() => {
    const now = new Date().getFullYear();
    const fatherBirth = now - p.fatherAge;
    const motherBirth = now - p.motherAge;

    let balance = (p.savings + p.stocks + (p.useLand ? p.landValue : 0));
    const yearlyData = [];

    // Phase analysis
    // Phase 1: Both alive, father not in facility
    // Phase 2: Father in facility (age 85+), both alive
    // Phase 3: Father deceased, mother alone in facility
    // We assume father dies at fatherEndAge

    for (let fAge = p.fatherAge; fAge <= p.motherEndAge - (p.motherAge - p.fatherAge); fAge++) {
      const mAge = fAge - (p.fatherAge - p.motherAge);
      if (mAge > p.motherEndAge) break;

      const year = now + (fAge - p.fatherAge);
      const fatherAlive = fAge <= p.fatherEndAge;
      const fatherInFacility = fAge >= p.facilityFatherStart && fatherAlive;
      const motherInFacility = mAge >= 82; // assume mother already in facility (80歳から)

      // Income
      let income = 0;
      if (fatherAlive) income += p.fatherPension;
      // mother pension: if father alive = her own; if father dead = her own + survivor
      if (!fatherAlive) {
        const survivorAmount = p.fatherPension * p.survivorPensionRatio * 0.6; // 遺族厚生年金は父の厚生年金部分の3/4
        income += p.motherPension + survivorAmount;
      } else {
        income += p.motherPension;
      }

      // Expense
      let expense = 0;
      if (fatherInFacility) expense += p.facilityCostFather;
      if (motherInFacility) expense += p.facilityCostMother;
      // 生活費（施設外）
      if (!fatherInFacility && fatherAlive) expense += 15; // 二人暮らし生活費
      else if (fatherAlive && fatherInFacility && !motherInFacility) expense += 10;
      else if (!fatherAlive && !motherInFacility) expense += 8;

      const monthly_surplus = income - expense;
      const yearly_surplus = monthly_surplus * 12;
      balance += yearly_surplus;

      yearlyData.push({
        year,
        fAge,
        mAge,
        fatherAlive,
        fatherInFacility,
        motherInFacility,
        income,
        expense,
        monthly_surplus,
        yearly_surplus,
        balance,
        phase: !fatherAlive
          ? "母のみ"
          : fatherInFacility
          ? "二人施設"
          : "施設前",
      });
    }

    // Summary
    const minBalance = Math.min(...yearlyData.map((d) => d.balance));
    const finalBalance = yearlyData[yearlyData.length - 1]?.balance ?? 0;
    const requiredAsset = minBalance < 0 ? -minBalance : 0;
    const isOk = minBalance >= 0;

    // Find when money runs out
    const ruinYear = yearlyData.find((d) => d.balance < 0);

    return { yearlyData, minBalance, finalBalance, requiredAsset, isOk, ruinYear };
  }, [p]);

  const phaseColor = {
    施設前: "#4ade80",
    二人施設: "#facc15",
    母のみ: "#f87171",
  };

  // Chart: balance over years (simplified bar)
  const maxAbs = Math.max(
    ...sim.yearlyData.map((d) => Math.abs(d.balance)),
    1
  );

  return (
    <div style={{ fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", background: "#0f1117", minHeight: "100vh", color: "#e2e8f0", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Family Finance Simulation</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ご両親 老後資金シミュレーター
        </h1>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>預金・株ゼロベース ／ 土地資産は後から追加可能</p>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Result Banner */}
        <div style={{
          borderRadius: 16,
          padding: "20px 24px",
          background: sim.isOk
            ? "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.08))"
            : "linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.08))",
          border: `1px solid ${sim.isOk ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
        }}>
          <div style={{ fontSize: 11, color: sim.isOk ? "#4ade80" : "#f87171", letterSpacing: 2, marginBottom: 8 }}>
            {sim.isOk ? "✓ SAFE — 資金は持続します" : "⚠ ALERT — 資金不足が発生します"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>最低残高</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sim.minBalance >= 0 ? "#4ade80" : "#f87171" }}>
                {formatMan(sim.minBalance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>100歳時点残高</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sim.finalBalance >= 0 ? "#60a5fa" : "#f87171" }}>
                {formatMan(sim.finalBalance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
                {sim.isOk ? "余裕額" : "必要追加資産"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sim.isOk ? "#a78bfa" : "#fb923c" }}>
                {sim.isOk ? formatMan(sim.minBalance) : formatMan(sim.requiredAsset)}
              </div>
            </div>
          </div>
          {!sim.isOk && sim.ruinYear && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#fb923c", background: "rgba(251,146,60,0.1)", borderRadius: 8, padding: "8px 12px" }}>
              ⚡ お母様 {sim.ruinYear.mAge}歳（{sim.ruinYear.year}年）頃に残高がマイナスになります
            </div>
          )}
        </div>

        {/* Parameters */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, marginBottom: 16 }}>PARAMETERS — 前提条件</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "お父様の現在年齢", key: "fatherAge", unit: "歳", min: 70, max: 90 },
              { label: "お母様の現在年齢", key: "motherAge", unit: "歳", min: 65, max: 90 },
              { label: "お父様の年金額", key: "fatherPension", unit: "万円/月", min: 10, max: 30 },
              { label: "お母様の年金額", key: "motherPension", unit: "万円/月", min: 5, max: 20 },
              { label: "お父様の施設入居年齢", key: "facilityFatherStart", unit: "歳", min: 80, max: 95 },
              { label: "施設費用（父）", key: "facilityCostFather", unit: "万円/月", min: 10, max: 40 },
              { label: "施設費用（母）", key: "facilityCostMother", unit: "万円/月", min: 10, max: 40 },
              { label: "お父様の想定寿命", key: "fatherEndAge", unit: "歳", min: 80, max: 100 },
            ].map(({ label, key, unit, min, max }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range" min={min} max={max} value={p[key]}
                    onChange={(e) => set(key, e.target.value)}
                    style={{ flex: 1, accentColor: "#60a5fa" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", minWidth: 60, textAlign: "right" }}>
                    {p[key]}{unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Input */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3 }}>ASSETS — 資産（後から追加）</div>
            <button
              onClick={() => setShowAssets(!showAssets)}
              style={{ fontSize: 11, color: "#60a5fa", background: "none", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              {showAssets ? "閉じる" : "入力する ▼"}
            </button>
          </div>

          {/* Always show land toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAssets ? 12 : 0 }}>
            <div>
              <div style={{ fontSize: 13, color: "#e2e8f0" }}>土地・不動産</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>売却して充当する場合</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => toggle("useLand")}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                  background: p.useLand ? "#60a5fa" : "#374151",
                  position: "relative", transition: "background 0.2s"
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: p.useLand ? 20 : 3,
                  width: 16, height: 16, borderRadius: "50%", background: "white",
                  transition: "left 0.2s"
                }} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: p.useLand ? "#4ade80" : "#64748b" }}>
                {formatMan(p.landValue)}
              </span>
            </div>
          </div>

          {showAssets && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "預金", key: "savings", icon: "🏦" },
                { label: "株式", key: "stocks", icon: "📈" },
                { label: "土地評価額", key: "landValue", icon: "🏠" },
              ].map(({ label, key, icon }) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{icon} {label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number" value={p[key]} min={0} step={100}
                      onChange={(e) => set(key, e.target.value)}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#e2e8f0", fontSize: 14, fontWeight: 700
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>万円</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase Timeline Chart */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, marginBottom: 16 }}>BALANCE CHART — 残高推移</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            {Object.entries(phaseColor).map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 120, overflowX: "auto", paddingBottom: 4 }}>
            {sim.yearlyData.map((d, i) => {
              const heightPct = Math.abs(d.balance) / maxAbs;
              const isNeg = d.balance < 0;
              const color = phaseColor[d.phase] ?? "#60a5fa";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: 14 }}>
                  <div
                    title={`${d.year}年 父${d.fAge}歳 母${d.mAge}歳\n残高: ${formatMan(d.balance)}\n収入: ${d.income}万/月 支出: ${d.expense}万/月`}
                    style={{
                      width: "100%",
                      height: Math.max(4, heightPct * 100),
                      background: isNeg ? "#ef4444" : color,
                      borderRadius: 3,
                      opacity: 0.85,
                      cursor: "pointer",
                      transition: "opacity 0.1s",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#475569" }}>
            <span>現在（父{p.fatherAge}歳）</span>
            <span>母100歳</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>※ 各バーにカーソルを合わせると詳細が表示されます</div>
        </div>

        {/* Year-by-Year Table (condensed) */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, marginBottom: 16 }}>KEY PHASES — フェーズ別サマリー</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["フェーズ", "父の年齢", "母の年齢", "月収入", "月支出", "月収支", "年末残高"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sim.yearlyData
                  .filter((d, i) => {
                    // Show phase transitions + every 5 years
                    const prev = sim.yearlyData[i - 1];
                    const phaseChange = !prev || prev.phase !== d.phase;
                    return phaseChange || d.fAge % 5 === 0;
                  })
                  .map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11,
                          background: `${phaseColor[d.phase]}22`,
                          color: phaseColor[d.phase]
                        }}>{d.phase}</span>
                      </td>
                      <td style={{ padding: "8px", color: d.fatherAlive ? "#e2e8f0" : "#475569" }}>
                        {d.fatherAlive ? `${d.fAge}歳` : "故人"}
                      </td>
                      <td style={{ padding: "8px" }}>{d.mAge}歳</td>
                      <td style={{ padding: "8px", color: "#4ade80" }}>{d.income}万円</td>
                      <td style={{ padding: "8px", color: "#f87171" }}>{d.expense}万円</td>
                      <td style={{ padding: "8px", fontWeight: 700, color: d.monthly_surplus >= 0 ? "#4ade80" : "#f87171" }}>
                        {d.monthly_surplus >= 0 ? "+" : ""}{d.monthly_surplus}万円
                      </td>
                      <td style={{ padding: "8px", fontWeight: 700, color: d.balance >= 0 ? "#60a5fa" : "#f87171" }}>
                        {formatMan(d.balance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advice */}
        <div style={{ borderRadius: 16, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 3, marginBottom: 12 }}>INSIGHT — 現状分析</div>
          <div style={{ fontSize: 13, lineHeight: 1.9, color: "#cbd5e1" }}>
            {sim.isOk ? (
              <>
                <p style={{ margin: "0 0 8px" }}>✅ <strong style={{ color: "#4ade80" }}>現在の設定では資金は100歳まで持続します。</strong></p>
                <p style={{ margin: "0 0 8px" }}>最低残高は {formatMan(sim.minBalance)} で、お母様の晩年が最も資金的に厳しい時期となります。</p>
                <p style={{ margin: 0 }}>預金・株を追加入力することで、さらに正確な全体像が把握できます。</p>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 8px" }}>⚠️ <strong style={{ color: "#f87171" }}>現在の設定では資金が不足します。</strong></p>
                <p style={{ margin: "0 0 8px" }}>100歳まで安心して過ごすには、追加で <strong style={{ color: "#fb923c" }}>{formatMan(sim.requiredAsset)}</strong> の資産が必要です。</p>
                <p style={{ margin: 0 }}>
                  {sim.requiredAsset <= 2000
                    ? `土地（${formatMan(p.landValue)}）を活用することで、不足分をカバーできます。`
                    : `土地の活用に加え、預金・株などの資産確認が重要です。`}
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
