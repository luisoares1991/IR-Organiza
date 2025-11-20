import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Trash2, PieChart, FileText, Plus, ChevronRight, Users, Activity, GraduationCap, HelpCircle, FileType, Settings, Download, Heart, Coffee, ExternalLink, Edit, ArrowLeft, LogOut, LogIn, Save, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const googleProvider = new GoogleAuthProvider();

// --- INDEXED DB (Imagens Locais) ---
const DB_NAME = 'IROrganiza_Images';
const STORE_NAME = 'receipt_files';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject("Erro DB");
    request.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
  });
};

const saveImageLocally = async (id, base64Data) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(base64Data, id);
  } catch (e) { console.error(e); }
};

const getImageLocally = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
};

const deleteImageLocally = async (id) => {
  try {
    const db = await initDB();
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
  } catch (e) { console.error(e); }
};

// --- HELPERS SEGUROS (Anti-Crash) ---
const formatCurrency = (val) => {
  // Converte string numérica para numero se necessário
  const num = Number(val);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const str = String(dateString); // Garante que é string
        // Tenta dividir se for YYYY-MM-DD
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return str;
    } catch (e) {
        return '-';
    }
}

// --- COMPONENTES UI ---
const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-lg",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100"
  };
  return (
    <button onClick={onClick} className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Badge = ({ category }) => {
  const icons = {
    'Saúde': <Activity size={12} />,
    'Educação': <GraduationCap size={12} />,
    'Previdência': <DollarSign size={12} />,
    'Outros': <HelpCircle size={12} />
  };
  const styles = {
    'Saúde': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'Educação': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Previdência': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Outros': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  };
  // Proteção contra categoria nula ou objeto
  const cat = typeof category === 'string' ? category : 'Outros';
  return (
    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${styles[cat] || styles['Outros']}`}>
      {icons[cat] || icons['Outros']} {cat}
    </span>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'system');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  
  const [scannedFile, setScannedFile] = useState(null);
  const [scannedFileType, setScannedFileType] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedExpenseImage, setSelectedExpenseImage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [reviewData, setReviewData] = useState({ razao_social: '', cnpj_cpf: '', valor: '', data: '', categoria: 'Outros', dependente: 'Titular', descricao: '' });
  const [newDependentName, setNewDependentName] = useState('');

  // Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
  }, [theme]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Erro no login: " + error.message); }
  };

  const handleLogout = async () => {
    if(confirm("Deseja realmente sair?")) await signOut(auth);
  };

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    const unsubExp = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.data) - new Date(a.data)));
    });
    const unsubDep = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), (snap) => {
      setDependents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => { unsubExp(); unsubDep(); };
  }, [user]);

  // Gemini Analysis
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setScannedFile(reader.result);
      setScannedFileType(file.type);
      analyzeWithGemini(reader.result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWithGemini = async (base64, mimeType) => {
    setAnalyzing(true);
    setEditingId(null);
    setView('review');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const prompt = `Analise documento (nota fiscal/recibo). JSON estrito: { "razao_social": string, "cnpj_cpf": string_numeros, "valor": number, "data": "YYYY-MM-DD", "categoria": "Saúde"|"Educação"|"Previdência"|"Outros", "descricao": string }`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64.split(',')[1] } }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      const data = await res.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      setReviewData({
        ...result,
        valor: result.valor || '',
        data: result.data || new Date().toISOString().split('T')[0],
        categoria: result.categoria || 'Outros',
        dependente: 'Titular',
        razao_social: result.razao_social || 'Não identificado',
        descricao: result.descricao || ''
      });
    } catch (e) {
      console.error(e);
      alert("Erro na análise. Preencha manualmente.");
      setReviewData({ razao_social: '', cnpj_cpf: '', valor: '', data: '', categoria: 'Outros', dependente: 'Titular', descricao: '' });
    } finally { setAnalyzing(false); }
  };

  // CRUD Operations
  const handleSave = async () => {
    if (!reviewData.valor || !reviewData.razao_social) return alert("Preencha valor e prestador.");
    setLoading(true);
    try {
      const payload = {
        ...reviewData,
        valor: parseFloat(reviewData.valor),
        createdAt: new Date().toISOString(),
        hasAttachment: !!scannedFile || (editingId ? (selectedExpense?.hasAttachment || false) : false),
        mimeType: scannedFileType || (editingId ? (selectedExpense?.mimeType || '') : '')
      };

      let id = editingId;
      if (id) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id), payload);
      } else {
        const ref = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), payload);
        id = ref.id;
      }
      
      if (scannedFile && id) await saveImageLocally(id, scannedFile);
      
      setView('dashboard');
      setScannedFile(null);
      setEditingId(null);
    } catch (e) { console.error(e); alert("Erro ao salvar."); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir despesa?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id));
      await deleteImageLocally(id);
      if (selectedExpense?.id === id) setView('list');
    } catch (e) { console.error(e); }
  };

  const handleEditStart = async (exp) => {
    setEditingId(exp.id);
    setReviewData(exp);
    const img = await getImageLocally(exp.id);
    setScannedFile(img || null);
    setScannedFileType(exp.mimeType);
    setView('review');
  };

  const handleAddDependent = async () => {
    if (!newDependentName.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), { name: newDependentName.trim() });
    setNewDependentName('');
  };

  const handleViewDetail = async (exp) => {
    if(!exp) return;
    setSelectedExpense(exp);
    setSelectedExpenseImage(null);
    setView('detail');
    if (exp.hasAttachment) {
      const img = await getImageLocally(exp.id);
      setSelectedExpenseImage(img);
    }
  };

  const handleShareOrDownload = async () => {
    if (!selectedExpense || !selectedExpenseImage) return;
    const fetchRes = await fetch(selectedExpenseImage);
    const blob = await fetchRes.blob();
    const file = new File([blob], `recibo.jpg`, { type: blob.type });
    if (navigator.share) {
      try { await navigator.share({ title: 'Recibo', files: [file] }); return; } catch {}
    }
    const link = document.createElement('a');
    link.href = selectedExpenseImage;
    link.download = `recibo.jpg`;
    link.click();
  };

  const handleExport = async () => {
    const expSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'));
    const depSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'));
    const data = { expenses: expSnap.docs.map(d => d.data()), dependents: depSnap.docs.map(d => d.data()), date: new Date() };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_ir_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !confirm("Importar dados? Isso vai adicionar ao seu histórico atual.")) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        for (const d of data.dependents) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), d);
        for (const x of data.expenses) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), x);
        alert("Importado com sucesso!");
        setView('dashboard');
      } catch { alert("Erro na importação. Verifique o arquivo."); }
    };
    reader.readAsText(file);
  };

  // --- TELAS ---
  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-xl shadow-blue-200 dark:shadow-none">
           <FileText size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">IR Organiza</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">Seu assistente inteligente para organizar recibos e declarações.</p>
        
        <Button onClick={handleLogin} className="w-full max-w-xs py-4 text-lg shadow-xl">
          <LogIn size={24} />
          Entrar com Google
        </Button>
        <p className="text-xs text-slate-400 mt-6">Faça login para manter seus dados seguros e sincronizados.</p>
      </div>
    );
  }

  const renderDashboard = () => {
    const total = expenses.reduce((acc, cur) => acc + (cur.valor || 0), 0);
    const byCat = expenses.reduce((acc, cur) => { acc[cur.categoria] = (acc[cur.categoria] || 0) + cur.valor; return acc; }, {});
    
    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center">
          <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Olá, {user.displayName?.split(' ')[0]}</h1><p className="text-slate-500 text-sm">Suas despesas</p></div>
          <button onClick={() => setView('settings')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Settings/></button>
        </div>
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 border-none">
          <div className="flex items-center gap-2 mb-2 opacity-80"><PieChart size={18}/><span>Total Acumulado</span></div>
          <div className="text-4xl font-bold mb-4">{formatCurrency(total)}</div>
          <div className="grid grid-cols-2 gap-4 text-sm opacity-90">
            <div className="bg-white/10 p-2 rounded"><div>Saúde</div><div className="font-semibold">{formatCurrency(byCat['Saúde'] || 0)}</div></div>
            <div className="bg-white/10 p-2 rounded"><div>Educação</div><div className="font-semibold">{formatCurrency(byCat['Educação'] || 0)}</div></div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => { setEditingId(null); setView('scan'); }} className="col-span-2 flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border-2 border-blue-100 dark:border-blue-800 active:scale-95 transition-transform"><div className="flex gap-2 mb-2"><Camera size={24} /><Plus size={24} /></div><span className="font-bold text-lg">Nova Despesa</span></button>
          <button onClick={() => setView('list')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 dark:border-slate-700"><FileText size={24} className="mb-2 opacity-70"/><span className="font-semibold text-sm">Extrato</span></button>
          <button onClick={() => setView('dependents')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 dark:border-slate-700"><Users size={24} className="mb-2 opacity-70"/><span className="font-semibold text-sm">Dependentes</span></button>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const years = [...new Set(expenses.map(e => new Date(e.data).getFullYear()))].sort((a,b)=>b-a);
    if (years.length === 0) years.push(new Date().getFullYear());
    const targetYear = filterYear || years[0].toString();
    const filtered = expenses.filter(e => new Date(e.data).getFullYear().toString() === targetYear);

    return (
      <div className="pb-24 space-y-6">
        <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
          <div className="flex gap-3 items-center"><button onClick={()=>setView('dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="rotate-180 text-slate-900 dark:text-white"/></button><h2 className="text-lg font-bold text-slate-900 dark:text-white">Extrato</h2></div>
          <div className="text-sm text-slate-500">{filtered.length} itens</div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
           {years.map(y => <button key={y} onClick={()=>setFilterYear(y.toString())} className={`px-4 py-1.5 rounded-full text-sm font-medium ${targetYear === y.toString() ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{y}</button>)}
        </div>
        <div className="space-y-3">
           {filtered.map(e => (
             <Card key={e.id} className="p-4 flex justify-between items-center" onClick={() => handleViewDetail(e)}>
                <div><div className="font-semibold text-slate-900 dark:text-white">{String(e.razao_social)}</div><div className="text-xs text-slate-500">{formatDate(e.data)} • {String(e.categoria)}</div></div>
                <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(e.valor)}</div>
             </Card>
           ))}
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="pb-24 space-y-6">
       <div className="flex gap-3 items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
          <button onClick={()=>setView(editingId ? 'detail' : 'dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X className="text-slate-900 dark:text-white"/></button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Editar' : 'Revisar'}</h2>
       </div>
       {analyzing ? <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-slate-500">Analisando com IA...</p></div> : (
         <div className="space-y-4">
            {scannedFile && <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border dark:border-slate-700">{scannedFileType==='application/pdf'?<span className="flex gap-2 items-center text-slate-500"><FileType/> PDF</span>:<img src={scannedFile} className="h-full object-contain"/>}</div>}
            
            <div><label className="text-sm text-slate-500 mb-1 block">Categoria</label><div className="flex gap-2 overflow-x-auto pb-2">{['Saúde','Educação','Previdência','Outros'].map(c=><button key={c} onClick={()=>setReviewData({...reviewData, categoria:c})} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${reviewData.categoria===c?'bg-blue-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{c}</button>)}</div></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-slate-500 block mb-1">Valor</label><input type="number" value={reviewData.valor} onChange={e=>setReviewData({...reviewData, valor:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"/></div>
              <div><label className="text-sm text-slate-500 block mb-1">Data</label><input type="date" value={reviewData.data} onChange={e=>setReviewData({...reviewData, data:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"/></div>
            </div>

            <div><label className="text-sm text-slate-500 block mb-1">Prestador</label><input type="text" value={reviewData.razao_social} onChange={e=>setReviewData({...reviewData, razao_social:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"/></div>

            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-sm text-slate-500 block mb-1">CNPJ</label><input type="text" value={reviewData.cnpj_cpf} onChange={e=>setReviewData({...reviewData, cnpj_cpf:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"/></div>
               <div><label className="text-sm text-slate-500 block mb-1">Dependente</label><select value={reviewData.dependente} onChange={e=>setReviewData({...reviewData, dependente:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"><option value="Titular">Titular</option>{dependents.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
            </div>

            <div><label className="text-sm text-slate-500 block mb-1">Descrição</label><input type="text" value={reviewData.descricao} onChange={e=>setReviewData({...reviewData, descricao:e.target.value})} className="w-full p-3 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"/></div>

            <Button onClick={handleSave} disabled={loading} className="w-full">{loading ? 'Salvando...' : 'Confirmar'}</Button>
         </div>
       )}
    </div>
  );

  const renderDetail = () => {
    // PROTEÇÃO CONTRA TELA BRANCA
    if(!selectedExpense) return null;

    return (
      <div className="pb-24 space-y-6">
        <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
          <div className="flex gap-3 items-center"><button onClick={()=>setView('list')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="text-slate-900 dark:text-white"/></button><h2 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes</h2></div>
          <button onClick={() => handleEditStart(selectedExpense)} className="flex items-center gap-1 text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-lg"><Edit size={16}/> Editar</button>
        </div>
        {selectedExpenseImage && (
          <div className="rounded-xl overflow-hidden border dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[150px]">
              {selectedExpense.mimeType === 'application/pdf' ? <div className="text-center text-slate-500"><FileType size={48} className="mx-auto mb-2 text-red-500"/>PDF Salvo</div> : <img src={selectedExpenseImage} className="w-full h-auto"/>}
          </div>
        )}
        {selectedExpenseImage && <Button onClick={handleShareOrDownload} className="w-full"><Share2 size={18}/> Compartilhar</Button>}
        
        <Card className="p-5 space-y-4">
          <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Prestador</label>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{String(selectedExpense.razao_social || 'Sem nome')}</div>
              <div className="text-sm text-slate-500">{String(selectedExpense.cnpj_cpf || '-')}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Valor</label>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedExpense.valor)}</div>
              </div>
              <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Data</label>
                  <div className="text-lg text-slate-900 dark:text-white">{formatDate(selectedExpense.data)}</div>
              </div>
          </div>
          <div className="flex gap-2 pt-2 border-t dark:border-slate-700">
              <Badge category={selectedExpense.categoria}/>
              <span className="px-2 py-1 rounded text-xs border dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users size={12}/> {String(selectedExpense.dependente || 'Titular')}
              </span>
          </div>
          {selectedExpense.descricao && (
              <div>
                  <label className="text-xs text-slate-500 font-bold uppercase">Descrição</label>
                  <div className="text-slate-900 dark:text-white">{String(selectedExpense.descricao)}</div>
              </div>
          )}
        </Card>
        <Button onClick={()=>handleDelete(selectedExpense.id)} variant="danger" className="w-full"><Trash2 size={20}/> Excluir</Button>
      </div>
    );
  };

  const renderSettings = () => (
     <div className="pb-24 space-y-6">
        <div className="flex gap-3 items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
           <button onClick={()=>setView('dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="rotate-180 text-slate-900 dark:text-white"/></button>
           <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configurações</h2>
        </div>
        
        <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
           {user.photoURL && <img src={user.photoURL} className="w-12 h-12 rounded-full" />}
           <div><div className="font-bold text-slate-900 dark:text-white">{user.displayName}</div><div className="text-xs text-slate-500">{user.email}</div></div>
        </div>

        <div>
           <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Aparência</h3>
           <div className="grid grid-cols-3 gap-2">{['light','dark','system'].map(m=><button key={m} onClick={()=>setTheme(m)} className={`p-3 rounded-xl border-2 flex flex-col items-center ${theme===m?'border-blue-600 bg-blue-50 text-blue-600':'border-slate-200 dark:border-slate-700 dark:text-white'}`}><span className="capitalize text-xs">{m}</span></button>)}</div>
        </div>
        
        <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-none p-5">
           <div className="flex gap-2 items-center mb-2 font-bold"><Heart className="animate-pulse"/> Apoie o Projeto</div>
           <p className="text-sm opacity-90 mb-4">App 100% gratuito e open source.</p>
           <a href="https://tipa.ai/agilizei" target="_blank" className="bg-white text-rose-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95"><Coffee size={20}/> Me pague um café</a>
        </Card>
        
        <div className="space-y-4 border-t dark:border-slate-800 pt-4">
          <button onClick={handleExport} className="w-full p-4 rounded-xl border-2 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-900">
              <span className="flex items-center gap-3"><Download size={20}/> Backup de Dados (Exportar)</span>
              <ChevronRight size={16} className="opacity-50"/>
          </button>
          
          <label className="w-full p-4 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10 border-dashed flex items-center gap-3 text-blue-700 dark:text-blue-400 font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
              <Upload/> 
              <div className="text-left">
                  <div>Restaurar Backup (Importar)</div>
                  <div className="text-xs font-normal opacity-80">Selecione o arquivo .json</div>
              </div>
              <input type="file" onChange={handleImport} accept=".json" className="hidden"/>
          </label>
        </div>

        <button onClick={handleLogout} className="w-full p-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2"><LogOut/> Sair da Conta</button>
        <div className="text-center text-xs text-slate-400">v1.5 - {user.uid.slice(0,6)}</div>
     </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:max-w-md md:mx-auto md:border-x dark:border-slate-800">
      <div className="max-w-full h-screen overflow-y-auto p-4">
        {view === 'dashboard' && renderDashboard()}
        {view === 'list' && renderList()}
        {view === 'detail' && renderDetail()}
        {view === 'scan' && (
            <div className="h-screen flex flex-col items-center justify-center">
               <button onClick={()=>setView('dashboard')} className="absolute top-4 right-4 p-2"><X/></button>
               <div className="space-y-4 w-full max-w-xs">
                  <label className="block w-full cursor-pointer"><input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden"/><div className="bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Camera/> Tirar Foto</div></label>
                  <label className="block w-full cursor-pointer"><input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden"/><div className="bg-white/10 border border-slate-300 dark:border-slate-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Upload/> Upload Arquivo</div></label>
               </div>
            </div>
        )}
        {view === 'review' && renderReview()}
        {view === 'dependents' && renderDependentsPage()}
        {view === 'settings' && renderSettings()}
      </div>
    </div>
  );
}