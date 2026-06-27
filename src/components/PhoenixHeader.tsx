"use client";

import { usePathname, useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "Today", href: "/" },
  { label: "Decision", href: "/decision" },
  { label: "Carousel", href: "/carousel" },
  { label: "History", href: "/history" },
  { label: "Creator DNA", href: "/settings" },
  { label: "Teach", href: "/teach" },
];

interface PhoenixHeaderProps {
  /** "full" shows centered nav links; "minimal" hides them (for teach onboarding). */
  variant?: "full" | "minimal";
  right?: React.ReactNode;
}

export function PhoenixHeader({ variant = "full", right }: PhoenixHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      style={{
        position: "relative",
        zIndex: 10,
        height: 44,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Logo — always navigates home */}
      <button
        onClick={() => router.push("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "none",
          border: "none",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            background: "linear-gradient(145deg, #F97316, #FB923C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M5 0.5L6.2 3.6H9.5L6.9 5.5L7.9 8.6L5 6.7L2.1 8.6L3.1 5.5L0.5 3.6H3.8L5 0.5Z"
              fill="white"
            />
          </svg>
        </div>
        <span
          style={{
            color: "#FAFAF9",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Phoenix
        </span>
      </button>

      {/* Nav links — centered, full variant only */}
      {variant === "full" && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          {NAV_LINKS.map(({ label, href }) => {
            const active =
              href === "/" ? pathname === "/" : pathname === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`nav-btn ${active ? "nav-btn--active" : "nav-btn--inactive"}`}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 0",
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  letterSpacing: active ? "-0.005em" : "0.01em",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Right slot — defaults to "AI Brand Coach" label */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {right ?? (
          <span
            style={{
              color: "#252220",
              fontSize: 11,
              letterSpacing: "-0.005em",
            }}
          >
            AI Brand Coach
          </span>
        )}
      </div>
    </nav>
  );
}
