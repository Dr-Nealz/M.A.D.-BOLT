import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { MadBoltLogo } from './MadBoltLogo';

const STAGES = ['PROMPT', 'SPARK', 'ANIMATE', 'ALIVE'] as const;
const STAGE_MS = 640;
const TOTAL_MS = STAGES.length * STAGE_MS + 260;

/**
 * GALVANI by M.A.D. LABS — branded boot splash.
 *
 * Runs the loading choreography PROMPT → SPARK → ANIMATE → ALIVE in
 * spark/violet, mirroring the Qwen-produced GALVANI loading animation.
 * After the sequence completes, it calls `onComplete` so the parent can
 * unmount it (self-cleaning, no timer leak).
 */
export function GalvaniBoot({ onComplete }: { onComplete?: () => void }) {
  const [stage, setStage] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STAGES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setStage(i);
        }, i * STAGE_MS),
      );
    });

    timers.push(
      setTimeout(() => {
        onComplete?.();
      }, TOTAL_MS),
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bolt-elements-background-depth-1 transition-opacity duration-300">
      <div className="relative flex flex-col items-center gap-8">
        {/* ambient GALVANI glow */}
        <div
          className="absolute -inset-16 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'linear-gradient(120deg, rgba(44,229,184,0.5), rgba(124,92,255,0.5))' }}
        />

        {/* bolt badge that "ignites" when SPARK lands */}
        <div
          className={classNames(
            'relative inline-flex w-16 h-16 items-center justify-center rounded-2xl transition-all duration-300',
            'bg-[linear-gradient(135deg,#2CE5B8,#7C5CFF)]',
            stage >= 1 ? 'shadow-[0_0_32px_rgba(124,92,255,0.6)] scale-100 opacity-100' : 'scale-90 opacity-40',
          )}
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow" aria-hidden="true">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 h-6">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span
                  className={classNames(
                    'text-[11px] font-bold tracking-[0.3em] transition-colors duration-200',
                    i <= stage ? 'text-[#2CE5B8]' : 'text-bolt-elements-textTertiary/40',
                  )}
                >
                  {s}
                </span>
                {i < STAGES.length - 1 && <span className="text-[10px] text-bolt-elements-textTertiary/30">→</span>}
              </div>
            ))}
          </div>

          {/* progress rail */}
          <div className="w-56 h-[3px] bg-bolt-elements-background-depth-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[linear-gradient(90deg,#2CE5B8,#7C5CFF)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(0, ((stage + 1) / STAGES.length) * 100)}%` }}
            />
          </div>

          {/* signature line — only fully visible at ALIVE */}
          <div
            className={classNames(
              'transition-opacity duration-300',
              stage >= STAGES.length - 1 ? 'opacity-100' : 'opacity-40',
            )}
          >
            <MadBoltLogo />
          </div>
        </div>
      </div>
    </div>
  );
}
