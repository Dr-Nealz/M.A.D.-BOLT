import { classNames } from '~/utils/classNames';

const BOLT_PATH =
  'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z';

interface MadBoltLogoProps {
  className?: string;

  /** Hide the text wordmark, show only the aurora bolt badge */
  iconOnly?: boolean;
}

/**
 * MAD BOLT wordmark — aurora-gradient bolt badge + "M.A.D. BOLT-REMIX" wordmark.
 * Theme-aware: the aurora gradient reads on both light and dark backgrounds.
 */
export function MadBoltLogo({ className, iconOnly = false }: MadBoltLogoProps) {
  return (
    <span className={classNames('inline-flex items-center gap-2 select-none', className)}>
      <span className="relative inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-lg bg-aurora shadow-[0_0_16px_rgba(107,140,255,0.45)]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white drop-shadow" aria-hidden="true">
          <path d={BOLT_PATH} />
        </svg>
      </span>
      {!iconOnly && (
        <span className="flex flex-col leading-none text-left">
          <span className="text-[15px] font-extrabold tracking-wide">
            <span className="bg-[linear-gradient(120deg,#6B8CFF,#2DD4BF,#EC4899)] bg-clip-text text-transparent">
              M.A.D.
            </span>
          </span>
          <span className="text-[9px] font-semibold tracking-[0.22em] text-bolt-elements-textTertiary">BOLT-REMIX</span>
        </span>
      )}
    </span>
  );
}
