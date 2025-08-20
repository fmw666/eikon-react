/**
 * @file Select.tsx
 * @description Select component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { Fragment, useMemo } from 'react';

// --- Third-party Libraries ---
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

// =================================================================================================
// Types
// =================================================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// =================================================================================================
// Component
// =================================================================================================

const Select: React.FC<SelectProps> = ({ value, options, onChange, placeholder, className = '' }) => {
  const selectedOption = useMemo(() => options.find((opt) => opt.value === value) || null, [options, value]);

  return (
    <Listbox value={selectedOption} onChange={(opt: SelectOption) => onChange(opt.value)}>
      <div className={`relative ${className}`}>
        <Listbox.Button
          className="relative w-full min-h-[2.5rem] cursor-default rounded border border-border bg-input text-foreground py-2 pl-3 pr-8 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring hover:border-ring transition"
        >
          <span className="block truncate">
            {selectedOption ? selectedOption.label : (placeholder || '')}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronUpDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-150"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-8 pr-3 ${active ? 'bg-accent text-accent-foreground' : ''}`
                }
                value={opt}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{opt.label}</span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-2 flex items-center text-primary">
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default Select;
export type { SelectOption, SelectProps };
