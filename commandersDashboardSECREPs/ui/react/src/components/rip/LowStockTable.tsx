import { seedData } from "../../data/loadSeed";

export default function LowStockTable() {
  const items = seedData.low_and_zero_stock_items.slice(0, 15);
  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">Low &amp; Zero Stock</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-steel text-xs uppercase">
            <th className="py-1">NSN</th>
            <th>Nomenclature</th>
            <th className="text-right">Allow</th>
            <th className="text-right">On Hand (Serv)</th>
            <th className="text-right">On Order</th>
            <th>Suggested Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.nsn} className="border-t border-slate-100">
              <td className="py-2 font-mono text-xs">{i.nsn}</td>
              <td>{i.nomenclature}</td>
              <td className="text-right num">{i.allowance_qty}</td>
              <td className={`text-right num ${i.on_hand_serviceable === 0 ? "text-critical font-semibold" : "text-warning"}`}>
                {i.on_hand_serviceable}
              </td>
              <td className="text-right num">{i.on_order_qty}</td>
              <td className="text-xs text-steel">{i._note ?? "Reorder review"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
