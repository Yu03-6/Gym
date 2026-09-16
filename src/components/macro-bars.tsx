import { round } from "./ui";
export function MacroBars({
  total,
  goal,
}: {
  total: { protein: number; carbs: number; fat: number };
  goal?: { protein: number; carbs: number; fat: number };
}) {
  return (
    <div className="macro-bars">
      {(
        [
          { key: "protein", name: "蛋白质", className: "protein" },
          { key: "carbs", name: "碳水", className: "carbs" },
          { key: "fat", name: "脂肪", className: "fat" },
        ] as const
      ).map((m) => (
        <div className={`macro ${m.className}`} key={m.key}>
          <div>
            <span>
              <i />
              {m.name}
            </span>
            <b>
              {round(total[m.key], 1)}{" "}
              <small>/ {goal ? round(goal[m.key], 1) : "—"} g</small>
            </b>
          </div>
          <div
            className="bar"
            role="img"
            aria-label={`${m.name} ${round(total[m.key], 1)} 克，目标 ${goal ? round(goal[m.key], 1) : "未设置"} 克`}
          >
            <i
              style={{
                width: `${goal && goal[m.key] > 0 ? Math.min(100, (total[m.key] / goal[m.key]) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
