import { useState, useMemo, useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import CASES from './data'
import './App.css'

const P_META = {
  1: { label: 'P1 Urgent', cls: 'p1-badge' },
  2: { label: 'P2 High',   cls: 'p2-badge' },
  3: { label: 'P3 Stuck',  cls: 'p3-badge' },
  4: { label: 'P4 Monitor',cls: 'p4-badge' },
  5: { label: 'P5 Unreviewed', cls: 'p5-badge' },
}

function fmt(n) {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

function TagPill({ tag }) {
  if (!tag) return <span className="tag-none">—</span>
  const map = { rp_honor:'tag-honor', rp_agency:'tag-agency', rp_insured:'tag-insured', cancelled:'tag-cancelled', not_cancelled:'tag-not-cancelled' }
  return <span className={`tag-pill ${map[tag] || 'tag-cancelled'}`}>{tag}</span>
}

function ActionDropdown({ row, onAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function act(key) { onAction(row.id, key); setOpen(false) }

  return (
    <div className="action-wrap" ref={ref}>
      <button className="action-btn" onClick={() => setOpen(o => !o)}>Actions ▾</button>
      {open && (
        <div className="dropdown">
          {row.pylonId && (
            <a className="dropdown-item pylon" href={row.pylonId} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              Open in Pylon ↗
            </a>
          )}
          <button className="dropdown-item" onClick={() => act('outreach')}>Log Outreach</button>
          <div className="dropdown-sep" />
          <button className="dropdown-item" onClick={() => act('tag_honor')}>Tag: rp_honor</button>
          <button className="dropdown-item" onClick={() => act('tag_agency')}>Tag: rp_agency</button>
          <button className="dropdown-item" onClick={() => act('tag_notcancelled')}>Tag: not_cancelled</button>
          {row.handedToHonor !== 'handed_off' && (
            <button className="dropdown-item" onClick={() => act('hand_honor')}>Hand to Honor</button>
          )}
          {row.priority > 1 && (
            <>
              <div className="dropdown-sep" />
              <button className="dropdown-item urgent" onClick={() => act('escalate')}>Escalate → P1 Urgent</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

// ── QUEUE TAB ──────────────────────────────────────────────────────────────────

function QueueTab() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('priority')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])

  const counts = useMemo(() => {
    const c = { all: CASES.length }
    CASES.forEach(x => { c[x.priority] = (c[x.priority] || 0) + 1 })
    return c
  }, [])

  const p1Total = useMemo(() => CASES.filter(c => c.priority === 1).reduce((s, c) => s + c.accountBalance, 0), [])

  const filtered = useMemo(() => {
    let r = [...CASES]
    if (filter !== 'all') r = r.filter(c => c.priority === Number(filter))
    if (search) {
      const s = search.toLowerCase()
      r = r.filter(c => c.business.toLowerCase().includes(s) || c.org.toLowerCase().includes(s))
    }
    if (sort === 'balance') r.sort((a, b) => b.accountBalance - a.accountBalance)
    else if (sort === 'days') r.sort((a, b) => b.daysSinceCancel - a.daysSinceCancel)
    else r.sort((a, b) => a.priority - b.priority || b.accountBalance - a.accountBalance)
    return r
  }, [filter, sort, search])

  function addToast(msg) {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
  }

  function handleAction(caseId, action) {
    const msgs = { outreach: 'Outreach logged', tag_honor: 'Tagged: rp_honor', tag_agency: 'Tagged: rp_agency', tag_notcancelled: 'Tagged: not_cancelled', hand_honor: 'Handed to Honor', escalate: 'Escalated to P1 Urgent' }
    addToast(msgs[action] || 'Action recorded')
  }

  const filterBtns = [
    { key: 'all', label: 'All', style: {} },
    { key: 1, label: 'P1 Urgent', style: { color: '#f85149' } },
    { key: 2, label: 'P2 High',   style: { color: '#f0883e' } },
    { key: 3, label: 'P3 Stuck',  style: { color: '#e3b341' } },
    { key: 4, label: 'P4 Monitor',style: { color: '#8b949e' } },
    { key: 5, label: 'P5 Unreviewed', style: { color: '#58a6ff' } },
  ]

  return (
    <>
      <div className="queue-header">
        <div>
          <div className="queue-label">9AM Operating Queue</div>
          <div className="queue-title">Cases Sarah should act on first</div>
        </div>
        <span className="p1-rule">P1 rule: rp_honor + not handed to Honor</span>
      </div>

      <div className="summary-strip">
        <div className="stat-card">
          <div className="stat-label">P1 Urgent</div>
          <div className="stat-val red">{counts[1]}</div>
          <div className="stat-sub">fiduciary · act today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">P1 Dollar Value</div>
          <div className="stat-val red">{fmt(p1Total)}</div>
          <div className="stat-sub">loan-backed RP</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">P2 High</div>
          <div className="stat-val orange">{counts[2]}</div>
          <div className="stat-sub">30+ days, no outreach</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">P3 Stuck</div>
          <div className="stat-val yellow">{counts[3]}</div>
          <div className="stat-sub">awaiting supplier update</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">P4 Monitor</div>
          <div className="stat-val" style={{ color: '#8b949e' }}>{counts[4]}</div>
          <div className="stat-sub">Honor driving</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">P5 Unreviewed</div>
          <div className="stat-val" style={{ color: '#58a6ff' }}>{counts[5]}</div>
          <div className="stat-sub">needs triage</div>
        </div>
      </div>

      <div className="filter-bar">
        {filterBtns.map(b => (
          <button key={b.key} className={`filter-btn ${filter === b.key ? 'active' : ''}`} style={b.style} onClick={() => setFilter(b.key)}>
            {b.label} <span className="filter-count">{counts[b.key] ?? 0}</span>
          </button>
        ))}
        <input className="search-input" type="text" placeholder="Search business or org..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="sort-bar">
        <span className="sort-label">Sort:</span>
        {[{ k: 'priority', l: 'Priority' }, { k: 'balance', l: 'Dollar Value ↓' }, { k: 'days', l: 'Days Since Cancel ↓' }].map(s => (
          <button key={s.k} className={`sort-btn ${sort === s.k ? 'active' : ''}`} onClick={() => setSort(s.k)}>{s.l}</button>
        ))}
      </div>

      <div className="showing-info">Showing {filtered.length} of {CASES.length} cases</div>

      {filtered.length === 0
        ? <div className="empty-state">No cases match your filter.</div>
        : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Business / Policy</th>
                  <th>Org</th>
                  <th>Days</th>
                  <th>Carrier / Wholesaler</th>
                  <th>Account Balance</th>
                  <th>Tag</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const daysClass = row.daysSinceCancel >= 90 ? 'stale' : row.daysSinceCancel >= 60 ? 'warn' : ''
                  return (
                    <tr key={row.id}>
                      <td><span className={`p-badge ${P_META[row.priority].cls}`}>● {P_META[row.priority].label}</span></td>
                      <td>
                        <div className="biz-name">{row.business}</div>
                        <div className="biz-policy">{row.policy}</div>
                      </td>
                      <td><span className="org-pill">{row.org}</span></td>
                      <td><span className={`days-val ${daysClass}`}>{row.daysSinceCancel}</span></td>
                      <td>
                        <div className="carrier-name">
                          {row.carrier}
                          {row.carrierEmail && <span style={{ color: '#58a6ff', fontSize: 10, marginLeft: 4 }}>✉</span>}
                        </div>
                        <div className="carrier-sub">{row.wholesaler || 'Direct carrier'}</div>
                      </td>
                      <td>
                        <div className={`balance ${row.accountBalance >= 50000 ? 'large' : ''}`}>{fmt(row.accountBalance)}</div>
                        {row.loanBalance && <div className="balance-loan">Loan: {fmt(row.loanBalance)}</div>}
                      </td>
                      <td><TagPill tag={row.tag} /></td>
                      <td><ActionDropdown row={row} onAction={handleAction} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} msg={t.msg} onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </>
  )
}

// ── DATA HEALTH TAB ────────────────────────────────────────────────────────────

function DataHealthTab() {
  const priorityRef = useRef(null)
  const orgsRef = useRef(null)

  const priorityTotals = useMemo(() => {
    const t = {}
    CASES.forEach(c => { t[c.priority] = (t[c.priority] || 0) + c.accountBalance })
    return [1, 2, 3, 4, 5].map(p => Math.round(t[p] || 0))
  }, [])

  const topOrgs = useMemo(() => {
    const t = {}
    CASES.forEach(c => { t[c.org] = (t[c.org] || 0) + c.accountBalance })
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [])

  useEffect(() => {
    if (!priorityRef.current) return
    const chart = new Chart(priorityRef.current, {
      type: 'bar',
      data: {
        labels: ['P1 Urgent', 'P2 High', 'P3 Stuck', 'P4 Monitor', 'P5 Unreviewed'],
        datasets: [{
          data: priorityTotals,
          backgroundColor: ['rgba(248,81,73,.45)', 'rgba(240,136,62,.45)', 'rgba(227,179,65,.45)', 'rgba(139,148,158,.35)', 'rgba(88,166,255,.35)'],
          borderColor: ['#f85149', '#f0883e', '#e3b341', '#8b949e', '#58a6ff'],
          borderWidth: 1,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 10 }, callback: v => '$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(33,38,45,.9)' } },
          y: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { display: false } },
        },
      },
    })
    return () => chart.destroy()
  }, [priorityTotals])

  useEffect(() => {
    if (!orgsRef.current) return
    const chart = new Chart(orgsRef.current, {
      type: 'bar',
      data: {
        labels: topOrgs.map(o => o[0]),
        datasets: [{
          data: topOrgs.map(o => Math.round(o[1])),
          backgroundColor: 'rgba(88,166,255,.35)',
          borderColor: '#58a6ff',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { color: '#8b949e', font: { size: 10 }, callback: v => '$' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(33,38,45,.9)' } },
          x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { display: false } },
        },
      },
    })
    return () => chart.destroy()
  }, [topOrgs])

  return (
    <>
      <div className="section-title">Queue Overview</div>
      <div className="metrics-grid">
        <div className="stat-card"><div className="stat-label">Total Open Cases</div><div className="stat-val">277</div><div className="stat-sub">across 21 customer orgs</div></div>
        <div className="stat-card"><div className="stat-label">Total RP at Stake</div><div className="stat-val green">$2.06M</div><div className="stat-sub">return premium outstanding</div></div>
        <div className="stat-card"><div className="stat-label">P1 Fiduciary Risk</div><div className="stat-val red">$663,518</div><div className="stat-sub">31 cases · owed to Honor</div></div>
        <div className="stat-card"><div className="stat-label">Untagged Cases</div><div className="stat-val orange">101</div><div className="stat-sub">36% of queue · no triage</div></div>
        <div className="stat-card"><div className="stat-label">No Outreach Logged</div><div className="stat-val orange">235</div><div className="stat-sub">85% · may be untouched</div></div>
        <div className="stat-card"><div className="stat-label">Stuck at Supplier</div><div className="stat-val yellow">54</div><div className="stat-sub">not_cancelled · RP blocked</div></div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-title">Priority Breakdown</div>
          <canvas ref={priorityRef} height="200" />
        </div>
        <div className="chart-card">
          <div className="chart-title">Top 5 Orgs by Balance</div>
          <canvas ref={orgsRef} height="200" />
        </div>
      </div>

      <div className="section-title">Data Gaps &amp; Structural Issues</div>
      <div className="gap-grid">
        <div className="gap-card" style={{ borderLeftColor: '#f85149' }}>
          <div className="gap-title" style={{ color: '#f85149' }}>Honor mismatch — 2 different stages</div>
          <div className="gap-body"><strong>160 cases</strong> marked handed_off. Only <strong>40 tagged rp_honor</strong>. These track different things: rp_honor = carrier confirmed RP is flowing (still monitored). handed_off = Ascend escalated because it couldn't collect. 9 cases overlap. This two-stage funnel is invisible in the current tool — Sarah holds it in her head.</div>
        </div>
        <div className="gap-card">
          <div className="gap-title">No definition of "done"</div>
          <div className="gap-body">There is no resolution flag in the data. Cases enter the queue when a policy cancels. Nothing formally closes them. The queue <strong>only grows</strong>. Without a definition of done enforced in tooling, Sarah's 90 minutes gets thinner every week.</div>
        </div>
        <div className="gap-card">
          <div className="gap-title">101 untagged cases = unknown state</div>
          <div className="gap-body"><strong>92 of 101</strong> untagged cases are "not_started" in funnel. These have never been triaged. None have a loan balance — suggesting Sarah prioritises financed cases first and runs out of time. Estimated <strong>3–4 hours</strong> of review backlog.</div>
        </div>
        <div className="gap-card">
          <div className="gap-title">127 cases missing carrier email</div>
          <div className="gap-body"><strong>46% of cases</strong> have no carrier email on file. If the wholesaler goes silent, there is no escalation path available in the system. Sarah has to find contacts manually, costing time on every stuck case.</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '28px 0' }} />

      <div className="section-title">Automation Opportunity</div>
      <div className="gap-grid">
        <div className="gap-card" style={{ borderLeftColor: '#3fb950' }}>
          <div className="gap-title" style={{ color: '#3fb950' }}>rp_honor — fully automatable today</div>
          <div className="gap-body"><strong>100% correlation</strong>: every case with a Loan Balance Remaining value is tagged rp_honor — no exceptions. This tag requires zero human judgment. A single rule derivable from existing data. Sarah is manually applying a tag the system could auto-generate.</div>
        </div>
        <div className="gap-card" style={{ borderLeftColor: '#e3b341' }}>
          <div className="gap-title" style={{ color: '#e3b341' }}>not_cancelled — partially automatable</div>
          <div className="gap-body">This tag signals the supplier hasn't updated their system yet. Could be auto-applied when Ascend's system shows canceled_program but no supplier confirmation exists. Requires a <strong>supplier sync signal</strong> — a feed indicating whether the carrier/wholesaler has confirmed the cancellation on their end.</div>
        </div>
      </div>
    </>
  )
}

// ── APP ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('queue')

  return (
    <>
      <header className="header">
        <div className="logo">
          <div className="logo-dot" />
          Ascend Ops
        </div>
        <div className="header-meta">
          <span>277</span> open cases &nbsp;·&nbsp; <span>$2,060,988</span> at stake &nbsp;·&nbsp; Last updated: May 12, 2026
        </div>
      </header>

      <div className="tabs">
        <div className={`tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>Sarah's Queue</div>
        <div className={`tab ${tab === 'health' ? 'active' : ''}`} onClick={() => setTab('health')}>Data Health</div>
      </div>

      <div className="content">
        {tab === 'queue' && <QueueTab />}
        {tab === 'health' && <DataHealthTab />}
      </div>

      <footer className="footer">
        Submitted for Ascend · Product Operations Lead · Take Home Assignment &nbsp;·&nbsp; Anirvan Bordoloi
      </footer>
    </>
  )
}
