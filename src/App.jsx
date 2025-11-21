import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Check, X, Trash2, PieChart, FileText, Plus, ChevronRight, Users, DollarSign, Calendar, Activity, GraduationCap, HelpCircle, FileType, Settings, UserPlus, Download, FileJson, AlertTriangle, Moon, Sun, Monitor, Filter, Save, Share2, HardDrive, Database, Heart, Coffee, ExternalLink, Github, Edit, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, Timestamp, getDocs, updateDoc } from 'firebase/firestore';

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

// --- INDEXED DB (Armazenamento Local de Imagens) ---
const DB_NAME = 'IROrganiza_Images';
const STORE_NAME = 'receipt_files';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = (event) => reject("Erro ao abrir DB local");
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
  });
};

const saveImageLocally = async (id, base64Data) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(base64Data, id);
    return tx.complete;
  } catch (e) {
    console.error("Erro ao salvar localmente:", e);
  }
};

const getImageLocally = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const deleteImageLocally = async (id) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) { console.error(e); }
};

// --- COMPONENTES UI ---

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const baseClass = "px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-lg",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
  };
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Badge = ({ category }) => {
  const styles = {
    'Saúde': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    'Educação': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'Previdência': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    'Outros': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
  
  const icons = {
    'Saúde': <Activity size={12} />,
    'Educação': <GraduationCap size={12} />,
    'Previdência': <DollarSign size={12} />,
    'Outros': <HelpCircle size={12} />
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 w-fit ${styles[category] || styles['Outros']}`}>
      {icons[category] || icons['Outros']}
      {category}
    </span>
  );
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString) => {
    if(!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// --- MAIN APP COMPONENT ---

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
  
  // Estado para o fluxo de scan/review/detail
  const [scannedFile, setScannedFile] = useState(null); 
  const [scannedFileType, setScannedFileType] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedExpenseImage, setSelectedExpenseImage] = useState(null);
  
  // Estado para edição
  const [editingId, setEditingId] = useState(null);

  const [reviewData, setReviewData] = useState({
    razao_social: '',
    cnpj_cpf: '',
    valor: '',
    data: '',
    categoria: 'Outros',
    dependente: 'Titular',
    descricao: ''
  });

  const [newDependentName, setNewDependentName] = useState('');

  // --- GERENCIAMENTO DE NAVEGAÇÃO (HISTÓRICO) ---
  useEffect(() => {
    // Escuta o evento de "Voltar" do navegador/celular
    const onPopState = (event) => {
        if (event.state && event.state.view) {
            setView(event.state.view);
        } else {
            // Se não tiver estado (ex: primeira carga), volta pro dashboard
            setView('dashboard');
        }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Função helper para navegar criando histórico
  const navigateTo = (newView) => {
      if (newView === view) return;
      window.history.pushState({ view: newView }, '', '');
      setView(newView);
  };

  // Função helper para voltar
  const goBack = () => {
      // Se tiver histórico, volta. Se não, vai pro dashboard.
      if (window.history.state) {
          window.history.back();
      } else {
          setView('dashboard');
      }
  };

  // --- THEME EFFECT ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('app_theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, [theme]);

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      // Se logar, garante que a view inicial é dashboard
      if (currentUser) {
          // Não damos pushState aqui para não bagunçar o histórico inicial
          setView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      alert("Erro no login com Google: " + error.message);
    }
  };

  const handleAnonymousLogin = async () => {
      if (confirm("⚠️ ATENÇÃO: MODO VISITANTE\n\nSeus dados NÃO serão salvos na nuvem. Se você limpar o celular ou trocar de dispositivo, perderá tudo.\n\nVocê precisará usar a opção 'Backup' manualmente para salvar seus dados.\n\nDeseja continuar?")) {
          try {
              await signInAnonymously(auth);
          } catch (error) {
              alert("Erro ao entrar como visitante: " + error.message);
          }
      }
  }

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      await signOut(auth);
    }
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;
    
    const qExpenses = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.data) - new Date(a.data));
      setExpenses(data);
    }, (error) => console.error("Erro despesas:", error));

    const qDependents = collection(db, 'artifacts', appId, 'users', user.uid, 'dependents');
    const unsubDependents = onSnapshot(qDependents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setDependents(data);
    }, (error) => console.error("Erro dependentes:", error));

    return () => { unsubExpenses(); unsubDependents(); };
  }, [user]);

  // --- GEMINI & SAVE ---
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setScannedFile(result);
      setScannedFileType(file.type);
      analyzeFileWithGemini(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFileWithGemini = async (base64Data, mimeType) => {
    setAnalyzing(true);
    setEditingId(null); 
    navigateTo('review'); 
    
    try {
      const cleanBase64 = base64Data.split(',')[1];
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
      const model = "gemini-2.5-flash-preview-09-2025";

      const prompt = `
        Analise este documento (nota fiscal, recibo ou fatura) para Imposto de Renda Brasileiro.
        Extraia os seguintes dados em formato JSON estrito:
        {
          "razao_social": "Nome do prestador de serviço ou estabelecimento",
          "cnpj_cpf": "CNPJ ou CPF do prestador (apenas números)",
          "valor": 0.00 (número float),
          "data": "YYYY-MM-DD" (data de emissão),
          "categoria": "Saúde" ou "Educação" ou "Previdência" ou "Outros",
          "descricao": "Breve descrição do serviço (ex: Consulta Médica, Mensalidade Escolar)"
        }
        Se algum campo não estiver claro, tente inferir pelo contexto ou deixe como null.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: cleanBase64 } }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error?.message || "Erro na API do Gemini");
      }

      const data = await response.json();
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

    } catch (error) {
      console.error("Erro:", error);
      alert(`Não foi possível analisar automaticamente (${error.message}). Preencha manualmente.`);
      setReviewData({ razao_social: '', cnpj_cpf: '', valor: '', data: '', categoria: 'Outros', dependente: 'Titular', descricao: '' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!user) return;
    if (!reviewData.valor || !reviewData.razao_social) {
      alert("Preencha pelo menos o valor e o nome do prestador.");
      return;
    }

    setLoading(true);
    try {
      const expenseData = {
        ...reviewData,
        valor: parseFloat(reviewData.valor),
        createdAt: new Date().toISOString(),
        hasAttachment: !!scannedFile || (editingId ? (selectedExpense?.hasAttachment || false) : false),
        mimeType: scannedFileType || (editingId ? (selectedExpense?.mimeType || '') : '')
      };

      let targetId = editingId;

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingId), expenseData);
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), expenseData);
        targetId = docRef.id;
      }

      if (scannedFile && targetId) {
        await saveImageLocally(targetId, scannedFile);
      }

      navigateTo('dashboard');
      setScannedFile(null);
      setScannedFileType('');
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = async (expense) => {
    setEditingId(expense.id);
    setReviewData({
        razao_social: expense.razao_social,
        cnpj_cpf: expense.cnpj_cpf,
        valor: expense.valor,
        data: expense.data,
        categoria: expense.categoria,
        dependente: expense.dependente,
        descricao: expense.descricao
    });
    
    const img = await getImageLocally(expense.id);
    if (img) {
        setScannedFile(img);
        setScannedFileType(expense.mimeType);
    } else {
        setScannedFile(null);
    }

    navigateTo('review');
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza? A imagem local também será apagada.")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id));
      await deleteImageLocally(id);
      if (selectedExpense?.id === id) goBack();
    } catch (e) {
      console.error(e);
    }
  };

  // --- DETALHES E COMPARTILHAMENTO ---

  const handleViewExpense = async (expense) => {
    setSelectedExpense(expense);
    setSelectedExpenseImage(null); 
    navigateTo('detail');

    if (expense.hasAttachment) {
      const img = await getImageLocally(expense.id);
      if (img) setSelectedExpenseImage(img);
    }
  };

  const handleShareOrDownload = async () => {
    if (!selectedExpense || !selectedExpenseImage) return;

    const fetchRes = await fetch(selectedExpenseImage);
    const blob = await fetchRes.blob();
    const file = new File([blob], `recibo_${selectedExpense.razao_social.replace(/\s+/g, '_')}_${selectedExpense.data}.jpg`, { type: blob.type });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Comprovante IR',
          text: `Recibo de ${selectedExpense.razao_social} - ${formatCurrency(selectedExpense.valor)}`,
          files: [file]
        });
        return;
      } catch (e) {
        console.log("Share cancelado ou erro:", e);
      }
    }

    const link = document.createElement('a');
    link.href = selectedExpenseImage;
    link.download = `recibo_${selectedExpense.razao_social}_${selectedExpense.data}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DEPENDENTES E OUTROS ---
  const handleAddDependent = async () => {
    if (!newDependentName.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), {
        name: newDependentName.trim(),
        createdAt: new Date().toISOString()
      });
      setNewDependentName('');
    } catch (error) { console.error(error); }
  };

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const expensesSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'));
      const expensesData = expensesSnap.docs.map(doc => doc.data());
      const dependentsSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'));
      const dependentsData = dependentsSnap.docs.map(doc => doc.data());

      const backup = {
        version: 1,
        date: new Date().toISOString(),
        expenses: expensesData,
        dependents: dependentsData
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-ir-organiza-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert("Erro ao gerar backup."); } 
    finally { setLoading(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Isso adicionará os dados ao seu perfil. Continuar?")) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.expenses) throw new Error("Inválido");
        for (const dep of data.dependents) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'dependents'), dep);
        for (const exp of data.expenses) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), exp);
        alert(`Importação concluída!`);
        navigateTo('dashboard');
      } catch (err) { alert("Erro ao importar."); } 
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  // --- RENDER ---
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

        <button onClick={handleAnonymousLogin} className="mt-6 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline transition-colors">
            Entrar sem conta (Modo Visitante)
        </button>
      </div>
    );
  }

  const totalDeductible = expenses.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const byCategory = expenses.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
    return acc;
  }, {});

  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IR Organiza</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Olá, {user.displayName?.split(' ')[0] || 'Visitante'}</p>
        </div>
        <button onClick={() => navigateTo('settings')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Settings size={24} /></button>
      </header>

      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white p-6 border-none">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <PieChart size={18} />
          <span className="text-sm font-medium">Total Acumulado</span>
        </div>
        <div className="text-4xl font-bold mb-4 tracking-tight">{formatCurrency(totalDeductible)}</div>
        <div className="grid grid-cols-2 gap-4 text-sm opacity-90">
          <div className="bg-white/10 p-2 rounded">
            <div className="text-xs mb-1">Saúde</div>
            <div className="font-semibold">{formatCurrency(byCategory['Saúde'] || 0)}</div>
          </div>
          <div className="bg-white/10 p-2 rounded">
            <div className="text-xs mb-1">Educação</div>
            <div className="font-semibold">{formatCurrency(byCategory['Educação'] || 0)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => { setEditingId(null); navigateTo('scan'); }} className="col-span-2 flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border-2 border-blue-100 dark:border-blue-800 active:scale-95 transition-transform">
          <div className="flex gap-2 mb-2"><Camera size={24} /><Plus size={24} /></div>
          <span className="font-bold text-lg">Nova Despesa</span>
        </button>
        <button onClick={() => navigateTo('list')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 dark:border-slate-700"><FileText size={24} className="mb-2 opacity-70"/><span className="font-semibold text-sm">Extrato</span></button>
        <button onClick={() => navigateTo('dependents')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 dark:border-slate-700"><Users size={24} className="mb-2 opacity-70"/><span className="font-semibold text-sm">Dependentes</span></button>
      </div>
      
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Recentes</h3>
        <div className="space-y-3">
          {expenses.slice(0,3).map(e => (
             <Card key={e.id} className="p-4 flex justify-between items-center" onClick={() => handleViewExpense(e)}>
               <div className="truncate">
                 <div className="font-semibold text-slate-800 dark:text-slate-100">{e.razao_social}</div>
                 <div className="text-xs text-slate-500">{formatDate(e.data)} • {e.categoria}</div>
               </div>
               <div className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(e.valor)}</div>
             </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderList = () => {
     const availableYears = [...new Set(expenses.map(e => new Date(e.data).getFullYear()))].sort((a,b) => b - a);
     if (availableYears.length === 0) { const currentYear = new Date().getFullYear(); if (!availableYears.includes(currentYear)) availableYears.push(currentYear); }
     
     const targetYear = filterYear || availableYears[0].toString();
     const filteredExpenses = expenses.filter(e => new Date(e.data).getFullYear().toString() === targetYear);

     return (
       <div className="pb-24">
         <div className="sticky top-0 bg-white dark:bg-slate-950 z-10 p-4 border-b dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20} className="rotate-180 text-slate-900 dark:text-white" /></button>
             <h2 className="font-bold text-lg text-slate-900 dark:text-white">Extrato</h2>
           </div>
           <div className="text-sm font-medium text-slate-500">{filteredExpenses.length} itens</div>
         </div>
         <div className="p-4 space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
               {availableYears.map(year => (
                 <button key={year} onClick={() => setFilterYear(year.toString())} className={`px-4 py-1.5 rounded-full text-sm font-medium ${targetYear === year.toString() ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{year}</button>
               ))}
            </div>
            <div className="space-y-3">
              {filteredExpenses.map(expense => (
                <Card key={expense.id} className="p-4 flex justify-between items-center" onClick={() => handleViewExpense(expense)}>
                   <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{expense.razao_social}</div>
                      <div className="text-xs text-slate-500">{formatDate(expense.data)} • {expense.categoria}</div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <div className="font-bold text-xl text-slate-800 dark:text-slate-200">{formatCurrency(expense.valor)}</div>
                      {expense.hasAttachment && <div className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Save size={8}/> Salvo</div>}
                   </div>
                </Card>
              ))}
            </div>
         </div>
       </div>
     );
  };

  const renderScan = () => (
     <div className="h-screen bg-black flex flex-col items-center justify-center p-4 relative">
        <button onClick={goBack} className="absolute top-4 right-4 p-2"><X size={32} className="text-white"/></button>
        <div className="w-full max-w-xs space-y-4">
           <label className="block w-full cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              <div className="bg-blue-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2"><Camera size={24}/> Tirar Foto</div>
           </label>
           <label className="block w-full cursor-pointer">
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
              <div className="bg-white/10 text-white font-medium py-3 rounded-xl border border-white/20 flex items-center justify-center gap-2"><Upload size={20}/> Upload (PDF/Img)</div>
           </label>
        </div>
     </div>
  );

  const renderReview = () => (
     <div className="pb-24">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center gap-3">
           <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} className="text-slate-900 dark:text-white"/></button>
           <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editingId ? 'Editar Despesa' : 'Revisar Dados'}</h2>
        </div>
        <div className="p-4 space-y-6">
           {analyzing ? <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-slate-500">Analisando...</p></div> : (
              <>
                {scannedFile && (
                  <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 flex items-center justify-center mb-4">
                     {scannedFileType === 'application/pdf' ? (
                        <div className="text-xs text-slate-500 flex items-center gap-1"><FileType size={16}/> PDF</div>
                     ) : (
                        <img src={scannedFile} alt="Preview" className="h-full object-contain" />
                     )}
                  </div>
                )}

                <div className="space-y-4">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {['Saúde', 'Educação', 'Previdência', 'Outros'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setReviewData({...reviewData, categoria: cat})}
                          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            reviewData.categoria === cat 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-sm text-slate-500 mb-1">Valor (R$)</label><input type="number" value={reviewData.valor} onChange={e => setReviewData({...reviewData, valor: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-lg font-bold dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500"/></div>
                       <div><label className="block text-sm text-slate-500 mb-1">Data</label><input type="date" value={reviewData.data} onChange={e => setReviewData({...reviewData, data: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500"/></div>
                   </div>
                   
                   <div><label className="block text-sm text-slate-500 mb-1">Prestador (Razão Social)</label><input type="text" value={reviewData.razao_social} onChange={e => setReviewData({...reviewData, razao_social: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500"/></div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-sm text-slate-500 mb-1">CNPJ/CPF</label><input type="text" value={reviewData.cnpj_cpf} onChange={e => setReviewData({...reviewData, cnpj_cpf: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500"/></div>
                       <div>
                           <label className="block text-sm text-slate-500 mb-1">Dependente</label>
                           <select value={reviewData.dependente} onChange={e => setReviewData({...reviewData, dependente: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500">
                               <option value="Titular">Titular</option>
                               {dependents.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                           </select>
                       </div>
                   </div>

                   <div><label className="block text-sm text-slate-500 mb-1">Descrição</label><input type="text" value={reviewData.descricao} onChange={e => setReviewData({...reviewData, descricao: e.target.value})} placeholder="Ex: Consulta de rotina" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg dark:text-white outline-none border dark:border-slate-700 focus:border-blue-500"/></div>

                   <Button onClick={handleSaveExpense} disabled={loading}>{loading ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Confirmar e Salvar')}</Button>
                </div>
              </>
           )}
        </div>
     </div>
  );

  const renderDetail = () => {
    if(!selectedExpense) return null;
    return (
      <div className="pb-24 space-y-6">
        <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
           <div className="flex gap-3 items-center"><button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="text-slate-900 dark:text-white"/></button><h2 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes</h2></div>
           <button onClick={() => handleEditStart(selectedExpense)} className="flex items-center gap-1 text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-lg"><Edit size={16}/> Editar</button>
        </div>
        {selectedExpenseImage && (
           <div className="rounded-xl overflow-hidden border dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[150px]">
              {selectedExpense.mimeType === 'application/pdf' ? <div className="text-center text-slate-500"><FileType size={48} className="mx-auto mb-2 text-red-500"/>PDF Salvo</div> : <img src={selectedExpenseImage} className="w-full h-auto"/>}
           </div>
        )}
        {selectedExpenseImage && <Button onClick={handleShareOrDownload} className="w-full"><Share2 size={18}/> Compartilhar</Button>}
        <Card className="p-5 space-y-4">
           <div><label className="text-xs text-slate-500 font-bold uppercase">Prestador</label><div className="text-lg font-semibold text-slate-900 dark:text-white">{selectedExpense.razao_social}</div><div className="text-sm text-slate-500">{selectedExpense.cnpj_cpf}</div></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 font-bold uppercase">Valor</label><div className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedExpense.valor)}</div></div><div><label className="text-xs text-slate-500 font-bold uppercase">Data</label><div className="text-lg text-slate-900 dark:text-white">{formatDate(selectedExpense.data)}</div></div></div>
           <div className="flex gap-2 pt-2 border-t dark:border-slate-700"><Badge category={selectedExpense.categoria}/><span className="px-2 py-1 rounded text-xs border dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-1"><Users size={12}/> {selectedExpense.dependente}</span></div>
           {selectedExpense.descricao && <div><label className="text-xs text-slate-500 font-bold uppercase">Descrição</label><div className="text-slate-900 dark:text-white">{selectedExpense.descricao}</div></div>}
        </Card>
        <Button onClick={()=>handleDelete(selectedExpense.id)} variant="danger" className="w-full"><Trash2 size={20}/> Excluir</Button>
      </div>
    );
  };

  const renderSettings = () => (
     <div className="pb-24 space-y-6">
        <div className="flex gap-3 items-center sticky top-0 bg-white dark:bg-slate-950 z-10 py-4 border-b dark:border-slate-800">
           <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="rotate-180 text-slate-900 dark:text-white"/></button>
           <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configurações</h2>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
           <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{user.displayName?.[0] || user.uid.slice(0,2).toUpperCase()}</div>
           <div><div className="font-bold text-slate-900 dark:text-white">{user.displayName || (user.isAnonymous ? 'Visitante' : 'Usuário')}</div><div className="text-xs text-slate-500">{user.email || 'Local'}</div></div>
        </div>

        {user.isAnonymous && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-200 flex gap-3 items-start">
                <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
                <div>
                    <p className="font-bold mb-1">Modo Visitante Ativo</p>
                    <p className="opacity-90">Seus dados estão salvos apenas neste dispositivo. Se limpar o cache, você perderá tudo. Faça o backup regularmente!</p>
                </div>
            </div>
        )}
        
        <div><h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Aparência</h3><div className="grid grid-cols-3 gap-2">{['light','dark','system'].map(m=><button key={m} onClick={()=>setTheme(m)} className={`p-3 rounded-xl border-2 flex flex-col items-center ${theme===m?'border-blue-600 bg-blue-50 text-blue-600':'border-slate-200 dark:border-slate-700 dark:text-white'}`}><span className="capitalize text-xs">{m}</span></button>)}</div></div>
        
        <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-none p-5">
           <div className="flex gap-2 items-center mb-2 font-bold"><Heart className="animate-pulse"/> Apoie o Projeto</div>
           <p className="text-sm opacity-90 mb-4">App 100% gratuito e open source.</p>
           <a href="https://tipa.ai/agilizei" target="_blank" className="bg-white text-rose-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95"><Coffee size={20}/> Me pague um café</a>
        </Card>

        <div className="space-y-3">
          <button onClick={handleExport} className="w-full p-4 rounded-xl border-2 dark:border-slate-700 flex items-center gap-3 text-slate-700 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-900"><Download/> Backup de Dados</button>
          <label className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center gap-3 text-slate-700 dark:text-white font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"><Upload className="text-slate-400"/> <div className="text-left"><div>Restaurar Backup</div><div className="text-xs text-slate-400 font-normal">Selecione o arquivo .json</div></div><input type="file" onChange={handleImport} accept=".json" className="hidden"/></label>
        </div>
        
        <button onClick={handleLogout} className="w-full p-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2"><LogOut/> Sair da Conta</button>
        <div className="text-center text-xs text-slate-400">v3.1 - {user.uid.slice(0,6)}</div>
     </div>
  );

  const renderDependentsPage = () => (
     <div className="pb-24">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center gap-3">
           <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20} className="rotate-180 text-slate-900 dark:text-white"/></button>
           <h2 className="font-bold text-lg text-slate-900 dark:text-white">Dependentes</h2>
        </div>
        <div className="p-4 space-y-4">
           <div className="flex gap-2"><input type="text" value={newDependentName} onChange={e => setNewDependentName(e.target.value)} placeholder="Nome" className="flex-1 p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"/><button onClick={handleAddDependent} className="bg-blue-600 text-white px-4 rounded-lg">Add</button></div>
           <div className="space-y-2">
               <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-slate-700 dark:text-white flex justify-between"><span>Titular</span> <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Padrão</span></div>
               {dependents.map(d => <div key={d.id} className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-slate-700 dark:text-white flex justify-between"><span>{d.name}</span> <button onClick={() => handleDelete(d.id)} className="text-red-500"><Trash2 size={16}/></button></div>)}
            </div>
        </div>
     </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:max-w-md md:mx-auto md:border-x dark:border-slate-800">
      <div className="max-w-full h-screen overflow-y-auto p-4">
        {view === 'dashboard' && renderDashboard()}
        {view === 'list' && renderList()}
        {view === 'detail' && renderDetail()}
        {view === 'scan' && renderScan()}
        {view === 'review' && renderReview()}
        {view === 'dependents' && renderDependentsPage()}
        {view === 'settings' && renderSettings()}
      </div>
    </div>
  );
}


