export default function SaveLoadControls({
  onSave,
  onLoad,
  onRestart,
  hasSave,
  onLoadRescueCheckpoint,
  onLoadMealCheckpoint,
  hasRescueCheckpoint,
  hasMealCheckpoint,
}: {
  onSave: () => void;
  onLoad: () => void;
  onRestart: () => void;
  hasSave: boolean;
  onLoadRescueCheckpoint: () => void;
  onLoadMealCheckpoint: () => void;
  hasRescueCheckpoint: boolean;
  hasMealCheckpoint: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="toolbar-button" onClick={onSave}>
        保存
      </button>
      <button type="button" className="toolbar-button" onClick={onLoad} disabled={!hasSave}>
        读取
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onLoadRescueCheckpoint}
        disabled={!hasRescueCheckpoint}
      >
        读取救援存档
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onLoadMealCheckpoint}
        disabled={!hasMealCheckpoint}
      >
        读取共餐存档
      </button>
      <button type="button" className="toolbar-button-danger" onClick={onRestart}>
        重新开始
      </button>
    </div>
  );
}
