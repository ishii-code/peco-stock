import * as React from "react";
import { PecoHeader, PecoHeaderProps } from "./PecoHeader";

export interface PecoLayoutProps {
  children: React.ReactNode;
  header?: PecoHeaderProps;
  showHeader?: boolean;
  footerText?: string;
  contentClassName?: string;
}

export function PecoLayout({
  children,
  header,
  showHeader = true,
  footerText,
  contentClassName = "",
}: PecoLayoutProps) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-peco-bg">
      {showHeader ? <PecoHeader {...header} /> : null}
      <main
        className={[
          "mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-6 md:py-8",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-peco-bg">
        <div className="mx-auto max-w-[1200px] px-4 py-4 text-xs text-peco-text-muted md:px-6">
          {footerText ?? `© ${year} 株式会社PECO — Smart Pet Medical`}
        </div>
      </footer>
    </div>
  );
}

export default PecoLayout;
