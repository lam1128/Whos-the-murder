export default function SaveLoadControls({
  onSave,
  onLoad,
  onRestart,
  hasSave,
  onLoadRescueCheckpoint,
  onLoadMealCheckpoint,
  hasRescueCheckpoint,
  hasMealCheckpoint,
  onUndoTurn,
  hasUndoTurn,
  rescueCheckpointLabel = "读取救援存档",
  mealCheckpointLabel = "读取共餐存档",
}: {
  onSave: () => void;
  onLoad: () => void;
  onRestart: () => void;
  hasSave: boolean;
  onLoadRescueCheckpoint: () => void;
  onLoadMealCheckpoint: () => void;
  hasRescueCheckpoint: boolean;
  hasMealCheckpoint: boolean;
  onUndoTurn: () => void;
  hasUndoTurn: boolean;
  rescueCheckpointLabel?: string;
  mealCheckpointLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="toolbar-button" onClick={onSave}>
        保存
      </button>
      <button type="button" className="toolbar-button" onClick={onLoad} disabled={!hasSave}>
        读档
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onUndoTurn}
        disabled={!hasUndoTurn}
      >
        回退上一回合
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onLoadRescueCheckpoint}
        disabled={!hasRescueCheckpoint}
      >
        {rescueCheckpointLabel}
      </button>
      <button
        type="button"
        className="toolbar-button"
        onClick={onLoadMealCheckpoint}
        disabled={!hasMealCheckpoint}
      >
        {mealCheckpointLabel}
      </button>
      <button type="button" className="toolbar-button-danger" onClick={onRestart}>
        重新开始
      </button>
    </div>
  );
}
