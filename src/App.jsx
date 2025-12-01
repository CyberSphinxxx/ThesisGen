import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, addDoc, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  BookOpen, Layout, FileText, Settings, CheckCircle, AlertCircle,
  Loader, Plus, Trash, Save, BarChart3, GraduationCap, Cpu, Cloud,
  LogOut, ChevronRight, Search, PenTool
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// --- Constants & Theme ---
const THEME = {
  bg: "bg-slate-900",
  sidebar: "bg-slate-950",
  card: "bg-slate-800",
  text: "text-slate-100",
  textMuted: "text-slate-400",
  accent: "text-cyan-400",
  accentBg: "bg-cyan-500",
  success: "text-emerald-400",
  successBg: "bg-emerald-500",
  border: "border-slate-700",
  hover: "hover:bg-slate-700"
};

// --- Contexts ---
export const SettingsContext = createContext();

const DEFAULT_KEYS = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  },
  gemini: import.meta.env.VITE_GEMINI_API_KEY
};

const SettingsProvider = ({ children }) => {
  const [keys, setKeys] = useState(() => {
    const saved = localStorage.getItem('thesis_nexus_keys');
    return saved ? JSON.parse(saved) : DEFAULT_KEYS;
  });

  return (
    <SettingsContext.Provider value={{ keys }}>
      {children}
    </SettingsContext.Provider>
  );
};

// --- App Component ---
export default function App() {
  return (
    <SettingsProvider>
      <MainApp />
    </SettingsProvider>
  );
}

