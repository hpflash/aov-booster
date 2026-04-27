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
        <title>AOV Report</title>
        <style>
          body { font-family: Arial; padding:20px; }
          h1 { margin-bottom:4px; }
          .section { margin-top:16px; }
          .card { border:1px solid #ddd; padding:12px; border-radius:8px; margin-top:8px; }
          .small { font-size:12px; color:#555; }
        </style>
      </head>
      <body>
        <h1>AOV Strategy Report</h1>
        <div class="small">${business.name || "Bisnis"}</div>
        <div class="small">${new Date().toLocaleDateString('id-ID')}</div>

        <div class="section">
          <div class="card">
            <b>Strategi Terbaik</b><br/>
            ${result.recommended?.type?.toUpperCase()}<br/>
            <span class="small">${result.recommended?.reason}</span><br/>
            ${result.decision}
          </div>
        </div>

        <div class="section">
          <div class="card">
            <b>Breakdown</b>
            ${result.breakdown.map(b=>`<p>• ${b}</p>`).join("")}
          </div>
        </div>

        <div class="section">
          <div class="card">
            <b>Next Action</b>
            ${result.nextActions.map(a=>`<p>✔ ${a}</p>`).join("")}
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
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

    let decision = "";
    if (recommended?.type === "bundle") {
      decision = `Gunakan Bundle — kombinasi profit tinggi dan margin sehat`;
    } else if (recommended?.type === "upgrade") {
      decision = `Gunakan Upgrade — kenaikan nilai per transaksi paling besar`;
    } else if (recommended?.type === "upsell") {
      decision = `Gunakan Upsell — paling mudah dieksekusi dan cepat jalan`;
    }

    return { main, sims, bestAOV, bestProfit, bestBundle, gap, breakdown, nextActions, decision, recommended };
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

        <div style={cardStyle}>
          <p style={sectionTitle}>Produk / Jasa</p>
          {products.map((p,i)=>(
            <details key={i} style={productCard}>
              <summary style={{cursor:"pointer", fontWeight:"bold", marginBottom:"8px"}}>
                {p.name || `Item ${i+1}`}
              </summary>

              <div style={{display:"flex", justifyContent:"space-between", marginBottom:"6px"}}>
                <span style={{fontSize:"12px", color:"#888"}}>Detail</span>
                {products.length > 1 && (
                  <button onClick={(e)=>{
                    e.preventDefault();
                    const newProducts = products.filter((_,idx)=>idx!==i);
                    setProducts(newProducts);
                  }} style={deleteBtn}>Hapus</button>
                )}
              </div>

              <label style={label}>Nama</label>
              <input placeholder="Contoh: Kopi Latte" style={inputStyle} value={p.name} onChange={e=>updateProduct(i,'name',e.target.value)}/>

              <label style={label}>Harga</label>
              <input placeholder="Contoh: 25.000" style={inputStyle} value={p.price} onChange={e=>updateProduct(i,'price',e.target.value)}/>

              <label style={label}>Profit</label>
              <input placeholder="Contoh: 10.000" style={inputStyle} value={p.profit} onChange={e=>updateProduct(i,'profit',e.target.value)}/>
            </details>
          ))}
          <button style={buttonStyle} onClick={addProduct}>+ Tambah Produk</button>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Target</p>
          <input placeholder="Contoh: 50.000" style={inputStyle} value={target} onChange={e=>setTarget(formatInput(e.target.value))}/>
        </div>

        {result && (
          <div id="print-area" style={cardStyle}>
            <p style={sectionTitle}>Hasil</p>

            <div style={subCard}>
              <p><b>Strategi Terbaik</b></p>
              <p>{result.recommended?.type?.toUpperCase()}</p>
              <p style={{fontSize:"12px", color:"#aaa"}}>{result.recommended?.reason}</p>
              <p>{result.decision}</p>
            </div>

            <div style={subCard}>
              <p><b>Breakdown</b></p>
              {result.breakdown.map((b,i)=>(
                <p key={i}>• {b}</p>
              ))}
            </div>

            <div style={subCard}>
              <p><b>Next Action</b></p>
              {result.nextActions.map((a,i)=>(
                <p key={i}>✔ {a}</p>
              ))}
            </div>
          </div>
        )}

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

const subCard = {
  background: "#0f0f0f",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #222",
  marginTop: "10px"
};
