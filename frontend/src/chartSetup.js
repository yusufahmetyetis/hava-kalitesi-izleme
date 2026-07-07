// Chart.js bileşenlerini bir kez kaydet (tree-shakeable API).
// Yalnızca çizgi grafiği (zaman serisi) kullanılıyor; radar kaldırıldı.
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);