function MainApp() {
  const { keys } = useContext(SettingsContext);
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('loading'); // loading, auth, setup, launchpad, workspace
  const [isDemo, setIsDemo] = useState(false);
  const [project, setProject] = useState(null);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', message: '' }

  // Firebase & AI Refs
  const [services, setServices] = useState({ auth: null, db: null, ai: null });

  // Initialize Services
  useEffect(() => {
    if (isDemo) {
      setAppState('workspace');
      setProject(MOCK_DATA.project);
      return;
    }

    if (keys.firebase && keys.gemini) {
      try {
        const app = initializeApp(keys.firebase);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const ai = new GoogleGenerativeAI(keys.gemini);
        setServices({ auth, db, ai });

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUser(u);
            // Check for existing project
            const projDoc = await getDoc(doc(db, 'projects', u.uid));
            if (projDoc.exists()) {
              setProject(projDoc.data());
              setAppState('workspace');
            } else {
              setAppState('launchpad');
            }
          } else {
            setUser(null);
            setAppState('auth');
          }
        });
        return () => unsubscribe();
      } catch (e) {
        console.error("Init Error", e);
        setNotification({ type: 'error', message: "Invalid Configuration Keys" });
        setAppState('setup');
      }
    } else {
      setAppState('setup');
    }
  }, [keys, isDemo]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Render Logic ---
  if (appState === 'loading') return <div className={`h-screen w-full flex items-center justify-center ${THEME.bg} ${THEME.text}`}><Loader className="animate-spin w-8 h-8 text-cyan-500" /></div>;

  return (
    <div className={`min-h-screen ${THEME.bg} ${THEME.text} font-sans selection:bg-cyan-500/30`}>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg border ${notification.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' : 'bg-emerald-900/90 border-emerald-700 text-emerald-100'} flex items-center gap-2 animate-in slide-in-from-top-2`}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {notification.message}
        </div>
      )}

      {appState === 'setup' && <div className="p-10 text-center">Configuration Error. Check .env file.</div>}
      {appState === 'auth' && <AuthScreen auth={services.auth} />}
      {appState === 'launchpad' && <Launchpad user={user} db={services.db} ai={services.ai} onProjectCreated={(p) => { setProject(p); setAppState('workspace'); }} showNotification={showNotification} />}
      {appState === 'workspace' && (
        <Workspace
          user={user}
          project={project}
          db={services.db}
          ai={services.ai}
          isDemo={isDemo}
          onLogout={() => signOut(services.auth)}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

// --- Sub-Screens ---

function SetupScreen({ onSave, onDemo }) {
  const [fbConfig, setFbConfig] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  const handleSave = () => {
    try {
      const parsedFb = JSON.parse(fbConfig);
      onSave(parsedFb, geminiKey);
    } catch (e) {
      alert("Invalid JSON for Firebase Config");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">ThesisGen</h1>
        <p className={`${THEME.textMuted}`}>System Configuration Required</p>
      </div>

      <div className={`w-full ${THEME.card} p-6 rounded-xl border ${THEME.border} shadow-2xl`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Firebase Config (JSON)</label>
            <textarea
              className={`w-full h-32 bg-slate-900 border ${THEME.border} rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-cyan-500 outline-none`}
              placeholder='{"apiKey": "...", "authDomain": "..."}'
              value={fbConfig}
              onChange={(e) => setFbConfig(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gemini API Key</label>
            <input
              type="password"
              className={`w-full bg-slate-900 border ${THEME.border} rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none`}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>
          <button onClick={handleSave} className={`w-full py-3 ${THEME.accentBg} text-white font-bold rounded-lg hover:opacity-90 transition-all`}>
            Initialize System
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500 mb-3">Just want to look around?</p>
          <button onClick={onDemo} className={`w-full py-2 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition-all`}>
            Enter Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        await createUserWithEmailAndPassword(auth, email, pass);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${THEME.card} p-8 rounded-xl border ${THEME.border} shadow-2xl`}>
        <h2 className="text-2xl font-bold mb-6 text-center">{isLogin ? 'Sign In to Sync' : 'Create Account'}</h2>
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email" placeholder="Email" required
            className={`w-full bg-slate-900 border ${THEME.border} rounded-lg p-3 outline-none focus:border-cyan-500`}
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Password" required
            className={`w-full bg-slate-900 border ${THEME.border} rounded-lg p-3 outline-none focus:border-cyan-500`}
            value={pass} onChange={e => setPass(e.target.value)}
          />
          <button disabled={loading} className={`w-full py-3 ${THEME.accentBg} text-white font-bold rounded-lg hover:opacity-90 flex justify-center`}>
            {loading ? <Loader className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px bg-slate-700 flex-1"></div>
          <span className="text-xs text-slate-500">OR</span>
          <div className="h-px bg-slate-700 flex-1"></div>
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className={`w-full py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 flex justify-center items-center gap-2 transition-colors`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-slate-400 hover:text-cyan-400">
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}

function Launchpad({ user, db, ai, onProjectCreated, showNotification }) {
  const [step, setStep] = useState(1); // 1: Input, 2: Selection
  const [formData, setFormData] = useState({ field: '', degree: '', interest: '' });
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateConcepts = async () => {
    setLoading(true);
    try {
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Generate 3 unique, academic thesis concepts for a ${formData.degree} student in ${formData.field} interested in ${formData.interest}. Return ONLY a JSON array of objects with keys: "title", "description". No markdown.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanText = text.replace(/```json|```/g, '').trim();
      setConcepts(JSON.parse(cleanText));
      setStep(2);
    } catch (e) {
      console.error(e);
      showNotification('error', "AI Generation Failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectConcept = async (concept) => {
    setLoading(true);
    try {
      const projectData = {
        title: concept.title,
        field: formData.field,
        currentPhase: "Proposal",
        wordCount: 0,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'projects', user.uid), projectData);
      onProjectCreated(projectData);
    } catch (e) {
      showNotification('error', "Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold mb-2"><span className="text-cyan-400">Thesis</span>Gen</h1>
        <p className="text-xl text-slate-400">Launchpad</p>
      </div>

      {step === 1 && (
        <div className={`w-full max-w-lg ${THEME.card} p-8 rounded-2xl border ${THEME.border} space-y-6`}>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Field of Study</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:border-cyan-500 outline-none"
              value={formData.field} onChange={e => setFormData({ ...formData, field: e.target.value })} placeholder="e.g. Computer Science" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Degree Level</label>
            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:border-cyan-500 outline-none"
              value={formData.degree} onChange={e => setFormData({ ...formData, degree: e.target.value })}>
              <option value="">Select Level</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Masters">Masters</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Specific Interest</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:border-cyan-500 outline-none"
              value={formData.interest} onChange={e => setFormData({ ...formData, interest: e.target.value })} placeholder="e.g. AI in Healthcare" />
          </div>
          <button onClick={generateConcepts} disabled={loading || !formData.field} className={`w-full py-4 ${THEME.accentBg} text-white font-bold rounded-lg hover:opacity-90 flex justify-center items-center gap-2`}>
            {loading ? <Loader className="animate-spin" /> : <><Cpu size={20} /> Generate Concepts</>}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="grid md:grid-cols-3 gap-6 w-full">
          {concepts.map((c, i) => (
            <div key={i} onClick={() => selectConcept(c)} className={`${THEME.card} p-6 rounded-xl border ${THEME.border} hover:border-cyan-500 cursor-pointer transition-all hover:-translate-y-1 group`}>
              <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 text-cyan-400">
                <GraduationCap />
              </div>
              <h3 className="font-bold text-lg mb-2 leading-tight">{c.title}</h3>
              <p className="text-sm text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Workspace({ user, project, db, ai, isDemo, onLogout, showNotification }) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Shared "Save" indicator logic could go here

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`w-64 ${THEME.sidebar} border-r ${THEME.border} flex flex-col`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-sm">TG</span>
            </div>
            ThesisGen
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<Layout size={20} />} label="Dashboard" active={activeModule === 'dashboard'} onClick={() => setActiveModule('dashboard')} />
          <SidebarItem icon={<Search size={20} />} label="Lit Review" active={activeModule === 'litreview'} onClick={() => setActiveModule('litreview')} />
          <SidebarItem icon={<PenTool size={20} />} label="Chapter Drafter" active={activeModule === 'drafter'} onClick={() => setActiveModule('drafter')} />
          <SidebarItem icon={<BarChart3 size={20} />} label="Kanban Board" active={activeModule === 'kanban'} onClick={() => setActiveModule('kanban')} />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <Settings size={18} /> Project Settings
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-sm">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-900 relative">
        {/* Header */}
        <header className={`h-16 border-b ${THEME.border} flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-sm`}>
          <div>
            <h2 className="font-semibold text-lg">{project.title}</h2>
            <p className="text-xs text-slate-500">{project.field} • {project.currentPhase}</p>
          </div>
          <div className="flex items-center gap-4">
            {saving ? (
              <span className="flex items-center gap-2 text-xs text-cyan-400"><Loader size={14} className="animate-spin" /> Saving...</span>
            ) : (
              <span className="flex items-center gap-2 text-xs text-emerald-500"><Cloud size={14} /> Synced</span>
            )}
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0].toUpperCase() || 'D'}
            </div>
          </div>
        </header>

        {/* Module View */}
        <div className="flex-1 overflow-auto p-8">
          {showSettings && <ProjectSettingsModal project={project} db={db} user={user} onClose={() => setShowSettings(false)} />}
          {activeModule === 'dashboard' && <Dashboard project={project} user={user} db={db} />}
          {activeModule === 'litreview' && <LitReview user={user} db={db} ai={ai} isDemo={isDemo} setSaving={setSaving} showNotification={showNotification} />}
          {activeModule === 'kanban' && <Kanban user={user} db={db} isDemo={isDemo} setSaving={setSaving} />}
          {activeModule === 'drafter' && <ChapterDrafter user={user} db={db} ai={ai} isDemo={isDemo} setSaving={setSaving} showNotification={showNotification} />}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${active ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {icon}
      {label}
    </button>
  );
}

// --- Modules ---

function Dashboard({ project, user, db }) {
  const [stats, setStats] = useState({ sources: 0, tasksDone: 0, tasksTotal: 0 });
  const [taskData, setTaskData] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Listen to Sources
    const unsubSources = onSnapshot(collection(db, `projects/${user.uid}/sources`), (snap) => {
      setStats(prev => ({ ...prev, sources: snap.size }));
    });

    // Listen to Tasks
    const unsubTasks = onSnapshot(collection(db, `projects/${user.uid}/tasks`), (snap) => {
      const tasks = snap.docs.map(d => d.data());
      const done = tasks.filter(t => t.status === 'Done').length;

      const statusCounts = [
        { name: 'To Do', count: tasks.filter(t => t.status === 'To Do').length },
        { name: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
        { name: 'Done', count: done }
      ];

      setStats(prev => ({ ...prev, tasksDone: done, tasksTotal: snap.size }));
      setTaskData(statusCounts);
    });

    return () => {
      unsubSources();
      unsubTasks();
    };
  }, [user, db]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <StatCard label="Total Word Count" value={project.wordCount} icon={<FileText className="text-blue-400" />} />
        <StatCard label="Sources Analyzed" value={stats.sources} icon={<BookOpen className="text-purple-400" />} />
        <StatCard label="Tasks Completed" value={`${stats.tasksDone} / ${stats.tasksTotal}`} icon={<CheckCircle className="text-emerald-400" />} />
      </div>

      <div className={`${THEME.card} p-6 rounded-xl border ${THEME.border}`}>
        <h3 className="text-lg font-semibold mb-6">Task Status Distribution</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                {taskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Done' ? '#10b981' : entry.name === 'In Progress' ? '#06b6d4' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className={`${THEME.card} p-6 rounded-xl border ${THEME.border} flex items-center justify-between`}>
      <div>
        <p className="text-sm text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-900/50">{icon}</div>
    </div>
  );
}

function LitReview({ user, db, ai, isDemo, setSaving, showNotification }) {
  const [sources, setSources] = useState([]);
  const [newSource, setNewSource] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    const q = query(collection(db, `projects/${user.uid}/sources`));
    const unsub = onSnapshot(q, (snap) => {
      setSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, db, isDemo]);

  const analyzeSource = async () => {
    if (!newSource) return;
    setAnalyzing(true);
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1500));
        setSources([...sources, { id: Date.now(), title: "AI Generated Source", author: "AI", year: "2024", method: "Mock Analysis", result: "Mock Result", conclusion: "Mock Conclusion" }]);
      } else {
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Analyze this abstract and extract: Title (guess if missing), Author (guess if missing), Year (guess if missing), Method, Result, Conclusion. Return JSON only. Abstract: ${newSource}`;
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

        setSaving(true);
        await addDoc(collection(db, `projects/${user.uid}/sources`), data);
        setSaving(false);
      }
      setNewSource('');
      showNotification('success', "Source analyzed and saved");
    } catch (e) {
      showNotification('error', "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className={`${THEME.card} p-6 rounded-xl border ${THEME.border}`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={18} className="text-cyan-400" /> AI Source Scanner</h3>
        <div className="flex gap-4">
          <textarea
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none resize-none h-24"
            placeholder="Paste abstract here..."
            value={newSource} onChange={e => setNewSource(e.target.value)}
          />
          <button onClick={analyzeSource} disabled={analyzing} className={`px-6 rounded-lg font-bold text-white ${THEME.accentBg} hover:opacity-90 disabled:opacity-50`}>
            {analyzing ? <Loader className="animate-spin" /> : 'Analyze'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400 border-b border-slate-700 bg-slate-900/50 sticky top-0">
            <tr>
              <th className="p-4 font-medium">Title & Author</th>
              <th className="p-4 font-medium">Method</th>
              <th className="p-4 font-medium">Result</th>
              <th className="p-4 font-medium">Conclusion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/50">
                <td className="p-4">
                  <div className="font-medium text-slate-200">{s.title}</div>
                  <div className="text-xs text-slate-500">{s.author}, {s.year}</div>
                </td>
                <td className="p-4 text-slate-400">{s.method}</td>
                <td className="p-4 text-slate-400">{s.result}</td>
                <td className="p-4 text-slate-400">{s.conclusion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kanban({ user, db, isDemo, setSaving }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (isDemo) return;
    const q = query(collection(db, `projects/${user.uid}/tasks`));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, db, isDemo]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask) return;
    if (isDemo) {
      setTasks([...tasks, { id: Date.now(), title: newTask, status: 'To Do', priority: 'Medium' }]);
    } else {
      setSaving(true);
      await addDoc(collection(db, `projects/${user.uid}/tasks`), {
        title: newTask, status: 'To Do', priority: 'Medium', createdAt: serverTimestamp()
      });
      setSaving(false);
    }
    setNewTask('');
  };

  const updateTask = async (task, updates) => {
    if (isDemo) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, ...updates } : t));
    } else {
      setSaving(true);
      await updateDoc(doc(db, `projects/${user.uid}/tasks`, task.id), updates);
      setSaving(false);
    }
    setEditingTask(null);
  };

  const deleteTask = async (taskId) => {
    if (isDemo) {
      setTasks(tasks.filter(t => t.id !== taskId));
    } else {
      setSaving(true);
      await deleteDoc(doc(db, `projects/${user.uid}/tasks`, taskId));
      setSaving(false);
    }
  };

  const Column = ({ title, status }) => (
    <div className="flex-1 min-w-[300px] bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 font-medium flex justify-between items-center bg-slate-900/80 rounded-t-xl sticky top-0 backdrop-blur-sm z-10">
        <span className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'To Do' ? 'bg-slate-500' : status === 'In Progress' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
          {title}
        </span>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded-full text-slate-400">{tasks.filter(t => t.status === status).length}</span>
      </div>
      <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {tasks.filter(t => t.status === status).map(t => (
          <div key={t.id} className={`${THEME.card} p-4 rounded-lg border border-slate-700 shadow-sm hover:border-cyan-500/50 group transition-all`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium leading-snug">{t.title}</p>
              <button onClick={() => setEditingTask(t)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-all">
                <PenTool size={12} />
              </button>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${t.priority === 'High' ? 'border-red-500/30 text-red-400 bg-red-500/10' : t.priority === 'Medium' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-slate-500/30 text-slate-400 bg-slate-500/10'}`}>
                {t.priority}
              </span>
              <div className="flex gap-1">
                {status !== 'To Do' && <button onClick={() => updateTask(t, { status: 'To Do' })} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300"><ChevronRight className="rotate-180" size={14} /></button>}
                {status !== 'Done' && <button onClick={() => updateTask(t, { status: status === 'To Do' ? 'In Progress' : 'Done' })} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300"><ChevronRight size={14} /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2"><Layout size={20} className="text-cyan-400" /> Kanban Board</h3>
        <form onSubmit={addTask} className="flex gap-2 w-96">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:border-cyan-500 outline-none"
            placeholder="Add a new task..."
            value={newTask} onChange={e => setNewTask(e.target.value)}
          />
          <button type="submit" className={`px-4 ${THEME.accentBg} text-white rounded-lg hover:opacity-90`}><Plus size={18} /></button>
        </form>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-2 min-h-0">
        <Column title="To Do" status="To Do" />
        <Column title="In Progress" status="In Progress" />
        <Column title="Done" status="Done" />
      </div>

      {editingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${THEME.card} w-full max-w-md p-6 rounded-xl border ${THEME.border} shadow-2xl`}>
            <h3 className="text-lg font-bold mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none"
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none"
                  value={editingTask.priority}
                  onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => deleteTask(editingTask.id)} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 flex-1">Delete</button>
                <button onClick={() => setEditingTask(null)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex-1">Cancel</button>
                <button onClick={() => updateTask(editingTask, { title: editingTask.title, priority: editingTask.priority })} className={`px-4 py-2 ${THEME.accentBg} text-white rounded-lg hover:opacity-90 flex-1`}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectSettingsModal({ project, db, user, onClose }) {
  const [title, setTitle] = useState(project.title);
  const [field, setField] = useState(project.field);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'projects', user.uid), { title, field });
      onClose();
      window.location.reload(); // Simple reload to refresh app state
    } catch (e) {
      alert("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${THEME.card} w-full max-w-md p-6 rounded-xl border ${THEME.border} shadow-2xl`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Project Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><LogOut size={18} className="rotate-45" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project Title</label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none"
              value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Field of Study</label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-cyan-500 outline-none"
              value={field} onChange={e => setField(e.target.value)}
            />
          </div>
          <button onClick={handleSave} disabled={loading} className={`w-full py-3 ${THEME.accentBg} text-white font-bold rounded-lg hover:opacity-90 mt-4`}>
            {loading ? <Loader className="animate-spin mx-auto" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChapterDrafter({ user, db, ai, isDemo, setSaving, showNotification }) {
  const [content, setContent] = useState('');
  const [expanding, setExpanding] = useState(false);

  const handleExpand = async () => {
    setExpanding(true);
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1000));
        setContent(prev => prev + "\n\n[AI Generated] Furthermore, recent studies indicate that...");
      } else {
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Continue this academic text with 3 sentences. Maintain tone. Text: ${content.slice(-500)}`;
        const result = await model.generateContent(prompt);
        const newText = result.response.text();
        setContent(prev => prev + " " + newText);
      }
      showNotification('success', "Content expanded");
    } catch (e) {
      showNotification('error', "Expansion failed");
    } finally {
      setExpanding(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute bottom-6 right-6 z-10">
        <button onClick={handleExpand} disabled={expanding} className={`shadow-xl px-6 py-3 rounded-full font-bold text-white ${THEME.accentBg} hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all hover:scale-105`}>
          {expanding ? <Loader className="animate-spin" size={20} /> : <><Cpu size={20} /> AI Expand</>}
        </button>
      </div>
      <textarea
        className="flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-lg leading-relaxed focus:border-cyan-500 outline-none resize-none font-serif text-slate-300"
        placeholder="Start writing your chapter..."
        value={content}
        onChange={e => setContent(e.target.value)}
      />
    </div>
  );
}
