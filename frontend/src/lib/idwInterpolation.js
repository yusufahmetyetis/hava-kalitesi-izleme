// Ağırlıklı ters mesafe interpolasyonu (IDW) — saf fonksiyon, React/Leaflet importu yok.
// Farklı güvenilirlikteki kaynakları (gerçek istasyon ölçümü + kaba model ızgarası) tek bir
// yüzeyde birleştirmek için kullanılıyor: her noktanın kendi `weight`'i (güvenilirlik çarpanı)
// mesafeye ek olarak etkiyor — istasyona yakınken istasyon baskın çıkar, uzakta model verisi
// devreye girer.
const POWER = 2;
const EPSILON_SQ = 1e-8;

// points: [{ lat, lng, value, weight }]. latLngRatio: enlem/boylam derecesi farkını gerçek
// mesafeye yakınsatmak için boylam farkına uygulanan çarpan (≈ cos(ortalama enlem)).
export function idwInterpolate(points, lat, lng, latLngRatio = 1) {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const p of points) {
    if (p.value == null) continue;
    const dLat = p.lat - lat;
    const dLng = (p.lng - lng) * latLngRatio;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < EPSILON_SQ) {
      return p.value;
    }
    const w = p.weight / Math.pow(distSq, POWER / 2);
    weightedSum += w * p.value;
    weightTotal += w;
  }

  return weightTotal > 0 ? weightedSum / weightTotal : null;
}
