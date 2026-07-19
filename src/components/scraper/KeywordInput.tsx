import { useRef, useState, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface KeywordInputProps {
  keywords: string[];
  onAdd: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  placeholder?: string;
}

export function KeywordInput({
  keywords,
  onAdd,
  onRemove,
  placeholder = 'Type keyword and press Enter...',
}: KeywordInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        onAdd(input);
        setInput('');
      }
      return;
    }
    if (e.key === 'Backspace' && input === '' && keywords.length > 0) {
      const last = keywords[keywords.length - 1];
      if (last) onRemove(last);
    }
  }

  function handleAdd() {
    if (input.trim()) {
      onAdd(input);
      setInput('');
    }
    inputRef.current?.focus();
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.focus(); }}
      role="group"
      tabIndex={-1}
    >
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400"
        >
          {keyword}
          <button
            type="button"
            aria-label={`Remove ${keyword}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(keyword);
            }}
            className="control-focus -my-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-400/60 hover:bg-blue-500/10 hover:text-blue-300"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="flex flex-1 items-center gap-1">
        <input
          aria-label="Add scraper keyword"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length === 0 ? placeholder : ''}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        {input.trim() && (
          <button
            type="button"
            aria-label="Add keyword"
            onClick={handleAdd}
            className="control-focus inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
