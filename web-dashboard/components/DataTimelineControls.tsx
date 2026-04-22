"use client";

type Props = {
  loading?: boolean;
  minTimestamp: string | null;
  maxTimestamp: string | null;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onJumpStart: () => void;
  onJumpLatest: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
};

function formatDisplay(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function DataTimelineControls({
  loading,
  minTimestamp,
  maxTimestamp,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onJumpStart,
  onJumpLatest,
  onStepBack,
  onStepForward,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-sm font-semibold text-black">
            Historical Snapshot
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Available data: {formatDisplay(minTimestamp)} → {formatDisplay(maxTimestamp)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={minTimestamp ? minTimestamp.slice(0, 10) : undefined}
              max={maxTimestamp ? maxTimestamp.slice(0, 10) : undefined}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              disabled={loading || !minTimestamp || !maxTimestamp}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              step={900}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              disabled={loading || !minTimestamp || !maxTimestamp}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onJumpStart}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-black hover:bg-gray-50"
            disabled={loading || !minTimestamp}
          >
            Jump to Start
          </button>
          <button
            onClick={onStepBack}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-black hover:bg-gray-50"
            disabled={loading || !minTimestamp}
          >
            − 15 min
          </button>
          <button
            onClick={onStepForward}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-black hover:bg-gray-50"
            disabled={loading || !maxTimestamp}
          >
            + 15 min
          </button>
          <button
            onClick={onJumpLatest}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            disabled={loading || !maxTimestamp}
          >
            Jump to Latest
          </button>
        </div>
      </div>
    </div>
  );
}