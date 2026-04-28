import { useState } from "react";
function formatInput(val){
  const number = val.replace(/[^0-9]/g, "");
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(val){
  return Number((val || "").toString().replace(/\./g, ""));
}

function formatRupiah(n){
  return (Number(n)||0).toLocaleString('id-ID');
}

function calculateMargin(p) {
  const price = parseNumber(p.price) || 0;
  const profit = parseNumber(p.profit) || 0;
  if (!price) return 0;
  return (profit / price) * 100;
}

export default function AOVTool() {
    const [business, setBusiness] = useState({ name: "", type: "" });
  const [products, setProducts] = useState([{ name: "", price: "", profit: "" }]);
  const [target, setTarget] = useState("");
  const [aovCalc, setAovCalc] = useState({ revenue: "", orders: "" });
  const [savedScenarios, setSavedScenarios] = useState([]);

  const addProduct = () => setProducts([...products, { name: "", price: "", profit: "" }]);

  const resetAll = () => {
    setBusiness({ name: "", type: "" });
    setProducts([{ name: "", price: "", profit: "" }]);
    setTarget("");
    setAovCalc({ revenue: "", orders: "" });
  };

  const saveScenario = () => {
    const snapshot = {
      business,
      products,
      target,
      aovCalc,
      result
    };
    setSavedScenarios([snapshot, ...savedScenarios]);
  };

  const downloadPDF = () => {
    if (!result) return;

    const html = `
      <html>
      <head>
        <title>AOV Strategy Report</title>
        <style>
          body { font-family: Inter, Arial; padding:24px; color:#111; }
          .header { display:flex; justify-content:space-between; align-items:flex-end; }
          .title { font-size:24px; font-weight:800; }
          .sub { font-size:12px; color:#666; }
          .badge { font-size:11px; padding:4px 8px; border-radius:999px; border:1px solid #ddd; }
          .section { margin-top:20px; }
          .card { border:1px solid #e5e7eb; padding:14px; border-radius:10px; }
          .label { font-size:11px; color:#888; letter-spacing:.08em; }
          .h { font-size:14px; font-weight:700; margin-top:6px; }
          .muted { color:#6b7280; font-size:12px; }
          .green { color:#065f46; }
          .divider { height:1px; background:#eee; margin:12px 0; }
          ul { padding-left:18px; margin:0; }
          li { margin-bottom:6px; }
          table { width:100%; border-collapse:collapse; margin-top:8px; }
          th, td { border:1px solid #e5e7eb; padding:8px; font-size:12px; text-align:left; }
          th { background:#f9fafb; }
          .best { border:1px solid #16a34a; }
          .best th, .best td { background:#ecfdf5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">AOV Strategy Report</div>
            <div class="sub">${business.name || "Bisnis"}</div>
            <div class="sub">${new Date().toLocaleDateString('id-ID')}</div>
          </div>
          <div class="badge">${(result.recommended?.type||'').toUpperCase()}</div>
        </div>

        <div class="section">
          <div class="card">
            <div class="label">EXECUTIVE SUMMARY</div>
            <div class="h" style="font-size:16px;">
              Fokus: ${(result.recommended?.type||'').toUpperCase()} untuk nutup gap Rp ${formatRupiah(result.gap || 0)}
            </div>
            <div class="muted">${result.recommended?.reason || ''}</div>
            <div style="margin-top:6px;"><b>Impact:</b> +Rp ${formatRupiah(result.impact || 0)} / transaksi</div>
            <div class="muted" style="margin-top:4px;">${result.urgency || ''}</div>
            <div class="divider"></div>
            <div class="label">INSIGHT</div>
            <div class="h">Strategi Utama</div>
            <div class="green">${result.recommended?.reason || ''}</div>
            <div style="margin-top:8px; line-height:1.6;">
              ${(result.insight || '').replace(/\n/g,'<br/>')}
            </div>
            <div class="divider"></div>
            <div class="label">ACTION PLAN</div>
            <ul>
              ${(result.priority||[]).map(p=>`<li>${p}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="card">
            <div class="label">BREAKDOWN</div>
            <ul>
              ${(result.breakdown||[]).map(b=>`<li>${b}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="card">
            <div class="label">NEXT ACTION</div>
            <ul>
              ${(result.nextActions||[]).map(a=>`<li>✔ ${a}</li>`).join('')}
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const updateProduct = (i, key, value) => {
    const newProducts = [...products];
    if (key === 'price' || key === 'profit') {
      newProducts[i][key] = formatInput(value);
    } else {
      newProducts[i][key] = value;
    }
    setProducts(newProducts);
  };

  const calculateAOV = () => {
    const rev = parseNumber(aovCalc.revenue);
    const ord = parseNumber(aovCalc.orders);
    if (!rev || !ord) return 0;
    return Math.round(rev / ord);
  };

  const generate = () => {
    const targetAov = parseNumber(target);
    const currentAov = calculateAOV() || parseNumber(products[0]?.price);
    if (!currentAov || !targetAov) return null;

    const gap = targetAov - currentAov;

    const enriched = products.map(p => ({ ...p, margin: calculateMargin(p) }));
    const main = [...enriched].sort((a,b)=>b.margin-a.margin)[0];

    const base = parseNumber(main.price);
    const premium = Math.round(base * 1.4);

    let bestBundle = null;
    const valid = products.filter(p => parseNumber(p.price) && parseNumber(p.profit));

    for (let i=0;i<valid.length;i++){
      for (let j=i+1;j<valid.length;j++){
        const p1=valid[i];
        const p2=valid[j];
        const price=Math.round((parseNumber(p1.price)+parseNumber(p2.price))*0.9);
        const totalCost = (parseNumber(p1.price) - parseNumber(p1.profit)) + (parseNumber(p2.price) - parseNumber(p2.profit));
        const profit = price - totalCost;
        if(!bestBundle||profit>bestBundle.profit){
          const revenue = price;
        const marginPct = revenue ? (profit / revenue) * 100 : 0;
        const health = marginPct >= 30 ? "Sehat" : marginPct >= 15 ? "Cukup" : "Tipis";
        bestBundle={label:`${p1.name} + ${p2.name}`,price,profit,marginPct,health};
        }
      }
    }

    const sims=[];
    const upsellValue = base * 0.3;
    const upgradeValue = premium - base;

    const upsellStatus = upsellValue <= 0 ? "bad" : (upsellValue >= gap ? "good" : "medium");
    const upgradeStatus = upgradeValue <= 0 ? "bad" : (upgradeValue >= gap ? "good" : "medium");

    sims.push({type:"upsell",label:"Upsell",aov:currentAov+upsellValue,delta:upsellValue,status:upsellStatus});
    sims.push({type:"upgrade",label:"Upgrade",aov:currentAov+upgradeValue,delta:upgradeValue,status:upgradeStatus});

    if(bestBundle){
      const bundleIncrease = bestBundle.price - currentAov;
      let bundleStatus = "bad";
      if(bundleIncrease > 0){
        bundleStatus = bestBundle.health === "Sehat" ? "good" : bestBundle.health === "Cukup" ? "medium" : "bad";
      }
      sims.push({type:"bundle",label:"Bundle",aov:bestBundle.price,profit:bestBundle.profit,marginPct:bestBundle.marginPct,health:bestBundle.health,status:bundleStatus});
    }

    const bestAOV=sims.reduce((a,b)=>!a||b.aov>a.aov?b:a,null);
    const bestProfit=sims.reduce((a,b)=>!a||(b.profit||0)>(a.profit||0)?b:a,null);

    let recommended = null;
    if (bestBundle && bestBundle.health !== "Tipis") {
      recommended = { type: "bundle", reason: "Profit tinggi & margin sehat" };
    } else if (upgradeValue >= upsellValue) {
      recommended = { type: "upgrade", reason: "Kenaikan per transaksi lebih besar" };
    } else {
      recommended = { type: "upsell", reason: "Paling mudah dieksekusi cepat" };
    }

    const breakdown = [];
    if (gap > 0) {
      const upsellCount = upsellValue > 0 ? Math.ceil(gap / upsellValue) : 0;
      const upgradeCount = upgradeValue > 0 ? Math.ceil(gap / upgradeValue) : 0;

      breakdown.push(`Target AOV: Rp ${formatRupiah(targetAov)} (sekarang Rp ${formatRupiah(currentAov)})`);

      if (upsellValue > 0) {
        breakdown.push(`🟡 Upsell: tawarkan produk tambahan di setiap transaksi. Rata-rata menambah Rp ${formatRupiah(Math.round(upsellValue))}. Untuk mengejar target, butuh sekitar ${upsellCount} transaksi yang berhasil upsell.`);
      }

      if (upgradeValue > 0) {
        breakdown.push(`🔵 Upgrade: arahkan pembeli ke versi yang lebih mahal. Rata-rata menambah Rp ${formatRupiah(Math.round(upgradeValue))}. Untuk mengejar target, butuh sekitar ${upgradeCount} transaksi upgrade.`);
      }

      if (bestBundle) {
        const bundleIncrease = bestBundle.price - currentAov;
        if (bundleIncrease > 0) {
          breakdown.push(`🟣 Bundle: gabungkan beberapa produk jadi satu paket. Rata-rata menambah Rp ${formatRupiah(Math.round(bundleIncrease))} per transaksi, sehingga AOV mendekati Rp ${formatRupiah(bestBundle.price)}.`);
        } else {
          breakdown.push(`🟣 Bundle: saat ini kurang efektif karena justru menurunkan nilai transaksi. Perlu revisi harga atau komposisi bundle.`);
        }
      }
    }

    const nextActions = [];

    const otherProducts = valid.filter(p => p.name !== main.name);
    const upsellProduct = otherProducts[0];

    if (business.type === "jasa") {
      nextActions.push(`Buat paket premium dari ${main.name}`);
      if (upsellProduct) nextActions.push(`Tambahkan ${upsellProduct.name} sebagai add-on`);
    } else {
      if (upsellProduct) nextActions.push(`Upsell ${upsellProduct.name} saat beli ${main.name}`);
      if (bestBundle) nextActions.push(`Bundle ${bestBundle.label}`);
    }

    // 🔥 INSIGHT MULTI-STRATEGY (UPGRADE)
    let insight = "";
    let combos = [];

    if (gap <= 0) {
      insight = "AOV sudah mencapai target. Fokus ke scaling (traffic atau repeat order).";
    } else {
      const upsellImpact = upsellValue;
      const upgradeImpact = upgradeValue;

      // kombinasi strategi
      if (upsellImpact > 0 && upgradeImpact > 0) {
        combos.push(`Gabungkan upsell + upgrade → cepat naik tanpa terlalu agresif`);
      }

      if (bestBundle && bestBundle.health !== "Tipis") {
        combos.push(`Gunakan bundle sebagai lonjakan AOV besar di momen tertentu`);
      }

      if (recommended?.type === "upgrade") {
        insight = `Fokus utama: upgrade karena paling cepat menutup gap Rp ${formatRupiah(gap)}.`;
      } else if (recommended?.type === "bundle") {
        insight = `Fokus utama: bundle untuk lonjakan AOV signifikan dengan margin tetap aman.`;
      } else {
        insight = `Fokus utama: upsell karena paling mudah diterapkan di setiap transaksi.`;
      }

      if (combos.length > 0) {
        insight += `
Strategi kombinasi: ${combos.join(", ")}`;
      }
    }

    const priority = [];

    if (recommended?.type === "bundle") {
      priority.push("Bangun bundle dengan value jelas (hemat + praktis)");
      priority.push("Jaga margin minimal 20% agar tetap sehat");
    }

    if (recommended?.type === "upgrade") {
      priority.push("Buat paket premium dengan benefit jelas");
      priority.push("Gunakan perbandingan (basic vs premium)");
    }

    if (recommended?.type === "upsell") {
      priority.push("Gunakan script upsell di setiap transaksi");
      priority.push("Fokus pada add-on murah & cepat diputuskan");
    }

    // impact & urgency
    const impactValue = recommended?.type === 'bundle' && bestBundle
      ? (bestBundle.price - currentAov)
      : recommended?.type === 'upgrade'
        ? (upgradeValue)
        : (upsellValue);

    const impact = Math.max(0, Math.round(impactValue || 0));

    const urgency = gap > 0
      ? `Bisa mulai hari ini: targetkan kenaikan ±Rp ${formatRupiah(impact)} per transaksi untuk mengejar gap Rp ${formatRupiah(gap)}.`
      : `Target tercapai. Fokus ke scaling (traffic / repeat order).`;

    return { main, sims, bestAOV, bestProfit, bestBundle, gap, breakdown, nextActions, recommended, insight, priority, impact, urgency };
  };

  const result = generate();

  return (
    <>
    <style>{`@media print {
      body { background: white; color: black; }
      button { display: none !important; }
    }`}</style>
    <div id="app-area" style={appStyle}>
      <div style={containerStyle}>

        <div style={{ textAlign:"center" }}>
          <h1 style={titleStyle}>AOV Booster</h1>
          <p style={subtitleStyle}>Naikkan omzet per transaksi tanpa nambah traffic</p>
          <div style={{display:"flex", gap:"8px", justifyContent:"center", marginTop:"10px"}}>
            <button onClick={resetAll} style={{fontSize:"12px", background:"transparent", color:"#aaa", border:"1px solid #333", padding:"6px 10px", borderRadius:"6px", cursor:"pointer"}}>
              Reset
            </button>
            <button onClick={downloadPDF} style={{fontSize:"12px", background:"#222", color:"#fff", border:"1px solid #333", padding:"6px 10px", borderRadius:"6px", cursor:"pointer"}}>
              Download PDF
            </button>
          </div>
        </div>

        
        <div style={cardStyle}>
          <p style={sectionTitle}>Progress</p>
          <p style={{fontSize:"12px", color:"#888", marginBottom:"10px"}}>
            Isi dari kiri ke kanan: mulai dari info bisnis sampai target, lalu lihat hasil di bawah
          </p>

          <div style={progressContainer}>
            {[
              {label:"Info", done: business.name && business.type},
              {label:"Omzet", done: aovCalc.revenue && aovCalc.orders},
              {label:"Produk", done: products.some(p=>p.name && p.price && p.profit)},
              {label:"Target", done: target},
              {label:"Hasil", done: result}
            ].map((step,i)=>(
              <div key={i} style={{flex:1, textAlign:"center"}}>
                <div style={{
                  width:"28px",
                  height:"28px",
                  borderRadius:"50%",
                  margin:"0 auto",
                  background: step.done ? "#22c55e" : "#333",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontSize:"12px"
                }}>
                  {i+1}
                </div>
                <p style={{fontSize:"11px", color:"#aaa", marginTop:"4px"}}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Info Bisnis</p>
          <label style={label}>Nama Bisnis</label>
          <input placeholder="Contoh: Kedai Kopi Senja" style={inputStyle} value={business.name} onChange={e=>setBusiness({...business,name:e.target.value})}/>

          <label style={label}>Jenis</label>
          <select style={inputStyle} value={business.type} onChange={e=>setBusiness({...business,type:e.target.value})}>
            <option value="">Pilih</option>
            <option value="produk">Produk</option>
            <option value="jasa">Jasa</option>
          </select>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Data AOV</p>
          <label style={label}>Omzet (per bulan)</label>
          <input placeholder="Contoh: 10.000.000" style={inputStyle} value={aovCalc.revenue} onChange={e=>setAovCalc({...aovCalc,revenue:formatInput(e.target.value)})}/>

          <label style={label}>Jumlah Transaksi</label>
          <input placeholder="Contoh: 200" style={inputStyle} value={aovCalc.orders} onChange={e=>setAovCalc({...aovCalc,orders:formatInput(e.target.value)})}/>

          <p style={{ marginTop:"6px" }}><b>AOV:</b> Rp {formatRupiah(calculateAOV())}</p>
        </div>

        {savedScenarios.length > 0 && (
          <div style={cardStyle}>
            <p style={sectionTitle}>Riwayat Skenario</p>
            {savedScenarios.map((s,i)=>(
              <div key={i} style={{marginBottom:"8px", fontSize:"12px", borderBottom:"1px solid #222", paddingBottom:"6px"}}>
                <p><b>{s.business.name || 'Tanpa Nama'}</b></p>
                <p>AOV Target: Rp {formatRupiah(parseNumber(s.target))}</p>
              </div>
            ))}
          </div>
        )}

        <div style={cardStyle}>
          <p style={sectionTitle}>Produk / Jasa</p>
          {products.map((p,i)=>(
            <div key={i} style={productCard}>
              <input placeholder="Nama produk" style={inputStyle} value={p.name} onChange={e=>updateProduct(i,'name',e.target.value)} />
              <input placeholder="Harga" style={inputStyle} value={p.price} onChange={e=>updateProduct(i,'price',e.target.value)} />
              <input placeholder="Profit" style={inputStyle} value={p.profit} onChange={e=>updateProduct(i,'profit',e.target.value)} />
            </div>
          ))}
          <button style={buttonStyle} onClick={addProduct}>+ Tambah Produk</button>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Target AOV</p>
          <input placeholder="Contoh: 50.000" style={inputStyle} value={target} onChange={e=>setTarget(formatInput(e.target.value))} />
        </div>

        {result && (
          <div style={cardStyle}>
            <h2 style={{textAlign:"center", marginBottom:"12px"}}>HASIL STRATEGI AOV</h2>

            <table style={{width:"100%", borderCollapse:"collapse", fontSize:"12px"}}>
              <thead>
                <tr style={{background:"#222"}}>
                  <th style={th}>Teknik</th>
                  <th style={th}>Penjelasan Singkat</th>
                  <th style={th}>Contoh Nyata</th>
                  <th style={th}>Estimasi</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const isJasa = business.type === 'jasa';

                  const getExample = (key) => {
                    const mainName = result.main?.name || (isJasa ? 'kelas / program' : 'produk utama');
                    const addOn = products[1]?.name || (isJasa ? 'rekaman + modul + konsultasi' : 'item kecil');

                    const map = {
                      addon: isJasa
                        ? `Saat closing ${mainName}, tawarkan upgrade bernilai seperti ${addOn}: "Kalau mau hasil lebih maksimal, biasanya ambil versi plus yang sudah termasuk ${addOn}"`
                        : `Saat beli ${mainName}, tawarkan ${addOn}: "Sekalian tambah ini biar lebih lengkap?"`,

                      threshold: isJasa
                        ? `Naikkan ke paket lebih tinggi: "Kalau sekalian upgrade, sudah termasuk ${addOn} dan lebih hemat dibanding ambil terpisah"`
                        : `Naikkan ke Rp ${formatRupiah(Math.round((parseNumber(products[0]?.price)||0)*1.5 || 20000))}: "Tambah sedikit dapat ${addOn}"`,

                      anchoring: isJasa
                        ? `Susun paket: Basic (live), Standard (+rekaman), Premium (+mentoring). Fokus arahkan ke Standard sebagai pilihan paling rasional`
                        : `Buat 3 versi: kecil, sedang, besar. Dorong ke versi sedang`,

                      scarcity: isJasa
                        ? `"Batch terbatas: ${mainName} + bonus ${addOn} hanya untuk 20 peserta. Setelah itu harga normal"`
                        : `Hari ini saja: beli ${mainName} dapat ${addOn} (20 pembeli pertama)`
                    };

                    return map[key];
                  };

                  const rows = [
                    {
                      name: 'Natural Add-On',
                      key: 'addon',
                      desc: 'Tambah item kecil saat customer sudah mau bayar',
                      example: getExample('addon'),
                      est: '+Rp 2.000 – 5.000'
                    },
                    {
                      name: 'Threshold Bonus',
                      key: 'threshold',
                      desc: 'Dorong belanja naik sedikit dengan bonus ambang',
                      example: getExample('threshold'),
                      est: '+Rp 5.000 – 8.000'
                    },
                    {
                      name: 'Anchoring',
                      key: 'anchoring',
                      desc: 'Tampilkan opsi mahal agar opsi tengah terlihat worth it',
                      example: getExample('anchoring'),
                      est: '+Rp 5.000 – 10.000'
                    },
                    {
                      name: 'Scarcity + Value',
                      key: 'scarcity',
                      desc: 'Tambahkan urgensi + bonus terbatas',
                      example: getExample('scarcity'),
                      est: '+Rp 5.000 – 8.000'
                    },
                    {
                      name: 'Bundle',
                      key: 'bundle',
                      desc: 'Gabungkan produk jadi paket lebih menarik',
                      example: result.bestBundle
                        ? `Paket ${result.bestBundle.label} Rp ${formatRupiah(result.bestBundle.price)}`
                        : isJasa
                          ? 'Gabungkan layanan jadi paket premium'
                          : 'Gabungkan produk jadi paket hemat',
                      est: result.bestBundle ? `Rp ${formatRupiah(result.bestBundle.price)}` : '-'
                    }
                  ];

                  return rows.map((r,i)=> {
                    const isBest = result.recommended?.type === r.key;
                    return (
                      <tr key={i} style={{
                        background: isBest ? '#1f2937' : 'transparent',
                        border: isBest ? '1px solid #22c55e' : '1px solid #333'
                      }}>
                        <td style={{...td, fontWeight: isBest ? 'bold' : 'normal', color: isBest ? '#22c55e' : 'white'}}>
                          {r.name} {isBest && '⭐'}
                        </td>
                        <td style={{...td, color: isBest ? '#d1fae5' : '#aaa'}}>{r.desc}</td>
                        <td style={{...td, color: isBest ? '#d1fae5' : 'white'}}>{r.example}</td>
                        <td style={{...td, fontWeight: isBest ? 'bold' : 'normal'}}>{r.est}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            <div style={{...subCard, textAlign:"left"}}>
              {/* Executive Summary */}
              <div style={{marginBottom:"10px", padding:"10px", background:"#111827", border:"1px solid #22c55e", borderRadius:"8px"}}>
                <div style={{fontSize:"11px", color:"#888"}}>EXECUTIVE SUMMARY</div>
                <div style={{fontSize:"14px", fontWeight:"bold", color:"#22c55e"}}>
                  Fokus: {result.recommended?.type?.toUpperCase()} untuk nutup gap Rp {formatRupiah(result.gap || 0)}
                </div>
                <div style={{fontSize:"12px", color:"#aaa", marginTop:"4px"}}>
                  {result.recommended?.reason}
                </div>
                <div style={{marginTop:"8px", fontSize:"13px"}}>
                  <b>Impact:</b> +Rp {formatRupiah(result.impact || 0)} / transaksi
                </div>
                <div style={{marginTop:"4px", fontSize:"12px", color:"#9ca3af"}}>
                  {result.urgency}
                </div>
              </div>

              {/* Header */}
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
                <div style={{fontSize:"12px", color:"#888"}}>INSIGHT</div>
                <div style={{fontSize:"11px", padding:"4px 8px", borderRadius:"999px", background:"#111", border:"1px solid #333"}}>
                  {result.recommended?.type?.toUpperCase()}
                </div>
              </div>

              {/* Main Title */}
              <div style={{fontSize:"14px", fontWeight:"bold", marginBottom:"6px"}}>
                Strategi Utama
              </div>
              <div style={{fontSize:"13px", color:"#d1fae5", marginBottom:"8px"}}>
                {result.recommended?.reason}
              </div>

              {/* Insight Text */}
              <div style={{fontSize:"13px", lineHeight:"1.6", marginBottom:"10px", whiteSpace:"pre-line"}}>
                {result.insight}
              </div>

              {/* Divider */}
              <div style={{height:"1px", background:"#222", margin:"10px 0"}} />

              {/* Action Plan */}
              <div style={{fontSize:"12px", color:"#888", marginBottom:"6px"}}>ACTION PLAN</div>
              <ul style={{fontSize:"13px", paddingLeft:"18px", margin:0}}>
                {result.priority?.map((p,i)=>(
                  <li key={i} style={{marginBottom:"6px"}}> {p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );

}

const appStyle = {
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "white",
  padding: "16px",
  fontFamily: "Inter, Arial"
};

const containerStyle = {
  maxWidth: "480px",
  margin: "0 auto",
  display: "grid",
  gap: "16px"
};

const cardStyle = {
  background: "#111",
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #222"
};

const titleStyle = {
  color: "#facc15"
};

const subtitleStyle = {
  fontSize: "13px",
  color: "#aaa"
};

const sectionTitle = {
  marginBottom: "10px",
  fontWeight: "bold"
};

const label = {
  fontSize: "12px",
  color: "#aaa",
  marginBottom: "4px",
  display: "block"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  background: "#0f0f0f",
  border: "1px solid #333",
  borderRadius: "8px",
  color: "white",
  boxSizing: "border-box"
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#facc15",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold"
};

const listStyle = {
  paddingLeft: "18px",
  fontSize: "13px",
  color: "#aaa",
  listStyleType: "decimal"
};

const productCard = {
  background: "#0d0d0d",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #1f1f1f",
  marginBottom: "12px",
  width: "100%",
  boxSizing: "border-box"
};

const deleteBtn = {
  background:"transparent",
  color:"#f87171",
  border:"none",
  cursor:"pointer",
  fontSize:"12px"
};

const progressContainer = {
  display:"flex",
  justifyContent:"space-between",
  gap:"6px"
};

const th = {border:"1px solid #333", padding:"8px", textAlign:"left"};
const td = {border:"1px solid #333", padding:"8px"};

const subCard = {
  background: "#0f0f0f",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #222",
  marginTop: "10px"
};
