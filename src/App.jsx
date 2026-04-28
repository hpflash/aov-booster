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

  // 🔁 SINGLE SOURCE OF TRUTH (UI + PDF)
  const buildRows = (business, products, result) => {
    const isJasa = business.type === 'jasa';
    const mainName = result?.main?.name || (isJasa ? 'kelas / program' : 'produk utama');
    const addOn = products?.[1]?.name || (isJasa ? 'rekaman + modul + konsultasi' : 'item kecil');

    const getExample = (key) => {
      const priceMain = parseNumber(result?.main?.price || 0);
      const priceAddon = parseNumber(products?.[1]?.price || 0);

      const formatPrice = (n)=> `Rp ${formatRupiah(n)}`;

      // 🔥 PAIRING PRODUK BERDASARKAN KATEGORI (LEBIH AKURAT)
      const getPairing = (name) => {
        const n = (name || '').toLowerCase();

        // mapping kategori implicit dari nama (fallback)
        if (n.includes('kopi') || n.includes('coffee')) return ['pastry','croissant','snack'];
        if (n.includes('laptop')) return ['mouse','tas laptop','keyboard'];
        if (n.includes('hp') || n.includes('smartphone')) return ['case','tempered glass','charger'];
        if (n.includes('hdd') || n.includes('harddisk')) return ['enclosure','kabel','adaptor'];
        if (n.includes('kamera')) return ['memory card','tripod','baterai'];
        if (n.includes('sepatu')) return ['kaos kaki','insole','cleaner'];

        return [];
      };

      // ambil pairing paling relevan (prioritas: input user > pairing kategori)
      // 🔥 SMART SUGGESTION (bukan cuma dari input)
      const getRelevantAddon = () => {
        const otherProduct = products?.find(p=>p.name && p.name !== mainName);
        if (otherProduct) return { name: otherProduct.name, price: parseNumber(otherProduct.price||0) };
      };

      const mapProduk = {
        addon: (()=>{
          const addon = getRelevantAddon();
          return `Saat beli ${mainName} (${formatPrice(priceMain)}), tawarkan ${addon.name} ${addon.price ? `(${formatPrice(addon.price)})` : ''} dengan script: "Sekalian tambah ${addon.name} biar lebih lengkap?"`;
        })(),

        threshold: (()=>{
          const addon = getRelevantAddon();
          return `Set threshold sedikit di atas ${formatPrice(priceMain)}. Contoh: "Tambah sedikit lagi biar dapat ${addon.name}"`;
        })(),

        anchoring: `Buat 3 versi (small / medium / large). Tampilkan harga tertinggi dulu agar opsi tengah terasa paling worth it`,

        scarcity: (()=>{
          const addon = getRelevantAddon();
          return `Gunakan urgensi: "Hari ini saja: beli ${mainName} dapat ${addon.name} gratis"`;
        })(),

        bundle: result?.bestBundle
          ? `Buat paket ${result.bestBundle.label} dengan harga ${formatPrice(result.bestBundle.price)} (lebih hemat dari beli satuan)`
          : `Gabungkan beberapa produk yang saling melengkapi jadi bundle hemat`
      };

      // 🔥 JASA dibagi: EDUKASI vs SERVICE
      const isEdukasi = (business.name || '').toLowerCase().includes('kursus') || (business.name || '').toLowerCase().includes('kelas');

      const mapJasaEdukasi = {
        addon: `Saat closing ${mainName}, jangan pernah ganti jenis layanan (misal private → kelompok). Fokus ke peningkat hasil: feedback personal, rekaman sesi, atau evaluasi progres. Contoh: "Sekalian tambah sesi evaluasi biar hasilnya lebih cepat kelihatan"`,
        threshold: `Dorong ke paket yang meningkatkan hasil, bukan mengganti format. Contoh: "Ambil paket ini sekalian dapat sesi evaluasi tambahan, progresnya lebih terarah"`,
        anchoring: `Buat 3 paket berbasis outcome (Basic: belajar, Standard: belajar + feedback, Intensive: belajar + feedback + evaluasi). Arahkan ke Standard`,
        scarcity: `Gunakan kelangkaan berbasis kualitas: "Slot terbatas supaya setiap peserta dapat feedback maksimal"`,
        bundle: `Gabungkan value outcome: kelas + feedback + evaluasi progres (bukan mencampur private dengan kelompok)`
      };

      const mapJasaService = {
        addon: `Saat closing ${mainName}, tawarkan tambahan scope seperti ${addOn}: "Sekalian tambah ${addOn} supaya hasilnya lebih optimal"`,
        threshold: `Naikkan ke paket scope lebih luas: "Dengan tambahan sedikit, Anda dapat ${addOn} sekalian"`,
        anchoring: `Tampilkan 3 paket (Basic / Standard / Premium) berdasarkan scope kerja, arahkan ke Standard`,
        scarcity: `Gunakan urgency: "Slot terbatas minggu ini + bonus ${addOn}"`,
        bundle: `Gabungkan beberapa layanan terkait (misal: design + revisi + konsultasi) jadi satu paket`
      };

      const mapJasa = isEdukasi ? mapJasaEdukasi : mapJasaService;

      const map = isJasa ? mapJasa : mapProduk;

      return map[key] || '-';
    };

    return [
      { key:'addon', name:'Natural Add-On', desc:'Tambah item kecil saat customer sudah mau bayar', est:'+Rp 2.000 – 5.000' },
      { key:'threshold', name:'Threshold Bonus', desc:'Dorong belanja naik sedikit dengan bonus ambang', est:'+Rp 5.000 – 8.000' },
      { key:'anchoring', name:'Anchoring', desc:'Tampilkan opsi mahal agar opsi tengah terlihat worth it', est:'+Rp 5.000 – 10.000' },
      { key:'scarcity', name:'Scarcity + Value', desc:'Tambahkan urgensi + bonus terbatas', est:'+Rp 5.000 – 8.000' },
      { key:'bundle', name:'Bundle', desc:'Gabungkan produk jadi paket', est: result?.bestBundle ? `Rp ${formatRupiah(result.bestBundle.price)}` : '-' }
    ].map(r => ({ ...r, example: getExample(r.key) }));
  };
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
    const element = document.getElementById('app-area');
    if (!element) return;

    const win = window.open('', '_blank');
    if (!win) return;

    const styles = `
      <style>
        body { font-family: Inter, Arial; padding:20px; }
        button { display:none !important; }
        #app-area { max-width: 800px; margin:auto; }
      </style>
    `;

    win.document.write(`
      <html>
        <head>
          <title>AOV Report</title>
          ${styles}
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);

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

    // fallback kalau impact 0 (biar tidak kosong / useless)
    const fallbackImpact = (bestAOV?.aov || 0) - currentAov;
    const impact = Math.max(0, Math.round((impactValue || 0) > 0 ? impactValue : fallbackImpact));

    const urgency = gap > 0
      ? `Bisa mulai hari ini: targetkan kenaikan ±Rp ${formatRupiah(impact)} per transaksi untuk mengejar gap Rp ${formatRupiah(gap)}.`
      : `Target tercapai. Fokus ke scaling (traffic / repeat order).`;

    // 🔥 RANKING TOP 3 STRATEGI
    const ranking = sims
      .map(s => {
        let labelExtra = '';

        if (s.type === 'upsell') labelExtra = '⚡ Cepat dijalankan';
        if (s.type === 'upgrade') labelExtra = '📈 Impact besar';
        if (s.type === 'bundle') labelExtra = '💰 Profit tinggi';

        return { ...s, score: (s.aov || 0) + (s.profit || 0), labelExtra };
      })
      .sort((a,b)=>b.score-a.score)
      .slice(0,3);

    return { main, sims, bestAOV, bestProfit, bestBundle, gap, breakdown, nextActions, recommended, insight, priority, impact, urgency, ranking };
  };

  const result = generate();

  return (
    <>
    <style>{`@media print {
      body {
    background: white !important;
    color: black !important;
    font-size: 12px;
  }

  #app-area {
    max-width: 900px;
    margin: auto;
  }

  button {
    display: none !important;
  }

  div[style*="background: #111"],
  div[style*="#0f0f0f"] {
    background: white !important;
    color: black !important;
    border: 1px solid #ddd !important;
  }

  h1, h2 {
    color: black !important;
    background: none !important;
    border: none !important;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th {
    background: #f3f4f6 !important;
    color: black !important;
  }

  td, th {
    border: 1px solid #ddd !important;
    padding: 6px;
  }

  tr[style*="#1f2937"] {
    background: #e6f4ea !important;
    border: 1px solid #16a34a !important;
  }

  p, div, span {
    color: black !important;
  }
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
            {/* 🔥 TOP STRATEGI */}
            <div style={{...subCard, marginBottom:"10px"}}>
              <div style={{fontSize:"12px", color:"#888", marginBottom:"6px"}}>TOP STRATEGI</div>
              {result.ranking?.map((r,i)=> (
                <div key={i} style={{
                  padding:"8px",
                  marginBottom:"6px",
                  border:"1px solid #333",
                  borderRadius:"6px",
                  background: i===0 ? "#1f2937" : "transparent"
                }}>
                  <b>#{i+1} {r.label}</b>
                  <div style={{fontSize:"12px", color:"#aaa"}}>
                    {r.labelExtra}
                  </div>
                  <div style={{fontSize:"12px", color:"#aaa"}}>
                    Potensi AOV: Rp {formatRupiah(Math.round(r.aov || 0))}
                  </div>
                </div>
              
            </div>

            <h2 style={{textAlign:"center", marginBottom:"12px", color:"#facc15", background:"#111", padding:"8px", borderRadius:"8px", border:"1px solid #333"}}>HASIL STRATEGI AOV</h2>

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
                  const rows = buildRows(business, products, result);
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
