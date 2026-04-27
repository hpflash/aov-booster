import { useState } from "react";
function formatInput(val){
  const number = val.replace(/[^0-9]/g, "");
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(val){
  return Number((val || "").toString().replace(/\./g, ""));
}
function formatRupiah(n){
  const num = Number(n)||0;
  return num.toLocaleString('id-ID');
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

  const addProduct = () => setProducts([...products, { name: "", price: "", profit: "" }]);

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
        const profit=parseNumber(p1.profit)+parseNumber(p2.profit);
        if(!bestBundle||profit>bestBundle.profit){
          bestBundle={label:`${p1.name} + ${p2.name}`,price,profit};
        }
      }
    }

    const sims=[];
    const upsellValue = base * 0.3;
    const upgradeValue = premium - base;

    sims.push({label:"Upsell",aov:currentAov+upsellValue});
    sims.push({label:"Upgrade",aov:currentAov+upgradeValue});
    if(bestBundle) sims.push({label:"Bundle",aov:bestBundle.price,profit:bestBundle.profit});

    const bestAOV=sims.reduce((a,b)=>!a||b.aov>a.aov?b:a,null);
    const bestProfit=sims.reduce((a,b)=>!a||(b.profit||0)>(a.profit||0)?b:a,null);

    const breakdown = [];
    if (gap > 0) {
      if (upsellValue > 0) breakdown.push(`Butuh ± ${Math.ceil(gap / upsellValue)} upsell (@Rp ${formatRupiah(Math.round(upsellValue))})`);
      if (upgradeValue > 0) breakdown.push(`Atau ${Math.ceil(gap / upgradeValue)} upgrade ke premium`);
    }

    const nextActions = [];

    const otherProducts = valid.filter(p => p.name !== main.name);
    const upsellProduct = otherProducts[0];

    if (business.type === "jasa") {
      nextActions.push(`Buat paket premium dari ${main.name} dengan harga lebih tinggi`);
      if (upsellProduct) nextActions.push(`Tambahkan ${upsellProduct.name} sebagai add-on di setiap transaksi`);
      nextActions.push(`Buat versi express dari ${main.name} dengan harga lebih mahal`);
    } else {
      if (upsellProduct) nextActions.push(`Upsell ${upsellProduct.name} saat beli ${main.name}`);
      if (bestBundle) nextActions.push(`Bundle ${bestBundle.label} untuk naikkan AOV`);
      nextActions.push(`Buat versi premium dari ${main.name}`);
    }

    let decision = "";
    if (bestProfit && bestAOV && bestProfit === bestAOV) {
      decision = `Gunakan ${bestAOV.label} — terbaik untuk AOV & profit`;
    } else if (bestProfit) {
      decision = `Prioritaskan ${bestProfit.label} — profit paling tinggi`;
    } else if (bestAOV) {
      decision = `Gunakan ${bestAOV.label} — paling menaikkan AOV`;
    }

    return { main, sims, bestAOV, bestProfit, bestBundle, gap, breakdown, nextActions, decision };
  };

  const result = generate();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "16px", fontFamily:"Arial, sans-serif", lineHeight:"1.5" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", display:"grid", gap:"20px", width:"100%" }}>

        <div style={{ display:"grid", gap:"10px", textAlign:"center" }}>
          <h1 style={{ textAlign: "center", color: "#facc15", margin:"10px 0" }}>AOV Booster</h1>
          <p style={{ fontSize:"13px", color:"#aaa", marginBottom:"10px" }}>Naikkan omzet per transaksi tanpa nambah traffic</p>

          <div style={{ background:"#111", padding:"12px", borderRadius:"8px", textAlign:"left", border:"1px solid #222" }}>
            <p style={{ fontSize:"12px", color:"#ccc" }}><b>Cara Pakai:</b></p>
            <ol style={{ fontSize:"12px", color:"#aaa", paddingLeft:"18px", listStyleType:"decimal" }}>
              <li>Isi nama bisnis & pilih jenis (produk / jasa)</li>
              <li>Masukkan omzet & jumlah transaksi (boleh skip kalau pakai data produk saja)</li>
              <li>Tambahkan produk/jasa beserta harga & profit</li>
              <li>Isi target AOV yang ingin dicapai</li>
              <li>Lihat hasil: rekomendasi, analisa, dan aksi yang bisa dilakukan</li>
            </ol>
          </div>
          </div>

        <div style={{ background:"#111", padding:"14px", borderRadius:"10px", border:"1px solid #222" }}>
          <p style={{ color:"#ccc", marginBottom:"10px" }}><b>Info Bisnis</b></p>
          <input style={inputStyle} placeholder="Nama bisnis" value={business.name} onChange={e=>setBusiness({...business,name:e.target.value})}/>
        <select style={inputStyle} value={business.type} onChange={e=>setBusiness({...business,type:e.target.value})}>
          <option value="">Pilih jenis</option>
          <option value="produk">Produk</option>
          <option value="jasa">Jasa</option>
        </select>
        </div>

        <div style={{ background:"#111", padding:"14px", borderRadius:"10px", border:"1px solid #222" }}>
          <p style={{ color:"#ccc", marginBottom:"10px" }}><b>Data AOV (Omzet & Jumlah Transaksi)</b></p>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
          Gunakan data <b>bulanan</b> untuk konsistensi dan lebih stabil (disarankan untuk UMKM).
        </p>

        <input style={inputStyle} placeholder="Omzet (per bulan)" value={aovCalc.revenue} onChange={e=>setAovCalc({...aovCalc,revenue:formatInput(e.target.value)})}/>
          <input style={inputStyle} placeholder="Jumlah Transaksi (per bulan)" value={aovCalc.orders} onChange={e=>setAovCalc({...aovCalc,orders:formatInput(e.target.value)})}/>
          <p style={{ fontSize:"14px", marginTop:"4px" }}><b>AOV:</b> Rp {formatRupiah(calculateAOV())}</p>
        </div>

        <div style={{ background:"#111", padding:"14px", borderRadius:"10px", border:"1px solid #222" }}>
          <p style={{ color:"#ccc", marginBottom:"10px" }}><b>Produk / Jasa</b></p>
        {products.map((p,i)=>(

          <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom:"10px" }}>
            <input style={inputStyle} placeholder="Nama" value={p.name} onChange={e=>updateProduct(i,'name',e.target.value)}/>
            <input style={inputStyle} placeholder="Harga" value={p.price} onChange={e=>updateProduct(i,'price',e.target.value)}/>
            <input style={inputStyle} placeholder="Profit" value={p.profit} onChange={e=>updateProduct(i,'profit',e.target.value)}/>
          </div>
        ))}
        </div>

        <button style={{...buttonStyle, marginTop:"8px", boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}} onClick={addProduct}>+ Tambah Produk</button>

        <div style={{ background:"#111", padding:"14px", borderRadius:"10px", border:"1px solid #222" }}>
          <p style={{ color:"#ccc", marginBottom:"10px" }}><b>Target</b></p>
          <input style={inputStyle} placeholder="Target AOV" value={target} onChange={e=>setTarget(formatInput(e.target.value))}/>
        </div>

        {result && (
          <div style={{ border:"1px solid #333", padding:"15px", borderRadius:"8px", display:"grid", gap:"10px", textAlign:"left" }}>

            <div style={{ background:"#1f2937", padding:"12px", borderRadius:"6px" }}>
              <p style={{ fontSize:"12px", color:"#aaa" }}>Potensi peningkatan omzet:</p>
              <p style={{ fontSize:"18px", fontWeight:"bold" }}>+Rp {formatRupiah(Math.max(...result.sims.map(s=>Math.round(s.aov))) - calculateAOV())}</p>
            </div>

            <div style={{ background:"#2a2a00", padding:"10px", borderRadius:"6px" }}>
              <p><b>Rekomendasi Utama:</b></p>
              <p>{result.decision}</p>
            </div>

            <p><b>Main Produk:</b> {result.main.name}</p>
            <div style={{ background: result.gap > 0 ? "#3f1d1d" : "#1d3f2a", padding:"10px", borderRadius:"6px" }}>
              <p><b>Gap AOV:</b> Rp {formatRupiah(result.gap)}</p>
              <p style={{ fontSize:"12px", color:"#ccc" }}>
                {result.gap > 0 ? "Target belum tercapai — perlu strategi tambahan" : "Target tercapai atau terlampaui"}
              </p>
            </div>

            {result.breakdown.length > 0 && (
              <div>
                <p><b>Analisa:</b></p>
                <ul style={{ paddingLeft:"20px", textAlign:"left" }}>
                  {result.breakdown.map((b,i)=>(<li key={i}>{b}</li>))}
                </ul>
              </div>
            )}

            <div style={{ background:"#1a1a1a", padding:"10px", borderRadius:"6px" }}>
              <p><b>Next Action (Langsung Eksekusi):</b></p>
              <ul style={{ paddingLeft:"20px", textAlign:"left" }}>
                {result.nextActions.map((a,i)=>(<li key={i}>{a}</li>))}
              </ul>
            </div>

            {result.bestBundle && (
              <p><b>Bundle Terbaik:</b> {result.bestBundle.label} → Rp {formatRupiah(result.bestBundle.price)} (Profit Rp {formatRupiah(result.bestBundle.profit)})</p>
            )}

            <div style={{ background:"#1a1a1a", padding:"10px", borderRadius:"6px" }}>
              <p><b>Simulasi Dampak (AOV, bukan profit bersih):</b></p>
              <ul style={{ paddingLeft:"20px", textAlign:"left" }}>
                {result.sims.map((s,i)=>(
                  <li key={i}>
                    {s.label} → Rp {formatRupiah(Math.round(s.aov))}
                    {s.profit?` (Profit Rp ${formatRupiah(s.profit)})`:""}
                    {result.bestAOV===s?" 🔥 BEST AOV":""}
                    {result.bestProfit===s?" 💰 BEST PROFIT":""}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

const inputStyle = {
  background: "#111",
  border: "1px solid #333",
  padding: "12px",
  borderRadius: "8px",
  color: "white",
  width: "100%",
  marginBottom: "8px",
  fontSize: "14px"
};

const buttonStyle = {
  background: "#facc15",
  color: "black",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  width: "100%",
  fontWeight: "bold",
  fontSize: "14px"
};
