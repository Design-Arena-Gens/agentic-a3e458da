"use client";

import { useEffect, useMemo, useState } from "react";

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

function Section({ title, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function Page() {
  // Tasks
  const [tasks, setTasks] = useLocalStorage("life:tasks", []);
  const [taskText, setTaskText] = useState("");
  const addTask = () => {
    const t = taskText.trim();
    if (!t) return;
    setTasks([{ id: uid(), text: t, done: false, createdAt: Date.now() }, ...tasks]);
    setTaskText("");
  };
  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  // Notes (Quick Capture)
  const [notes, setNotes] = useLocalStorage("life:notes", []);
  const [noteText, setNoteText] = useState("");
  const addNote = () => {
    const t = noteText.trim();
    if (!t) return;
    setNotes([{ id: uid(), text: t, at: Date.now() }, ...notes]);
    setNoteText("");
  };
  const deleteNote = (id) => setNotes(notes.filter(n => n.id !== id));

  // Habits
  const [habits, setHabits] = useLocalStorage("life:habits", [
    { id: uid(), name: "Move", log: {} },
    { id: uid(), name: "Read", log: {} },
    { id: uid(), name: "Mindfulness", log: {} }
  ]);
  const addHabit = (name) => setHabits([{ id: uid(), name, log: {} }, ...habits]);
  const [newHabit, setNewHabit] = useState("");
  const toggleHabitToday = (id) => {
    const k = todayKey();
    setHabits(habits.map(h => h.id === id ? { ...h, log: { ...h.log, [k]: !h.log[k] } } : h));
  };
  const removeHabit = (id) => setHabits(habits.filter(h => h.id !== id));
  const habitStreak = (h) => {
    let streak = 0;
    let d = new Date();
    for (;;) {
      const k = todayKey(d);
      if (h.log[k]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  };

  // Goals
  const [goals, setGoals] = useLocalStorage("life:goals", []);
  const [goalName, setGoalName] = useState("");
  const addGoal = () => {
    const n = goalName.trim();
    if (!n) return;
    setGoals([{ id: uid(), name: n, progress: 0 }, ...goals]);
    setGoalName("");
  };
  const setGoalProgress = (id, p) => setGoals(goals.map(g => g.id === id ? { ...g, progress: Math.max(0, Math.min(100, Number(p)||0)) } : g));
  const deleteGoal = (id) => setGoals(goals.filter(g => g.id !== id));

  // Health (Weight, Sleep)
  const [health, setHealth] = useLocalStorage("life:health", { entries: {} });
  const hk = todayKey();
  const w = health.entries[hk]?.weight ?? "";
  const s = health.entries[hk]?.sleep ?? "";
  const updateHealth = (field, value) => {
    setHealth(({ entries }) => ({ entries: { ...entries, [hk]: { ...(entries[hk]||{}), [field]: value } } }));
  };
  const last7 = useMemo(() => {
    const arr = [];
    const d = new Date();
    for (let i=0;i<7;i++){
      const k = todayKey(d);
      arr.unshift({ k, data: health.entries[k] });
      d.setDate(d.getDate()-1);
    }
    return arr;
  }, [health]);

  // Finance (simple ledger + month summary)
  const [tx, setTx] = useLocalStorage("life:finance", []);
  const [txForm, setTxForm] = useState({ type: "expense", amount: "", category: "", note: "" });
  const addTx = () => {
    const amount = Number(txForm.amount);
    if (!amount) return;
    setTx([{ id: uid(), date: todayKey(), ...txForm, amount }, ...tx]);
    setTxForm({ type: "expense", amount: "", category: "", note: "" });
  };
  const month = monthKey();
  const monthTotals = useMemo(() => {
    let income=0, expense=0;
    for (const t of tx) if ((t.date||"").startsWith(month)) {
      if (t.type === "income") income += t.amount; else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [tx, month]);
  const deleteTx = (id) => setTx(tx.filter(t => t.id !== id));

  // Events (Agenda)
  const [events, setEvents] = useLocalStorage("life:events", []);
  const [eventForm, setEventForm] = useState({ title: "", date: todayKey(), time: "", note: "" });
  const addEvent = () => {
    const t = eventForm.title.trim();
    if (!t) return;
    setEvents([{ id: uid(), ...eventForm }, ...events]);
    setEventForm({ title: "", date: todayKey(), time: "", note: "" });
  };
  const deleteEvent = (id) => setEvents(events.filter(e => e.id !== id));

  // Journal (per day)
  const [journal, setJournal] = useLocalStorage("life:journal", {});
  const journalText = journal[hk] || "";
  const setJournalText = (v) => setJournal({ ...journal, [hk]: v });

  // Backup (Export/Import)
  const exportAll = () => {
    const data = {
      tasks, notes, habits, goals, health, tx, events, journal
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `life-dashboard-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importAll = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.tasks) setTasks(data.tasks);
      if (data.notes) setNotes(data.notes);
      if (data.habits) setHabits(data.habits);
      if (data.goals) setGoals(data.goals);
      if (data.health) setHealth(data.health);
      if (data.tx) setTx(data.tx);
      if (data.events) setEvents(data.events);
      if (data.journal) setJournal(data.journal);
    } catch {}
  };

  return (
    <div className="container">
      <header className="header">
        <div className="row" style={{alignItems:'center'}}>
          <span className="badge">{todayKey()}</span>
          <div className="brand">All Life Dashboard</div>
        </div>
        <div className="toolbar">
          <button className="ghost" onClick={exportAll}>Export</button>
          <label className="ghost" style={{border:"1px solid var(--border)",padding:"8px 10px",borderRadius:10,cursor:'pointer'}}>
            Import
            <input type="file" accept="application/json" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&importAll(e.target.files[0])}/>
          </label>
        </div>
      </header>

      <main className="grid">
        <Section title="Quick Capture" className="span-8">
          <div className="row">
            <input placeholder="Capture a thought..." value={noteText} onChange={e=>setNoteText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()} />
            <button className="primary" onClick={addNote}>Add</button>
          </div>
          <div className="list">
            {notes.slice(0,6).map(n=> (
              <div key={n.id} className="item">
                <div style={{flex:1}}>{n.text}</div>
                <div className="small">{new Date(n.at).toLocaleTimeString()}</div>
                <button onClick={()=>deleteNote(n.id)}>?</button>
              </div>
            ))}
            {notes.length===0 && <div className="small">No notes yet.</div>}
          </div>
        </Section>

        <Section title="Tasks" className="span-4">
          <div className="row">
            <input placeholder="New task" value={taskText} onChange={e=>setTaskText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()} />
            <button className="primary" onClick={addTask}>Add</button>
          </div>
          <div className="list">
            {tasks.slice(0,8).map(t => (
              <div key={t.id} className="item">
                <label style={{flex:1, display:'flex', alignItems:'center', gap:8}}>
                  <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} />
                  <span style={{textDecoration: t.done? 'line-through':'none', opacity:t.done?0.6:1}}>{t.text}</span>
                </label>
                <button onClick={()=>deleteTask(t.id)}>?</button>
              </div>
            ))}
            {tasks.length===0 && <div className="small">You are free today ?</div>}
          </div>
        </Section>

        <Section title="Habits" className="span-4">
          <div className="row">
            <input placeholder="Add habit (e.g., Hydrate)" value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newHabit.trim()){addHabit(newHabit.trim());setNewHabit("")}}} />
            <button onClick={()=>{if(newHabit.trim()){addHabit(newHabit.trim());setNewHabit("")}}}>Add</button>
          </div>
          <div className="list">
            {habits.map(h => (
              <div key={h.id} className="item">
                <div style={{display:'flex',gap:8,alignItems:'center',flex:1}}>
                  <button className="primary" onClick={()=>toggleHabitToday(h.id)} style={{padding:'6px 10px'}}>{h.log[hk]? 'Done':'Do'}</button>
                  <div>
                    <div>{h.name}</div>
                    <div className="small">Streak: {habitStreak(h)}d</div>
                  </div>
                </div>
                <button onClick={()=>removeHabit(h.id)}>?</button>
              </div>
            ))}
            {habits.length===0 && <div className="small">Add your first habit.</div>}
          </div>
        </Section>

        <Section title="Goals" className="span-4">
          <div className="row">
            <input placeholder="New goal" value={goalName} onChange={e=>setGoalName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addGoal()} />
            <button onClick={addGoal}>Add</button>
          </div>
          <div className="list">
            {goals.map(g => (
              <div key={g.id} className="item" style={{alignItems:'center'}}>
                <div style={{flex:1}}>{g.name}</div>
                <div className="small" style={{width:56,textAlign:'right'}}>{g.progress}%</div>
                <input type="range" min="0" max="100" value={g.progress} onChange={e=>setGoalProgress(g.id, e.target.value)} style={{width:140}} />
                <button onClick={()=>deleteGoal(g.id)}>?</button>
              </div>
            ))}
            {goals.length===0 && <div className="small">Define a goal to chase.</div>}
          </div>
        </Section>

        <Section title="Health" className="span-6">
          <div className="row">
            <input placeholder="Weight (kg)" value={w} onChange={e=>updateHealth('weight', e.target.value)} />
            <input placeholder="Sleep (h)" value={s} onChange={e=>updateHealth('sleep', e.target.value)} />
          </div>
          <div className="list">
            {last7.map(({k, data})=> (
              <div key={k} className="item">
                <div className="badge">{k}</div>
                <div style={{flex:1}} className="small">{data? `Weight ${data.weight||'-'}kg ? Sleep ${data.sleep||'-'}h` : '?'}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Finance" className="span-6">
          <div className="row">
            <select value={txForm.type} onChange={e=>setTxForm(f=>({...f, type:e.target.value}))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input placeholder="Amount" value={txForm.amount} onChange={e=>setTxForm(f=>({...f, amount:e.target.value}))} />
            <input placeholder="Category" value={txForm.category} onChange={e=>setTxForm(f=>({...f, category:e.target.value}))} />
            <input placeholder="Note" value={txForm.note} onChange={e=>setTxForm(f=>({...f, note:e.target.value}))} />
            <button onClick={addTx}>Add</button>
          </div>
          <div className="kpi"><b>?{monthTotals.net.toFixed(0)}</b><span className="small">net</span><span className="badge">{month}</span></div>
          <div className="small">Income ?{monthTotals.income.toFixed(0)} ? Expense ?{monthTotals.expense.toFixed(0)}</div>
          <hr className="sep" />
          <div className="list">
            {tx.slice(0,7).map(t => (
              <div key={t.id} className="item">
                <div className="badge">{t.date}</div>
                <div style={{flex:1}}>{t.category||t.type}</div>
                <div className="small" style={{width:100, textAlign:'right', color: t.type==='income'? 'var(--ok)':'var(--bad)'}}>
                  {t.type==='income'? '+':'-'}?{t.amount.toFixed(0)}
                </div>
                <button onClick={()=>deleteTx(t.id)}>?</button>
              </div>
            ))}
            {tx.length===0 && <div className="small">Track money with intent.</div>}
          </div>
        </Section>

        <Section title="Agenda" className="span-6">
          <div className="row">
            <input placeholder="Title" value={eventForm.title} onChange={e=>setEventForm(f=>({...f, title:e.target.value}))} />
            <input type="date" value={eventForm.date} onChange={e=>setEventForm(f=>({...f, date:e.target.value}))} />
            <input type="time" value={eventForm.time} onChange={e=>setEventForm(f=>({...f, time:e.target.value}))} />
            <button onClick={addEvent}>Add</button>
          </div>
          <div className="list">
            {events.slice(0,7).map(ev => (
              <div key={ev.id} className="item">
                <div className="badge">{ev.date}{ev.time? ` ${ev.time}`: ''}</div>
                <div style={{flex:1}}>{ev.title}</div>
                <button onClick={()=>deleteEvent(ev.id)}>?</button>
              </div>
            ))}
            {events.length===0 && <div className="small">Nothing upcoming yet.</div>}
          </div>
        </Section>

        <Section title="Journal" className="span-6">
          <textarea rows={6} placeholder="Daily reflections..." value={journalText} onChange={e=>setJournalText(e.target.value)} />
        </Section>
      </main>

      <footer>Local-only storage. Export regularly for backups.</footer>
    </div>
  );
}
