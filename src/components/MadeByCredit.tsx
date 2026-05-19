type MadeByCreditProps = {
  className?: string;
};

export function MadeByCredit({ className = "" }: MadeByCreditProps) {
  return (
    <p className={`text-xs text-brown-sugar/45 ${className}`.trim()}>
      made by{" "}
      <a
        href="https://ifunlove.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-brown-sugar/25 underline-offset-2 transition-colors hover:text-brown-sugar/65"
      >
        ifunlove
      </a>
    </p>
  );
}
