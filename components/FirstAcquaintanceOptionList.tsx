import React from "react";
import { FirstAcquaintanceChoice } from "../lib/firstAcquaintanceTypes";

export default function FirstAcquaintanceOptionList({
  choices,
  prompt,
  onChoose,
}: {
  choices: FirstAcquaintanceChoice[];
  prompt: string | null;
  onChoose: (choice: FirstAcquaintanceChoice) => void;
}) {
  if (choices.length === 0) return null;

  return (
    <section className="paper-panel p-5 sm:p-6" aria-labelledby="choice-title">
      <div className="mb-5">
        <h3 id="choice-title" className="text-lg font-semibold text-stone-900">
          {prompt ?? "你准备怎么做？"}
        </h3>
      </div>
      <div className="grid gap-3">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            className="option-button group"
            onClick={() => onChoose(choice)}
          >
            <span className="option-index">{index + 1}</span>
            <span className="flex-1 text-left">{choice.text}</span>
            <span className="text-stone-400 transition group-hover:translate-x-1 group-hover:text-cyan-700">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}