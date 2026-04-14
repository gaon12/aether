"use client";

import { type ReactNode, useState } from "react";

export interface TabItem {
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface AdminTabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
}

export function AdminTabs({ tabs, defaultIndex = 0 }: AdminTabsProps) {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div>
      <div className="admin-tab-bar" role="tablist">
        {tabs.map((tab, i) => {
          const tabId = tab.label.trim().replaceAll(/\s+/g, "-");

          return (
            <button
              key={tabId}
              role="tab"
              type="button"
              aria-selected={active === i}
              aria-controls={`tab-panel-${tabId}`}
              id={`tab-btn-${tabId}`}
              onClick={() => setActive(i)}
              className={`admin-tab-btn${active === i ? " active" : ""}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, i) => {
        const tabId = tab.label.trim().replaceAll(/\s+/g, "-");

        return (
          <div
            key={tabId}
            id={`tab-panel-${tabId}`}
            role="tabpanel"
            aria-labelledby={`tab-btn-${tabId}`}
            aria-hidden={active !== i}
            className="admin-tab-panel"
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}
