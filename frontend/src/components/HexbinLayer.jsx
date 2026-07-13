import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { computeHexbins } from "../lib/hexbinUtils.js";
import { getAQIColor } from "../lib/aqiUtils.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// İstasyonları piksel uzayında altıgen hücrelere gruplar, her hücre kapsadığı istasyonların
// ortalama AQI'sini gösterir — interpolasyon YOK, sadece ölçülen değerlerin ortalaması.
// 100+ istasyona ölçeklenince marker kalabalığının yerini alması için hazırlandı; mevcut
// 21 istasyonla hücreler seyrek/büyük görünebilir (bkz. frontend/CLAUDE.md notu), bu yüzden
// varsayılan kapalı (bkz. LayerControl.jsx).
export default function HexbinLayer({ stations }) {
  const map = useMap();

  useEffect(() => {
    const svgLayer = L.svg();
    svgLayer.addTo(map);
    const container = svgLayer._container;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "hexbin-layer");
    container.appendChild(g);

    function render() {
      while (g.firstChild) g.removeChild(g.firstChild);

      const validStations = stations.filter((s) => s.lat != null && s.lng != null);
      const { bins, hexagonPath } = computeHexbins(validStations, map);

      for (const bin of bins) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", hexagonPath);
        path.setAttribute("transform", `translate(${bin.x},${bin.y})`);
        path.setAttribute("fill", getAQIColor(bin.avgAqi));
        path.setAttribute("fill-opacity", "0.6");
        path.setAttribute("stroke", "#fff");
        path.setAttribute("stroke-width", "1");

        const title = document.createElementNS(SVG_NS, "title");
        title.textContent =
          bin.avgAqi != null
            ? `Ort. AQI: ${bin.avgAqi} (${bin.count} istasyon)`
            : `${bin.count} istasyon (AQI verisi yok)`;
        path.appendChild(title);
        g.appendChild(path);
      }
    }

    render();
    map.on("zoomend moveend", render);

    return () => {
      map.off("zoomend moveend", render);
      map.removeLayer(svgLayer);
    };
  }, [map, stations]);

  return null;
}
