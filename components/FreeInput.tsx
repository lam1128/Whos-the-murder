import { FormEvent, useState } from "react";

export default function FreeInput({
  enabled: _enabled,
  onSubmit,
}: {
  enabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const disabled = true;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || disabled) return;
    onSubmit(text);
    setText("");
  }

  return (
    <section className="paper-panel p-5 sm:p-6" aria-labelledby="free-input-title">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="free-input-title" className="section-title">
          自由输入
        </h3>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">
          始终不可用
        </span>
      </div>
      <p className="mb-4 text-sm leading-6 text-stone-500">
        你可以描述主角自己的话、态度或行动，但当前版本暂不开放自由输入。
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
          className="field flex-1 cursor-not-allowed bg-stone-50 text-stone-400"
          placeholder="例如：我先站在原地安静听一会儿……"
          aria-label="输入主角的自由行动"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="secondary-button cursor-not-allowed"
        >
          确认行动
        </button>
      </form>
    </section>
  );
}
