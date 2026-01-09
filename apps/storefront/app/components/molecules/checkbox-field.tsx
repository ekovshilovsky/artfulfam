import {Checkbox} from '../atoms/checkbox';
import {Label} from '../atoms/label';

interface CheckboxFieldProps {
  id: string;
  label: string | React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
}

export function CheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
  error,
}: CheckboxFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2">
        <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
        <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
          {label}
        </Label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
