import { seedData } from "../../data/loadSeed";
import { AlertTriangle } from "lucide-react";

export default function CalloutBar() {
  const callout = seedData.commander_callout;
  return (
    <section className="bg-navy text-white rounded-lg px-6 py-4 flex items-center gap-4">
      <AlertTriangle size={20} className="text-warning shrink-0" />
      <div className="text-sm uppercase tracking-wide opacity-70 shrink-0">Commander&apos;s Brief:</div>
      <div className="text-base font-semibold flex-1 num">{callout}</div>
    </section>
  );
}
