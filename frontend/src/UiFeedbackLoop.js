import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ui_ue_loop_v2";

const CATEGORY_OPTIONS = ["视觉层", "交互层", "信息架构", "性能体验", "可访问性", "Bug"];
const PRIORITY_OPTIONS = ["P0", "P1", "P2"];
const STATUS_OPTIONS = ["Backlog", "In Progress", "Validated", "Shipped"];
const EFFORT_OPTIONS = ["S", "M", "L"];

const PRIORITY_WEIGHT = { P0: 3, P1: 2, P2: 1 };
const EFFORT_WEIGHT = { S: 3, M: 2, L: 1 };

const createEntry = (draft) => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "Backlog",
  ...draft,
});

const calcScore = (item) => {
  const p = PRIORITY_WEIGHT[item.priority] || 1;
  const e = EFFORT_WEIGHT[item.effort] || 1;
  const confidence = Number(item.confidence || 0);
  return p * e * confidence;
};

const rankItems = (items) =>
  [...items].sort((a, b) => {
    const scoreDiff = calcScore(b) - calcScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

export default function UiFeedbackLoop() {
  const [open, setOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState("Backlog");
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState({
    title: "",
    insight: "",
    category: CATEGORY_OPTIONS[0],
    priority: "P1",
    effort: "M",
    confidence: 3,
    metric: "CTR / 留存 / 时长",
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setEntries(parsed);
    } catch (error) {
      console.error("Failed to parse UI/UE loop data", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const board = useMemo(() => {
    const grouped = STATUS_OPTIONS.reduce((acc, status) => ({ ...acc, [status]: [] }), {});
    rankItems(entries).forEach((item) => grouped[item.status].push(item));
    return grouped;
  }, [entries]);

  const stats = useMemo(() => {
    const total = entries.length;
    const validated = entries.filter((item) => item.status === "Validated" || item.status === "Shipped").length;
    return {
      total,
      validated,
      loopRate: total ? `${Math.round((validated / total) * 100)}%` : "0%",
    };
  }, [entries]);

  const submit = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.insight.trim()) return;
    setEntries((prev) => [createEntry({ ...draft, title: draft.title.trim(), insight: draft.insight.trim() }), ...prev]);
    setDraft((prev) => ({ ...prev, title: "", insight: "" }));
    setActiveStatus("Backlog");
    setOpen(true);
  };

  const updateStatus = (id, direction) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const index = STATUS_OPTIONS.indexOf(item.status);
        const next = Math.max(0, Math.min(STATUS_OPTIONS.length - 1, index + direction));
        return { ...item, status: STATUS_OPTIONS[next], updatedAt: new Date().toISOString() };
      })
    );
  };

  const archive = (id) => setEntries((prev) => prev.filter((item) => item.id !== id));

  return (
    <aside className="ui-feedback-loop" aria-label="Professional UI/UE loop">
      <button className="feedback-fab" onClick={() => setOpen((v) => !v)}>
        {open ? "关闭 UI/UE Loop" : "UI/UE Loop"}
      </button>
      {open && (
        <section className="feedback-panel pro-loop">
          <div className="loop-header">
            <h3>UI / UE Engineering Loop</h3>
            <div className="loop-kpis">
              <span>总条目: {stats.total}</span>
              <span>闭环率: {stats.loopRate}</span>
            </div>
          </div>

          <form onSubmit={submit} className="feedback-form-grid">
            <label>
              问题标题
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="例：移动端导航拥挤" />
            </label>
            <label>
              观察洞察
              <textarea value={draft.insight} onChange={(e) => setDraft((d) => ({ ...d, insight: e.target.value }))} rows={3} placeholder="现象 + 假设 + 预期提升" />
            </label>
            <div className="feedback-row">
              <label>类别<select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>{CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>优先级<select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>{PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
            </div>
            <div className="feedback-row">
              <label>投入<select value={draft.effort} onChange={(e) => setDraft((d) => ({ ...d, effort: e.target.value }))}>{EFFORT_OPTIONS.map((e) => <option key={e}>{e}</option>)}</select></label>
              <label>信心(1-5)<input type="number" min="1" max="5" value={draft.confidence} onChange={(e) => setDraft((d) => ({ ...d, confidence: Number(e.target.value) || 1 }))} /></label>
            </div>
            <label>验证指标<input value={draft.metric} onChange={(e) => setDraft((d) => ({ ...d, metric: e.target.value }))} /></label>
            <button type="submit" className="feedback-submit-btn">创建实验卡片</button>
          </form>

          <div className="status-tabs">
            {STATUS_OPTIONS.map((status) => (
              <button key={status} className={activeStatus === status ? "active" : ""} onClick={() => setActiveStatus(status)}>
                {status} ({board[status].length})
              </button>
            ))}
          </div>

          <div className="feedback-list">
            {board[activeStatus].length === 0 ? (
              <p className="empty-hint">当前状态无卡片，继续添加新的 UI/UE 假设。</p>
            ) : (
              board[activeStatus].map((item) => (
                <article key={item.id} className="feedback-item pro-item">
                  <div className="feedback-item-head">
                    <strong>{item.title}</strong>
                    <span>Score: {calcScore(item)}</span>
                  </div>
                  <p>{item.insight}</p>
                  <p className="meta">{item.category} · {item.priority} · Effort {item.effort} · 指标: {item.metric}</p>
                  <div className="item-actions">
                    <button type="button" onClick={() => updateStatus(item.id, -1)}>← 回退</button>
                    <button type="button" onClick={() => updateStatus(item.id, 1)}>推进 →</button>
                    <button type="button" onClick={() => archive(item.id)}>归档</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
