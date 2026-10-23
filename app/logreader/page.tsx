import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log Reader — Midnigh7 Club",
  description: "Visualize gráficos, mapa GPS e estatísticas de logs CSV exportados do Car Scanner, direto no seu navegador.",
};

export default function LogAnalyzerPage() {
  return <iframe src="/logreader/index.html" title="Log Reader Car Scanner" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#0b0c0c" }} />;
}
