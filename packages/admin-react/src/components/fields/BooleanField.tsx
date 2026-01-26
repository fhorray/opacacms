interface BooleanFieldProps {
  label: string;
  name: string;
  value: boolean;
  onChange: (name: string, value: boolean) => void;
}

export function BooleanField({
  label,
  name,
  value,
  onChange,
}: BooleanFieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={value}
        onChange={(e) => onChange(name, e.target.checked)}
        className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-gray-300">{label}</span>
    </label>
  );
}
