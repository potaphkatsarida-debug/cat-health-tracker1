
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Cat, PawPrint, Plus, Pill, HeartPulse, AlertTriangle, Camera,
  Trash2, Save, Download, Upload, Home, ClipboardList, Clock,
  FileText, Search, Sparkles, Moon, Sun, Scale, CalendarClock,
  BellRing, CheckCircle2, Pencil, X, RotateCcw
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import './styles.css'

const STORAGE_KEY = 'cat-care-tracker-STABLE-v1'
const OLD_KEYS = [
  'alexia-cat-care-tracker-v1-3',
  'alexia-cat-care-tracker-v1-2',
  'alexia-cat-care-tracker-final-v1',
  'alexia-cat-care-tracker-v1',
  'alexia-cat-care-tracker-v1-2-edit-profile'
]

const defaultCats = [
  {
    id: crypto.randomUUID(),
    name: 'Πουσαισυ',
    age: '13',
    weight: '7.7',
    sex: 'Αρσενικός',
    neutered: 'ναι',
    description: 'Άρχοντας του καναπέ',
    conditions: 'Χρόνια δυσκοιλιότητα, αρθρίτιδα στη σπονδυλική στήλη, λιπώδης διήθηση ήπατος.',
    notes: 'Παρακολούθηση κοπράνων, όρεξης, κινητικότητας και κοιλιακής διάτασης.',
    photo: ''
  },
  {
    id: crypto.randomUUID(),
    name: 'Σίσου',
    age: '5',
    weight: '4.4',
    sex: 'Αρσενικός',
    neutered: 'όχι/άγνωστο',
    description: 'Ευαίσθητος κύριος',
    conditions: 'Ευαίσθητο γαστρεντερικό, ιστορικό κυστίτιδας/αιματουρίας.',
    notes: 'Παρακολούθηση ούρων, στρες, όρεξης και διαρροιών.',
    photo: ''
  }
]

function freshData() {
  return {
    cats: defaultCats,
    meds: [],
    medEvents: [],
    logs: [],
    weights: [],
    settings: { darkMode: false }
  }
}

function normalizeCat(cat) {
  return {
    id: cat.id || crypto.randomUUID(),
    name: cat.name || '',
    age: cat.age || '',
    weight: cat.weight || '',
    sex: cat.sex || '',
    neutered: cat.neutered || '',
    description: cat.description || '',
    conditions: cat.conditions || '',
    notes: cat.notes || '',
    photo: cat.photo || ''
  }
}

function normalizeData(parsed) {
  return {
    cats: Array.isArray(parsed?.cats) ? parsed.cats.map(normalizeCat) : [],
    meds: Array.isArray(parsed?.meds) ? parsed.meds : [],
    medEvents: Array.isArray(parsed?.medEvents) ? parsed.medEvents : [],
    logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
    weights: Array.isArray(parsed?.weights) ? parsed.weights : [],
    settings: parsed?.settings || { darkMode: false }
  }
}

