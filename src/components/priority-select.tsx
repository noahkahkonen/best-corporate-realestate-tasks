import { PRIORITY_DEFAULT, clampPriority } from "@/lib/priority";

type Props = {
  name: string;
  defaultValue?: number | string | null;
  className?: string;
  id?: string;
};

export function PrioritySelect({ name, defaultValue, className, id }: Props) {
  const val = clampPriority(
    typeof defaultValue === "number"
      ? defaultValue
      : parseInt(String(defaultValue ?? PRIORITY_DEFAULT), 10),
  );

  return (
    <select
      id={id}
      name={name}
      defaultValue={String(val)}
      className={className}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const num = i + 1;
        return (
          <option key={num} value={num}>
            {num}
          </option>
        );
      })}
    </select>
  );
}
