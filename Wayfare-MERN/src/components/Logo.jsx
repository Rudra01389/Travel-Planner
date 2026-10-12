export default function Logo() {
  return (
    <span className="brand">
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="m10 14 5 14 5-9 5 9 5-14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m20 7 2 5h-4l2-5Z" fill="#c1663f" />
      </svg>
      Wayfare<span className="brand-dot">®</span>
    </span>
  );
}
