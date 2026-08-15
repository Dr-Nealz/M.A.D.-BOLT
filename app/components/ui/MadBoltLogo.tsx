import { classNames } from '~/utils/classNames';

const BOLT_PATH =
  'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z';

interface MadBoltLogoProps {
  className?: string;

  /** Hide the text wordmark, show only the GALVANI bolt badge */
  iconOnly?: boolean;

  /** Emphasize the GALVANI lockup ("GALVANI by M.A.D. LABS — animate your stack") */
  variant?: 'default' | 'galvani';
}

/**
 * MAD BOLT wordmark — GALVANI bolt badge (spark → violet) + wordmark.
 * Theme-aware: the GALVANI gradient reads on both light and dark backgrounds.
 *
 * Blend mode: Multiverse Aurora remains the ambient theme; GALVANI is the
 * signature — the bolt badge + "GALVANI by M.A.D. LABS" lockup.
 * The BOLT-REMIX · By: Dr. Neal (The M.A.D. Doctor) signature is always carried.
 */
export function MadBoltLogo({ className, iconOnly = false, variant = 'default' }: MadBoltLogoProps) {
  return (
    <span className={classNames('inline-flex items-center gap-2 select-none', className)}>
      <span
        className={classNames(
          'relative inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-lg shadow-[0_0_16px_rgba(124,92,255,0.45)]',
          'bg-[linear-gradient(135deg,#2CE5B8,#7C5CFF)]',
        )}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white drop-shadow" aria-hidden="true">
          <path d={BOLT_PATH} />
        </svg>
      </span>
      {!iconOnly && (
        <span className="flex flex-col leading-none text-left">
          {variant === 'galvani' ? (
            <>
              <span className="text-[15px] font-extrabold tracking-wide">
                <span className="bg-[linear-gradient(120deg,#2CE5B8,#7C5CFF)] bg-clip-text text-transparent">
                  GALVANI
                </span>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.22em] text-bolt-elements-textTertiary">
                BY M.A.D. LABS — ANIMATE YOUR STACK
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-extrabold tracking-wide">
                <span className="bg-[linear-gradient(120deg,#2CE5B8,#7C5CFF)] bg-clip-text text-transparent">
                  M.A.D.
                </span>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.22em] text-bolt-elements-textTertiary">
                BOLT-REMIX
              </span>
            </>
          )}
          <span className="text-[7px] font-medium tracking-[0.14em] text-bolt-elements-textTertiary/80 mt-[2px]">
            BY: DR. NEAL (THE M.A.D. DOCTOR)
          </span>
        </span>
      )}
    </span>
  );
}