function loadData() {
  const current = localStorage.getItem(STORAGE_KEY)
  if (current) {
    try {
      const parsed = normalizeData(JSON.parse(current))
      if (parsed.cats.length) return parsed
    } catch {}
  }

  for (const key of OLD_KEYS) {
    const old = localStorage.getItem(key)
    if (!old) continue
    try {
      const parsed = normalizeData(JSON.parse(old))
      if (parsed.cats.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        return parsed
      }
    } catch {}
  }

  return freshData()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nowIso() {
  return new Date().toISOString()
}

function niceDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('el-GR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function newest(items, field = 'date') {
  return [...items].sort((a, b) => String(b[field]).localeCompare(String(a[field])))
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function dueStatus(med, events) {
  if (!med.frequencyHours) return { label: 'Χωρίς πρόγραμμα', level: 'neutral' }
  const catEvents = newest(events.filter(e => e.medId === med.id), 'givenAt')
  const last = catEvents[0]
  const hours = Number(med.frequencyHours)
  if (!last) return { label: 'Δεν έχει δοθεί ακόμα', level: 'neutral' }
  const elapsed = (Date.now() - new Date(last.givenAt).getTime()) / 36e5
  if (elapsed > hours + 2) return { label: `Πέρασε το πρόγραμμα (${Math.round(elapsed - hours)}h)`, level: 'warn' }
  if (elapsed > hours - 1) return { label: 'Πλησιάζει ώρα', level: 'warn' }
  return { label: `ΟΚ (${Math.max(0, Math.round(hours - elapsed))}h)`, level: 'ok' }
}

function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('home')
  const [selectedCatId, setSelectedCatId] = useState(data.cats[0]?.id || '')
  const [query, setQuery] = useState('')
  const [editingCatId, setEditingCatId] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    document.documentElement.classList.toggle('dark', !!data.settings?.darkMode)
  }, [data])

  useEffect(() => {
    if (!selectedCatId && data.cats[0]) setSelectedCatId(data.cats[0].id)
  }, [data.cats, selectedCatId])

  const selectedCat = data.cats.find(c => c.id === selectedCatId)
  const editingCat = data.cats.find(c => c.id === editingCatId)
  const catLogs = newest(data.logs.filter(l => l.catId === selectedCatId), 'date')
  const catMeds = data.meds.filter(m => m.catId === selectedCatId)
  const catEvents = newest(data.medEvents.filter(e => e.catId === selectedCatId), 'givenAt')
  const catWeights = newest(data.weights.filter(w => w.catId === selectedCatId), 'date').reverse()
  const alerts = useMemo(() => buildAlerts(data), [data])

  function flashSaved(text = 'Αποθηκεύτηκε') {
    setSaveMessage(text)
    setTimeout(() => setSaveMessage(''), 1800)
  }

  function updateSettings(patch) {
    setData(d => ({ ...d, settings: { ...d.settings, ...patch } }))
  }

  function addCat(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const cat = normalizeCat({
      id: crypto.randomUUID(),
      name: String(form.get('name') || '').trim(),
      age: String(form.get('age') || '').trim(),
      weight: String(form.get('weight') || '').trim(),
      sex: String(form.get('sex') || '').trim(),
      neutered: String(form.get('neutered') || '').trim(),
      description: String(form.get('description') || '').trim(),
      conditions: String(form.get('conditions') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
      photo: ''
    })
    if (!cat.name) return alert('Βάλε όνομα γάτας πρώτα.')
    setData(d => ({ ...d, cats: [...d.cats, cat] }))
    setSelectedCatId(cat.id)
    flashSaved('Προστέθηκε γάτα')
    event.currentTarget.reset()
  }

  function updateCat(event) {
    event.preventDefault()
    if (!editingCat) return
    const form = new FormData(event.currentTarget)
    const patch = {
      name: String(form.get('name') || '').trim(),
      age: String(form.get('age') || '').trim(),
      weight: String(form.get('weight') || '').trim(),
      sex: String(form.get('sex') || '').trim(),
      neutered: String(form.get('neutered') || '').trim(),
      description: String(form.get('description') || '').trim(),
      conditions: String(form.get('conditions') || '').trim(),
      notes: String(form.get('notes') || '').trim()
    }
    if (!patch.name) return alert('Το όνομα δεν μπορεί να είναι κενό.')

    const updatedId = editingCat.id
    setData(d => ({
      ...d,
      cats: d.cats.map(c => c.id === updatedId ? normalizeCat({ ...c, ...patch }) : c)
    }))
    setSelectedCatId(updatedId)
    setEditingCatId(null)
    flashSaved('Οι αλλαγές αποθηκεύτηκαν')
  }

  async function setCatPhoto(catId, file) {
    if (!file) return
    const photo = await fileToBase64(file)
    setData(d => ({ ...d, cats: d.cats.map(c => c.id === catId ? { ...c, photo } : c) }))
    flashSaved('Η φωτογραφία αποθηκεύτηκε')
  }

  function deleteCat(catId) {
    if (!confirm('Να διαγραφεί αυτή η γάτα μαζί με φάρμακα και ιστορικό;')) return
    setData(d => ({
      ...d,
      cats: d.cats.filter(c => c.id !== catId),
      meds: d.meds.filter(m => m.catId !== catId),
      medEvents: d.medEvents.filter(e => e.catId !== catId),
      logs: d.logs.filter(l => l.catId !== catId),
      weights: d.weights.filter(w => w.catId !== catId)
    }))
    setSelectedCatId(data.cats.find(c => c.id !== catId)?.id || '')
    if (editingCatId === catId) setEditingCatId(null)
  }

  function addMed(event) {
    event.preventDefault()
    if (!selectedCatId) return alert('Διάλεξε γάτα πρώτα.')
    const form = new FormData(event.currentTarget)
    const med = {
      id: crypto.randomUUID(),
      catId: selectedCatId,
      name: String(form.get('name') || '').trim(),
      dose: String(form.get('dose') || '').trim(),
      frequency: String(form.get('frequency') || '').trim(),
      frequencyHours: String(form.get('frequencyHours') || '').trim(),
      start: String(form.get('start') || '').trim(),
      end: String(form.get('end') || '').trim(),
      notes: String(form.get('notes') || '').trim()
    }
    if (!med.name) return alert('Βάλε όνομα φαρμάκου.')
    setData(d => ({ ...d, meds: [...d.meds, med] }))
    flashSaved('Προστέθηκε φάρμακο')
    event.currentTarget.reset()
  }

  function markGiven(med) {
    const ev = {
      id: crypto.randomUUID(),
      catId: med.catId,
      medId: med.id,
      medName: med.name,
      dose: med.dose,
      givenAt: nowIso()
    }
    setData(d => ({ ...d, medEvents: [ev, ...d.medEvents] }))
    flashSaved('Καταγράφηκε χορήγηση')
  }

  function deleteMed(id) {
    setData(d => ({
      ...d,
      meds: d.meds.filter(m => m.id !== id),
      medEvents: d.medEvents.filter(e => e.medId !== id)
    }))
  }

  function addLog(event) {
    event.preventDefault()
    if (!selectedCatId) return alert('Διάλεξε γάτα πρώτα.')
    const form = new FormData(event.currentTarget)
    const log = {
      id: crypto.randomUUID(),
      catId: selectedCatId,
      date: String(form.get('date') || today()),
      appetite: String(form.get('appetite') || 'καλή'),
      water: String(form.get('water') || 'φυσιολογικό'),
      urine: String(form.get('urine') || 'φυσιολογικά'),
      stool: String(form.get('stool') || 'φυσιολογικά'),
      vomiting: String(form.get('vomiting') || 'όχι'),
      mood: String(form.get('mood') || 'φυσιολογική'),
      pain: String(form.get('pain') || 'όχι εμφανής'),
      notes: String(form.get('notes') || '').trim(),
      createdAt: nowIso()
    }
    setData(d => ({ ...d, logs: [log, ...d.logs] }))
    flashSaved('Αποθηκεύτηκε εγγραφή')
    event.currentTarget.reset()
  }

  function deleteLog(id) {
    setData(d => ({ ...d, logs: d.logs.filter(l => l.id !== id) }))
  }

  function addWeight(event) {
    event.preventDefault()
    if (!selectedCatId) return alert('Διάλεξε γάτα πρώτα.')
    const form = new FormData(event.currentTarget)
    const weight = Number(String(form.get('weight') || '').replace(',', '.'))
    if (!weight) return alert('Βάλε σωστό βάρος.')
    const item = {
      id: crypto.randomUUID(),
      catId: selectedCatId,
      date: String(form.get('date') || today()),
      weight
    }
    setData(d => ({ ...d, weights: [...d.weights, item] }))
    flashSaved('Αποθηκεύτηκε βάρος')
    event.currentTarget.reset()
  }

  function deleteWeight(id) {
    setData(d => ({ ...d, weights: d.weights.filter(w => w.id !== id) }))
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cat-care-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importBackup(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = normalizeData(JSON.parse(String(reader.result)))
        if (!parsed.cats.length) throw new Error('bad')
        setData(parsed)
        setSelectedCatId(parsed.cats?.[0]?.id || '')
        flashSaved('Το backup φορτώθηκε')
      } catch {
        alert('Δεν φαίνεται σωστό αρχείο backup.')
      }
    }
    reader.readAsText(file)
  }

  function resetCacheOnly() {
    if (!confirm('Να γίνει επαναφόρτωση από τα τρέχοντα αποθηκευμένα δεδομένα; Δεν διαγράφει το backup σου.')) return
    window.location.reload()
  }

  const filteredLogs = catLogs.filter(l => {
    const text = `${l.date} ${l.appetite} ${l.water} ${l.urine} ${l.stool} ${l.vomiting} ${l.mood} ${l.pain} ${l.notes}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  return (
    <div className="app">
      {saveMessage && <div className="toast">{saveMessage}</div>}
      <header className="hero">
        <div>
          <p className="kicker"><Sparkles size={16}/> Cat Care 1.4 stable</p>
          <h1>Cat Care Tracker</h1>
          <p>Σταθερή αποθήκευση προφίλ, καθαρά alerts, φάρμακα, ιστορικό, βάρος και backup. Όχι άλλα “δήθεν αποθηκεύτηκε”.</p>
        </div>
        <div className="heroIcon"><Cat size={62}/></div>
      </header>

      <nav className="nav">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}><Home size={18}/>Σήμερα</button>
        <button onClick={() => setTab('cats')} className={tab === 'cats' ? 'active' : ''}><Cat size={18}/>Γάτες</button>
        <button onClick={() => setTab('meds')} className={tab === 'meds' ? 'active' : ''}><Pill size={18}/>Φάρμακα</button>
        <button onClick={() => setTab('logs')} className={tab === 'logs' ? 'active' : ''}><HeartPulse size={18}/>Ιστορικό</button>
        <button onClick={() => setTab('weight')} className={tab === 'weight' ? 'active' : ''}><Scale size={18}/>Βάρος</button>
        <button onClick={() => setTab('backup')} className={tab === 'backup' ? 'active' : ''}><Download size={18}/>Backup</button>
      </nav>

      <section className="catSelector">
        {data.cats.map(cat => (
          <button key={cat.id} className={`catPill ${cat.id === selectedCatId ? 'selected' : ''}`} onClick={() => setSelectedCatId(cat.id)}>
            <Avatar cat={cat} />
            <span>{cat.name}</span>
          </button>
        ))}
      </section>

      {tab === 'home' && (
        <main className="grid">
          {selectedCat && <SelectedCatCard cat={selectedCat} onEdit={() => { setTab('cats'); setEditingCatId(selectedCat.id) }} />}
          <section className="card">
            <h2><AlertTriangle size={21}/>Προειδοποιήσεις</h2>
            {alerts.length === 0 ? <p className="muted">Δεν υπάρχουν ενεργές προειδοποιήσεις.</p> : alerts.map(a => (
              <div className="alert" key={a}>{a}</div>
            ))}
          </section>

          <section className="card">
            <h2><BellRing size={21}/>Φάρμακα</h2>
            {catMeds.length === 0 ? <p className="muted">Δεν έχεις καταχωρήσει φάρμακα για αυτή τη γάτα.</p> : catMeds.map(m => {
              const status = dueStatus(m, data.medEvents)
              return (
                <div className={`listItem status-${status.level}`} key={m.id}>
                  <div>
                    <strong>{m.name}</strong>
                    <span>{m.dose} • {m.frequency}</span>
                    <em>{status.label}</em>
                  </div>
                  <button onClick={() => markGiven(m)}><CheckCircle2 size={16}/>Δόθηκε</button>
                </div>
              )
            })}
          </section>

          <section className="card">
            <h2><Clock size={21}/>Τελευταίες χορηγήσεις</h2>
            {catEvents.length === 0 ? <p className="muted">Δεν υπάρχουν χορηγήσεις.</p> : catEvents.slice(0, 6).map(e => (
              <div className="smallEvent" key={e.id}>
                <strong>{e.medName}</strong>
                <span>{e.dose} • {niceDateTime(e.givenAt)}</span>
              </div>
            ))}
          </section>
        </main>
      )}

      {tab === 'cats' && (
        <main className="grid">
          {editingCat ? (
            <form className="card form editCard" onSubmit={updateCat}>
              <div className="formTitle">
                <h2><Pencil size={21}/>Επεξεργασία: {editingCat.name}</h2>
                <button type="button" className="ghost tiny" onClick={() => setEditingCatId(null)}><X size={16}/>Άκυρο</button>
              </div>
              <input name="name" placeholder="Όνομα" defaultValue={editingCat.name || ''} />
              <input name="age" placeholder="Ηλικία" defaultValue={editingCat.age || ''} />
              <input name="weight" placeholder="Βάρος π.χ. 4.4" defaultValue={editingCat.weight || ''} />
              <input name="sex" placeholder="Φύλο π.χ. Αρσενικός" defaultValue={editingCat.sex || ''} />
              <select name="neutered" defaultValue={editingCat.neutered || ''}>
                <option value="">Στείρωση: άγνωστο/κενό</option>
                <option value="ναι">Στειρωμένος/η: ναι</option>
                <option value="όχι">Στειρωμένος/η: όχι</option>
                <option value="προγραμματισμένο">Στείρωση: προγραμματισμένη</option>
              </select>
              <input name="description" placeholder="Χαρακτηρισμός" defaultValue={editingCat.description || ''} />
              <textarea name="conditions" placeholder="Χρόνια προβλήματα / ασθένειες" defaultValue={editingCat.conditions || ''} />
              <textarea name="notes" placeholder="Σημειώσεις" defaultValue={editingCat.notes || ''} />
              <button type="submit"><Save size={18}/>Αποθήκευση αλλαγών</button>
            </form>
          ) : (
            <form className="card form" onSubmit={addCat}>
              <h2><Plus size={21}/>Νέα γάτα</h2>
              <input name="name" placeholder="Όνομα" />
              <input name="age" placeholder="Ηλικία" />
              <input name="weight" placeholder="Βάρος π.χ. 4.4" />
              <input name="sex" placeholder="Φύλο" />
              <select name="neutered" defaultValue="">
                <option value="">Στείρωση: άγνωστο/κενό</option>
                <option value="ναι">Στειρωμένος/η: ναι</option>
                <option value="όχι">Στειρωμένος/η: όχι</option>
                <option value="προγραμματισμένο">Στείρωση: προγραμματισμένη</option>
              </select>
              <input name="description" placeholder="Χαρακτηρισμός" />
              <textarea name="conditions" placeholder="Χρόνια προβλήματα" />
              <textarea name="notes" placeholder="Σημειώσεις" />
              <button><Plus size={18}/>Προσθήκη</button>
            </form>
          )}

          <section className="card wide">
            <h2><PawPrint size={21}/>Προφίλ</h2>
            <div className="profiles">
              {data.cats.map(cat => (
                <article className="profile" key={cat.id}>
                  <div className="photoArea">
                    <Avatar cat={cat} large />
                    <label className="uploadBtn">
                      <Camera size={16}/> Φωτογραφία
                      <input type="file" accept="image/*" onChange={e => setCatPhoto(cat.id, e.target.files?.[0])} />
                    </label>
                  </div>
                  <div>
                    <h3>{cat.name}</h3>
                    <p className="muted">{cat.description || 'Χωρίς περιγραφή'}</p>
                    <div className="chips">
                      {cat.age && <span>{cat.age} ετών</span>}
                      {cat.weight && <span>{cat.weight} kg</span>}
                      {cat.sex && <span>{cat.sex}</span>}
                      {cat.neutered && <span>Στείρωση: {cat.neutered}</span>}
                    </div>
                    {cat.conditions && <div className="noteBox">{cat.conditions}</div>}
                    {cat.notes && <p>{cat.notes}</p>}
                    <div className="actions left">
                      <button onClick={() => setEditingCatId(cat.id)}><Pencil size={16}/>Επεξεργασία</button>
                      <button className="danger" onClick={() => deleteCat(cat.id)}><Trash2 size={16}/>Διαγραφή</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}

      {tab === 'meds' && (
        <main className="grid">
          <form className="card form" onSubmit={addMed}>
            <h2><Pill size={21}/>Νέο φάρμακο {selectedCat ? `για ${selectedCat.name}` : ''}</h2>
            <input name="name" placeholder="Όνομα φαρμάκου" />
            <input name="dose" placeholder="Δόση π.χ. 1 ml" />
            <input name="frequency" placeholder="Συχνότητα λεκτικά π.χ. κάθε βράδυ" />
            <input name="frequencyHours" type="number" min="1" placeholder="Κάθε πόσες ώρες; προαιρετικό" />
            <label>Έναρξη</label>
            <input name="start" type="date" />
            <label>Λήξη</label>
            <input name="end" type="date" />
            <textarea name="notes" placeholder="Οδηγίες / παρατηρήσεις" />
            <button><Plus size={18}/>Προσθήκη</button>
          </form>

          <section className="card">
            <h2><CalendarClock size={21}/>Λίστα φαρμάκων</h2>
            {catMeds.length === 0 ? <p className="muted">Δεν υπάρχουν φάρμακα.</p> : catMeds.map(m => {
              const status = dueStatus(m, data.medEvents)
              return (
                <div className={`listItem med status-${status.level}`} key={m.id}>
                  <div>
                    <strong>{m.name}</strong>
                    <span>{m.dose} • {m.frequency}</span>
                    {m.frequencyHours && <span>Πρόγραμμα: κάθε {m.frequencyHours} ώρες</span>}
                    <em>{status.label}</em>
                    {m.notes && <p>{m.notes}</p>}
                  </div>
                  <div className="actions">
                    <button onClick={() => markGiven(m)}>Δόθηκε</button>
                    <button className="ghost" onClick={() => deleteMed(m.id)}><Trash2 size={16}/></button>
                  </div>
                </div>
              )
            })}
          </section>
        </main>
      )}

      {tab === 'logs' && (
        <main className="grid">
          <form className="card form" onSubmit={addLog}>
            <h2><ClipboardList size={21}/>Νέα εγγραφή {selectedCat ? `για ${selectedCat.name}` : ''}</h2>
            <label>Ημερομηνία</label>
            <input name="date" type="date" defaultValue={today()} />
            <label>Όρεξη</label>
            <select name="appetite"><option>καλή</option><option>μειωμένη</option><option>καθόλου</option></select>
            <label>Νερό</label>
            <select name="water"><option>φυσιολογικό</option><option>αυξημένο</option><option>μειωμένο</option></select>
            <label>Ούρα</label>
            <select name="urine"><option>φυσιολογικά</option><option>μειωμένα</option><option>αίμα</option><option>σφίξιμο</option></select>
            <label>Κόπρανα</label>
            <select name="stool"><option>φυσιολογικά</option><option>μαλακά</option><option>διάρροια</option><option>δυσκοιλιότητα</option><option>καθόλου</option></select>
            <label>Έμετος</label>
            <select name="vomiting"><option>όχι</option><option>ναι</option></select>
            <label>Διάθεση</label>
            <select name="mood"><option>φυσιολογική</option><option>ήσυχος/η</option><option>κρύβεται</option><option>ανήσυχος/η</option></select>
            <label>Πόνος/ενόχληση</label>
            <select name="pain"><option>όχι εμφανής</option><option>ήπια ενόχληση</option><option>έντονη ενόχληση</option></select>
            <textarea name="notes" placeholder="Σημειώσεις: φαγητό, συμπεριφορά, κτηνίατρος, ό,τι θες" />
            <button><Save size={18}/>Αποθήκευση εγγραφής</button>
          </form>

          <section className="card">
            <h2><FileText size={21}/>Timeline</h2>
            <div className="search">
              <Search size={17}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Αναζήτηση στο ιστορικό" />
            </div>
            {filteredLogs.length === 0 ? <p className="muted">Δεν υπάρχουν εγγραφές.</p> : filteredLogs.map(l => (
              <article className="log" key={l.id}>
                <div className="logTop">
                  <strong>{l.date}</strong>
                  <button className="ghost tiny" onClick={() => deleteLog(l.id)}><Trash2 size={14}/></button>
                </div>
                <div className="chips">
                  <span>Όρεξη: {l.appetite}</span>
                  <span>Νερό: {l.water}</span>
                  <span>Ούρα: {l.urine}</span>
                  <span>Κόπρανα: {l.stool}</span>
                  <span>Έμετος: {l.vomiting}</span>
                  <span>Διάθεση: {l.mood}</span>
                  <span>Πόνος: {l.pain}</span>
                </div>
                {l.notes && <p>{l.notes}</p>}
              </article>
            ))}
          </section>
        </main>
      )}

      {tab === 'weight' && (
        <main className="grid">
          <form className="card form" onSubmit={addWeight}>
            <h2><Scale size={21}/>Νέα μέτρηση βάρους</h2>
            <label>Ημερομηνία</label>
            <input name="date" type="date" defaultValue={today()} />
            <input name="weight" inputMode="decimal" placeholder="Βάρος σε kg π.χ. 7.7" />
            <button><Save size={18}/>Αποθήκευση βάρους</button>
          </form>

          <section className="card">
            <h2><Scale size={21}/>Γράφημα βάρους</h2>
            {catWeights.length < 2 ? <p className="muted">Βάλε τουλάχιστον 2 μετρήσεις για να φανεί γράφημα.</p> : (
              <div className="chartBox">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={catWeights}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {catWeights.slice().reverse().map(w => (
              <div className="smallEvent" key={w.id}>
                <strong>{w.date}</strong>
                <span>{w.weight} kg</span>
                <button className="ghost tiny" onClick={() => deleteWeight(w.id)}><Trash2 size={14}/></button>
              </div>
            ))}
          </section>
        </main>
      )}

      {tab === 'backup' && (
        <main className="grid">
          <section className="card">
            <h2><Download size={21}/>Backup & Ρυθμίσεις</h2>
            <p>Τα δεδομένα σώζονται τοπικά στον browser. Αν αλλάξεις κινητό ή καθαρίσεις δεδομένα browser, μπορούν να χαθούν. Κάνε backup συχνά.</p>
            <div className="actions left">
              <button onClick={exportBackup}><Download size={18}/>Εξαγωγή backup JSON</button>
              <label className="uploadBtn standalone">
                <Upload size={18}/>Εισαγωγή backup
                <input type="file" accept="application/json" onChange={e => importBackup(e.target.files?.[0])} />
              </label>
              <button className="ghost" onClick={() => updateSettings({ darkMode: !data.settings?.darkMode })}>
                {data.settings?.darkMode ? <Sun size={18}/> : <Moon size={18}/>}
                {data.settings?.darkMode ? 'Light mode' : 'Dark mode'}
              </button>
              <button className="ghost" onClick={resetCacheOnly}><RotateCcw size={18}/>Reload</button>
            </div>
          </section>
          <section className="card warning">
            <h2><AlertTriangle size={21}/>Σημαντικό</h2>
            <p>Η εφαρμογή είναι ημερολόγιο φροντίδας, όχι κτηνίατρος. Σε αιματουρία, ανορεξία, επίμονους εμέτους, έντονη κατάπτωση, υποψία απόφραξης ή δυσκολία στην ούρηση/αφόδευση, επικοινωνία με κτηνίατρο.</p>
          </section>
        </main>
      )}
    </div>
  )
}

function buildAlerts(data) {
  const out = []
  data.cats.forEach(cat => {
    const logs = newest(data.logs.filter(l => l.catId === cat.id), 'date')
    const last = logs[0]
    if (!last) return

    if (last.appetite === 'μειωμένη' || last.appetite === 'καθόλου') out.push(`${cat.name}: μειωμένη/καθόλου όρεξη.`)
    if (last.urine === 'αίμα' || last.urine === 'σφίξιμο') out.push(`${cat.name}: πρόβλημα στα ούρα — θέλει προσοχή.`)
    if (last.stool === 'δυσκοιλιότητα' || last.stool === 'καθόλου') out.push(`${cat.name}: θέμα με κόπρανα στο τελευταίο log.`)
    if (last.vomiting === 'ναι') out.push(`${cat.name}: καταγράφηκε έμετος.`)
    if (last.pain === 'έντονη ενόχληση') out.push(`${cat.name}: έντονη ενόχληση/πόνος.`)
  })
  return out
}

function Avatar({ cat, large = false }) {
  return (
    <div className={large ? 'avatar large' : 'avatar'}>
      {cat.photo ? <img src={cat.photo} alt={cat.name} /> : <Cat size={large ? 58 : 28}/>}
    </div>
  )
}

function SelectedCatCard({ cat, onEdit }) {
  return (
    <section className="card selectedCard wide">
      <Avatar cat={cat} large />
      <div>
        <p className="kicker">Ενεργό προφίλ</p>
        <h2>{cat.name}</h2>
        <p className="muted">{cat.description}</p>
        <div className="chips">
          {cat.age && <span>{cat.age} ετών</span>}
          {cat.weight && <span>{cat.weight} kg</span>}
          {cat.sex && <span>{cat.sex}</span>}
          {cat.neutered && <span>Στείρωση: {cat.neutered}</span>}
        </div>
        {cat.conditions && <div className="noteBox">{cat.conditions}</div>}
        <button onClick={onEdit}><Pencil size={16}/>Επεξεργασία προφίλ</button>
      </div>
    </section>
  )
}

createRoot(document.getElementById('root')).render(<App />)
