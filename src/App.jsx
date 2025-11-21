import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Check, X, Trash2, PieChart, FileText, Plus, ChevronRight, Users, DollarSign, Calendar, Activity, GraduationCap, HelpCircle, FileType, Settings, UserPlus, Download, FileJson, AlertTriangle, Moon, Sun, Monitor, Filter, Save, Share2, HardDrive, Database, Heart, Coffee, ExternalLink, Github, Edit, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
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

// --- MAIN APP COMPONENT ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Novo estado para loading do auth
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

  // --- AUTH (GOOGLE LOGIN) ---
  useEffect(() => {
    // Monitora o estado do login
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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
    setEditingId(null); // Garantir que não é edição
    setView('review'); 
    
    try {
      const cleanBase64 = base64Data.split(',')[1];
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

      // Usando o modelo 2.5 que funcionou bem antes
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
        // Se for edição, mantém o hasAttachment antigo se não houver arquivo novo
        hasAttachment: !!scannedFile || (editingId ? (selectedExpense?.hasAttachment || false) : false),
        mimeType: scannedFileType || (editingId ? (selectedExpense?.mimeType || '') : '')
      };

      let targetId = editingId;

      if (editingId) {
        // MODO EDIÇÃO
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingId), expenseData);
      } else {
        // MODO CRIAÇÃO
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), expenseData);
        targetId = docRef.id;
      }

      // Salvar imagem se houver uma nova
      if (scannedFile && targetId) {
        await saveImageLocally(targetId, scannedFile);
      }

      setView('dashboard');
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

    setView('review');
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza? A imagem local também será apagada.")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id));
      await deleteImageLocally(id);
      if (selectedExpense?.id === id) setView('list'); 
    } catch (e) {
      console.error(e);
    }
  };

  // --- DETALHES E COMPARTILHAMENTO ---

  const handleViewExpense = async (expense) => {
    setSelectedExpense(expense);
    setSelectedExpenseImage(null); 
    setView('detail');

    if (expense.hasAttachment) {
      const img = await getImageLocally(expense.id);
      if (img) setSelectedExpenseImage(img);
    }
  };

  const handleShareOrDownload = async () => {
    if (!selectedExpense || !selectedExpenseImage) return;

    // Converter Base64 para Blob para permitir download/share
    const fetchRes = await fetch(selectedExpenseImage);
    const blob = await fetchRes.blob();
    const file = new File([blob], `recibo_${selectedExpense.razao_social.replace(/\s+/g, '_')}_${selectedExpense.data}.jpg`, { type: blob.type });

    // Tentar usar API nativa de compartilhamento (Mobile)
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

    // Fallback: Download direto (Desktop ou se Share falhar)
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
        setView('dashboard');
      } catch (err) { alert("Erro ao importar."); } 
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  // --- RENDERERS ---

  const totalDeductible = expenses.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const byCategory = expenses.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
    return acc;
  }, {});

  // TELA DE LOGIN (RENDER CONDICIONAL)
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-xl shadow-blue-200 dark:shadow-none">
           <FileText size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">IR Organiza</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
          Seu assistente inteligente para organizar recibos e declarações do Imposto de Renda.
        </p>
        
        <Button onClick={handleLogin} className="w-full max-w-xs py-4 text-lg shadow-xl">
          <LogIn size={24} />
          Entrar com Google
        </Button>
        
        <p className="text-xs text-slate-400 mt-6 max-w-xs mx-auto">
          Faça login para manter seus dados seguros e sincronizados na nuvem.
        </p>
      </div>
    );
  }

  // --- TELAS DO APP (SÓ RENDERIZA SE TIVER USER) ---

  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IR Organiza</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Olá, {user.displayName?.split(' ')[0]}</p>
        </div>
        <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <Settings size={24} />
        </button>
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
        <button onClick={() => { setEditingId(null); setView('scan'); }} className="col-span-2 flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border-2 border-blue-100 dark:border-blue-800 active:scale-95 transition-transform">
          <div className="flex gap-2 mb-2"><Camera size={24} /><Plus size={24} /></div>
          <span className="font-bold text-lg">Nova Despesa</span>
        </button>
        <button onClick={() => setView('list')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 active:scale-95">
          <FileText size={24} className="mb-2 opacity-70" />
          <span className="font-semibold text-sm">Extrato</span>
        </button>
        <button onClick={() => setView('dependents')} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-2 border-slate-100 active:scale-95">
          <Users size={24} className="mb-2 opacity-70" />
          <span className="font-semibold text-sm">Dependentes</span>
        </button>
      </div>
      
      {/* Lista Recente simplificada */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Recentes</h3>
        <div className="space-y-3">
          {expenses.slice(0,3).map(e => (
             <Card key={e.id} className="p-4 flex justify-between items-center" onClick={() => handleViewExpense(e)}>
               <div className="truncate">
                 <div className="font-semibold text-slate-800 dark:text-slate-100">{e.razao_social}</div>
                 <div className="text-xs text-slate-500">{new Date(e.data).toLocaleDateString('pt-BR')} • {e.categoria}</div>
               </div>
               <div className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(e.valor)}</div>
             </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => (
    <div className="pb-24">
      <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-900 dark:text-white">
            <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Detalhes</h2>
        </div>
        <button onClick={() => handleEditStart(selectedExpense)} className="text-blue-600 font-medium text-sm flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100">
            <Edit size={16} /> Editar
        </button>
      </div>

      <div className="p-4 space-y-6">
        {selectedExpense && (
          <>
            {/* IMAGEM DO RECIBO (OFFLINE) */}
            <div className="rounded-xl overflow-hidden border dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative group">
              {selectedExpenseImage ? (
                 selectedExpense.mimeType === 'application/pdf' ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                       <FileType size={48} className="mb-2 text-red-500" />
                       <span>Documento PDF Salvo</span>
                    </div>
                 ) : (
                    <img src={selectedExpenseImage} alt="Comprovante" className="w-full h-auto max-h-[500px] object-contain" />
                 )
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm p-4 text-center">
                   {selectedExpense.hasAttachment ? "Imagem não encontrada no dispositivo." : "Sem comprovante anexado."}
                </div>
              )}
            </div>

            {/* BOTÃO DE DOWNLOAD / DRIVE */}
            {selectedExpenseImage && (
              <Button onClick={handleShareOrDownload} variant="primary" className="w-full">
                <Share2 size={20} />
                Salvar no Drive / Compartilhar
              </Button>
            )}

            <Card className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Prestador</label>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{selectedExpense.razao_social}</div>
                <div className="text-sm text-slate-500 font-mono">{selectedExpense.cnpj_cpf}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold">Valor</label>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(selectedExpense.valor)}</div>
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold">Data</label>
                    <div className="text-lg text-slate-800 dark:text-slate-200">{new Date(selectedExpense.data).toLocaleDateString('pt-BR')}</div>
                 </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Descrição</label>
                <div className="text-slate-800 dark:text-slate-200">{selectedExpense.descricao || '-'}</div>
              </div>

              <div className="flex gap-2 pt-2 border-t dark:border-slate-800">
                 <Badge category={selectedExpense.categoria} />
                 <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Users size={12} /> {selectedExpense.dependente}
                 </span>
              </div>
            </Card>

            <Button onClick={() => handleDelete(selectedExpense.id)} variant="danger" className="w-full">
              <Trash2 size={20} /> Excluir Despesa
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // ... Reuse Review, Scan, Dependents, Settings from previous code, simplified for context ...
  // Vou incluir o Settings novamente para garantir o botão de Backup
  const renderSettings = () => (
    <div className="pb-24">
      <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center gap-3">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-900 dark:text-white"><ChevronRight size={20} className="rotate-180" /></button>
        <h2 className="font-bold text-lg text-slate-900 dark:text-white">Configurações</h2>
      </div>
      <div className="p-4 space-y-6">
        
        <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
           {user.photoURL ? (
             <img src={user.photoURL} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700" />
           ) : (
             <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
               {user.displayName ? user.displayName[0] : 'U'}
             </div>
           )}
           <div>
             <div className="font-bold text-slate-900 dark:text-white">{user.displayName || 'Usuário'}</div>
             <div className="text-xs text-slate-500">{user.email}</div>
           </div>
        </div>

        {/* DONATE SECTION */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-none p-5">
          <div className="flex items-center gap-2 mb-3">
             <Heart className="text-white fill-white animate-pulse" size={24} />
             <h3 className="font-bold text-lg">Apoie o Projeto</h3>
          </div>
          <p className="text-sm opacity-90 leading-relaxed mb-4">
             Este app é 100% gratuito, livre de anúncios e com código aberto. 
             Se ele te ajudou a organizar seu Imposto de Renda, considere fazer uma doação!
          </p>
          <a 
            href="https://tipa.ai/agilizei" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white text-rose-600 font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
             <Coffee size={20} />
             Me pague um café (Tipa Aí)
             <ExternalLink size={16} className="opacity-50" />
          </a>
        </Card>

         <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Aparência</h3>
          <div className="grid grid-cols-3 gap-2">
             {['light','dark','system'].map(mode => (
               <button key={mode} onClick={() => setTheme(mode)} className={`p-3 rounded-xl border-2 flex flex-col items-center ${theme===mode ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-slate-200 dark:border-slate-700'}`}>
                  {mode==='light' ? <Sun size={20}/> : mode==='dark' ? <Moon size={20}/> : <Monitor size={20}/>}
                  <span className="text-xs mt-1 capitalize">{mode}</span>
               </button>
             ))}
          </div>
         </div>

         <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl flex gap-3 items-start">
            <Database className="text-yellow-600 dark:text-yellow-400 shrink-0" size={20} />
            <div>
               <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">Armazenamento Híbrido</h3>
               <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Dados (valores/datas) estão na Nuvem. Imagens dos recibos estão salvas <b>apenas neste dispositivo</b> para economizar espaço e funcionar offline.
               </p>
            </div>
         </div>

         <button onClick={handleExport} className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
            <Download size={24} className="text-slate-500" />
            <div className="text-left">
               <div className="font-bold text-slate-900 dark:text-white">Backup de Dados</div>
               <div className="text-xs text-slate-500">Baixar JSON com todas informações</div>
            </div>
         </button>

         <label className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3 cursor-pointer">
            <Upload size={24} className="text-slate-500" />
            <div className="text-left">
               <div className="font-bold text-slate-900 dark:text-white">Restaurar Backup</div>
               <div className="text-xs text-slate-500">Carregar arquivo JSON</div>
            </div>
            <input type="file" onChange={handleImport} accept=".json" className="hidden"/>
         </label>
         
         <button onClick={handleLogout} className="w-full p-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2"><LogOut/> Sair da Conta</button>
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
         <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20} className="rotate-180 text-slate-900 dark:text-white" /></button>
             <h2 className="font-bold text-lg text-slate-900 dark:text-white">Extrato</h2>
           </div>
           <div className="text-sm font-medium text-slate-500">{filteredExpenses.length} itens</div>
         </div>
         <div className="p-4 space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
               {availableYears.map(year => (
                 <button key={year} onClick={() => setFilterYear(year.toString())} className={`px-4 py-1.5 rounded-full text-sm font-medium ${targetYear === year.toString() ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{year}</button>
               ))}
            </div>
            <div className="space-y-3">
              {filteredExpenses.map(expense => (
                <Card key={expense.id} className="p-4 flex justify-between items-center" onClick={() => handleViewExpense(expense)}> {/* CLICK AQUI */}
                   <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{expense.razao_social}</div>
                      <div className="text-xs text-slate-500">{new Date(expense.data).toLocaleDateString('pt-BR')} • {expense.categoria}</div>
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
        <button onClick={() => setView('dashboard')} className="absolute top-4 right-4 text-white/80 p-2"><X size={32}/></button>
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

  // CORRIGIDO: Agora inclui TODOS os campos de edição
  const renderReview = () => (
     <div className="pb-24">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center gap-3">
           <button onClick={() => setView(editingId ? 'detail' : 'dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} className="text-slate-900 dark:text-white"/></button>
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
                   {/* CATEGORIA */}
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
  
  const renderDependentsPage = () => (
     <div className="pb-24">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-4 border-b dark:border-slate-800 flex items-center gap-3">
           <button onClick={() => setView('dashboard')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20} className="rotate-180 text-slate-900 dark:text-white"/></button>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 md:max-w-md md:mx-auto md:shadow-2xl md:border-x border-slate-200 dark:border-slate-800">
      <div className="max-w-full overflow-y-auto h-screen bg-white dark:bg-slate-950">
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


