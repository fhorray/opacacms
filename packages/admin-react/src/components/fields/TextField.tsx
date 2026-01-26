interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean;
}

export function TextField({
  label,
  name,
  value,
  onChange,
  multiline,
}: TextFieldProps) {
  const baseClass =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={5}
          className={baseClass}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className={baseClass}
        />
      )}
    </div>
  );
}
