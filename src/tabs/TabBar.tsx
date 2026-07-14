import { confirm } from "@tauri-apps/plugin-dialog";
import { isTabDirty, useTabsStore } from "./tabsStore";

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);

  async function handleClose(e: React.MouseEvent, tabId: string) {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && isTabDirty(tab)) {
      const proceed = await confirm(
        `"${tab.title}" has unsaved changes. Close anyway?`,
        { title: "Unsaved changes", kind: "warning" },
      );
      if (!proceed) return;
    }
    closeTab(tabId);
  }

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab${tab.id === activeTabId ? " active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-title">
            {tab.title}
            {isTabDirty(tab) ? " *" : ""}
          </span>
          <button
            className="tab-close"
            onClick={(e) => handleClose(e, tab.id)}
            aria-label={`Close ${tab.title}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
