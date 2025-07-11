// ===== CONFIGURACIÓN SUPABASE CON AUTENTICACIÓN =====
const SUPABASE_URL = 'https://uhtthgwuvzboshjddfsj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHRoZ3d1dnpib3NoamRkZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNTk4NTgsImV4cCI6MjA2NTgzNTg1OH0.Y-sl0IvZMWOBHmBOWJzhmFGmAUhgloPeMuR18iCP-8w';

// Importar Supabase (agregar este script en el HTML también)
// <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== VARIABLES GLOBALES DE AUTENTICACIÓN =====
let currentUser = null;
let userRole = null;
let isAuthenticated = false;

// Variables globales existentes
let tableData = [];
let currentFilename = '';
let hasUnsavedChanges = false;
let originalData = [];
let selectedRows = new Set();
let currentView = 'data';
let nextId = 1;
let isLoading = false;

const tableBody = document.getElementById('data-table-body');

// ===== HEADERS Y OPCIONES ACTUALIZADOS =====
const headers = [
    "OUA", 
    "Derechos (l/s)", 
    "Acciones", 
    "Adjuntar Certificado", 
    "Período", 
    "Valor Acciones ($/Año)", 
    "Valor Limpieza ($/Año)", 
    "Valor Celador ($/Año)", 
    "Otros ($/Año)", 
    "Valor Total ($/Año)", 
    "Forma de Pago", 
    "Adjuntar Memo Pago", 
    "Fecha Pago", 
    "Status Pago", 
    "Comentario"
];

const statusOptions = ["Realizado", "Pendiente", "En Proceso", "Cancelado", "Rechazado"];
const formasPagoOptions = ["Efectivo", "Transferencia", "Cheque", "Depósito", "Vale Vista", "Otro"];

// Referencias a elementos existentes
const emptyState = document.getElementById('empty-state');
const dataContainer = document.getElementById('data-container');
const dashboardContainer = document.getElementById('dashboard-container');
const dataSection = document.getElementById('data-section');
const dataViewBtn = document.getElementById('data-view-btn');
const dashboardViewBtn = document.getElementById('dashboard-view-btn');
const currentFilenameElement = document.getElementById('current-filename');
const unsavedIndicator = document.getElementById('unsaved-indicator');
const saveBtn = document.getElementById('save-btn');
const saveAsBtn = document.getElementById('save-as-btn');
const dataInfo = document.getElementById('data-info');

// Selection and delete elements removed

// ===== ELEMENTOS DE AUTENTICACIÓN =====
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const authLoading = document.getElementById('auth-loading');
const userNameElement = document.getElementById('user-name');
const userRoleElement = document.getElementById('user-role');

// Variables del Dashboard
let statusChart = null;
let amountChart = null;
let regularizationChart = null;
let topOuasChart = null;

// ===== FUNCIONES DE AUTENTICACIÓN =====

// Función para mostrar pantalla de login
const showLoginScreen = () => {
    console.log('🔐 Mostrando pantalla de login');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    hideAuthError();
    hideAuthLoading();
};

// Función para mostrar aplicación principal
const showMainApplication = () => {
    console.log('✅ Mostrando aplicación principal');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    hideAuthError();
    hideAuthLoading();
};

// Función para mostrar error de autenticación
const showAuthError = (message) => {
    console.log('❌ Error de auth:', message);
    if (authError && authErrorText) {
        authErrorText.textContent = message;
        authError.classList.remove('hidden');
    }
    hideAuthLoading();
};

// Función para ocultar error
const hideAuthError = () => {
    if (authError) authError.classList.add('hidden');
};

// Función para mostrar loading
const showAuthLoading = () => {
    console.log('⏳ Mostrando loading de auth');
    if (authLoading) authLoading.classList.remove('hidden');
    hideAuthError();
};

// Función para ocultar loading
const hideAuthLoading = () => {
    if (authLoading) authLoading.classList.add('hidden');
};

// Función para verificar si el usuario está autorizado
const isUserAuthorized = async (email) => {
    try {
        console.log('🔍 Verificando autorización para:', email);
        
        // Verificar que tenemos acceso a la tabla user_roles
        const { data: allUsers, error: listError } = await supabase
            .from('user_roles')
            .select('email, role');
            
        if (listError) {
            console.error('❌ Error accediendo a la tabla user_roles:', listError);
            console.log('⚠️ TEMPORAL: Permitiendo acceso sin verificación de rol');
            // TEMPORAL: Permitir acceso como editor si no podemos verificar roles
            return { email: email, role: 'editor' };
        }
        
        console.log('📋 Usuarios autorizados encontrados:', allUsers?.length || 0);
        if (allUsers && allUsers.length > 0) {
            console.log('👥 Lista de usuarios autorizados:', allUsers.map(u => u.email));
        }
        
        const { data, error } = await supabase
            .from('user_roles')
            .select('email, role')
            .eq('email', email)
            .single();

        if (error) {
            console.log('❌ Error al verificar autorización específica:', error);
            console.log('📧 Email buscado:', email);
            
            // Si el error es que no se encontró el usuario (no otros errores de DB)
            if (error.code === 'PGRST116') {
                console.log('⚠️ Usuario no encontrado en user_roles');
                console.log('💡 Para agregar este usuario, ejecuta en Supabase:');
                console.log(`INSERT INTO user_roles (email, role) VALUES ('${email}', 'editor');`);
            }
            
            return false;
        }

        if (data) {
            console.log('✅ Usuario autorizado:', data);
            return data;
        }

        console.log('❌ No se encontraron datos para el usuario');
        return false;
    } catch (error) {
        console.error('❌ Error en verificación:', error);
        return false;
    }
};

// Función para obtener rol del usuario
const getUserRole = async (email) => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('email', email)
            .single();

        if (error) {
            console.log('Error al obtener rol:', error);
            return null;
        }

        return data?.role || null;
    } catch (error) {
        console.error('Error en getUserRole:', error);
        return null;
    }
};

// Función para configurar UI según rol
const setupRoleBasedUI = () => {
    console.log('⚙️ Configurando UI para rol:', userRole);
    
    // Remover clases de rol previas
    document.body.classList.remove('user-role-editor', 'user-role-viewer');
    
    // Agregar clase según rol actual
    document.body.classList.add(`user-role-${userRole}`);
    
    // Actualizar texto de rol en UI
    if (userRoleElement) {
        userRoleElement.textContent = userRole === 'editor' ? 'Editor' : 'Viewer';
    }
    
    // Para viewers: ocultar controles de edición
    if (userRole === 'viewer') {
        // Ocultar botón "Nueva Fila" en estado vacío
        const emptyAddBtn = document.getElementById('empty-add-btn');
        if (emptyAddBtn) emptyAddBtn.style.display = 'none';
        
        console.log('👁️ Configuración de Viewer aplicada');
    } else {
        console.log('✏️ Configuración de Editor aplicada');
    }
};

// Función para actualizar info de usuario en header
const updateUserInfo = () => {
    if (currentUser && userNameElement) {
        // Usar nombre de Google o email
        const displayName = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'Usuario';
        userNameElement.textContent = displayName;
    }
};

// Función de diagnóstico
const runDiagnostics = async () => {
    console.log('🔍 EJECUTANDO DIAGNÓSTICO COMPLETO...');
    
    const results = [];
    
    // 1. Verificar que Supabase esté disponible
    if (window.supabase) {
        results.push('✅ Supabase JS disponible');
        console.log('✅ Supabase JS disponible');
    } else {
        results.push('❌ Supabase JS NO disponible');
        console.error('❌ Supabase JS NO disponible');
    }
    
    // 2. Verificar configuración de Supabase
    if (supabase) {
        results.push('✅ Cliente Supabase inicializado');
        console.log('✅ Cliente Supabase inicializado');
        console.log('🔗 URL:', SUPABASE_URL);
        console.log('🔑 Key (primeros 20 chars):', SUPABASE_KEY.substring(0, 20) + '...');
    } else {
        results.push('❌ Cliente Supabase NO inicializado');
        console.error('❌ Cliente Supabase NO inicializado');
    }
    
    // 3. Verificar auth module
    if (supabase && supabase.auth) {
        results.push('✅ Módulo de autenticación disponible');
        console.log('✅ Módulo de autenticación disponible');
    } else {
        results.push('❌ Módulo de autenticación NO disponible');
        console.error('❌ Módulo de autenticación NO disponible');
    }
    
    // 4. Verificar URL actual
    const currentUrl = window.location.href;
    results.push(`🔗 URL actual: ${currentUrl}`);
    console.log('🔗 URL actual:', currentUrl);
    
    // 5. Verificar protocolo
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        results.push('✅ Protocolo apropiado para OAuth');
        console.log('✅ Protocolo apropiado para OAuth');
    } else {
        results.push('⚠️ Protocolo puede causar problemas con OAuth');
        console.warn('⚠️ Protocolo puede causar problemas con OAuth');
    }
    
    // 6. Verificar elementos HTML
    const loginBtn = document.getElementById('google-login-btn');
    const authError = document.getElementById('auth-error');
    const authLoading = document.getElementById('auth-loading');
    
    results.push(loginBtn ? '✅ Botón de login encontrado' : '❌ Botón de login NO encontrado');
    results.push(authError ? '✅ Elemento de error encontrado' : '❌ Elemento de error NO encontrado');
    results.push(authLoading ? '✅ Elemento de loading encontrado' : '❌ Elemento de loading NO encontrado');
    
    // 7. Probar conexión a Supabase
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            results.push(`❌ Error obteniendo sesión: ${error.message}`);
            console.error('❌ Error obteniendo sesión:', error);
        } else {
            results.push('✅ Conexión a Supabase exitosa');
            console.log('✅ Conexión a Supabase exitosa');
            if (data.session) {
                results.push('✅ Sesión activa encontrada');
                console.log('✅ Sesión activa encontrada');
            } else {
                results.push('ℹ️ No hay sesión activa');
                console.log('ℹ️ No hay sesión activa');
            }
        }
    } catch (error) {
        results.push(`❌ Error conectando con Supabase: ${error.message}`);
        console.error('❌ Error conectando con Supabase:', error);
    }
    
    // 8. Probar OAuth (sin redirigir)
    try {
        console.log('🔍 Probando configuración OAuth...');
        // Esta es solo una prueba, no ejecutará el login real
        results.push('🔍 Probando configuración OAuth...');
    } catch (error) {
        results.push(`❌ Error en configuración OAuth: ${error.message}`);
        console.error('❌ Error en configuración OAuth:', error);
    }
    
    // Mostrar resultados
    const resultText = results.join('\n');
    console.log('📋 RESULTADO DEL DIAGNÓSTICO:');
    console.log(resultText);
    
    // Mostrar en pantalla
    alert('DIAGNÓSTICO COMPLETADO\n\n' + resultText + '\n\nRevisa la consola para más detalles (F12)');
};

// Función de login con Google
const handleGoogleLogin = async () => {
    try {
        console.log('🔐 Iniciando login con Google...');
        console.log('🔗 URL actual:', window.location.origin + window.location.pathname);
        showAuthLoading();
        
        // Verificar que Supabase esté disponible
        if (!window.supabase) {
            console.error('❌ Supabase no está disponible');
            showAuthError('Error: Supabase no está cargado');
            hideAuthLoading();
            return;
        }
        
        if (!supabase.auth) {
            console.error('❌ supabase.auth no está disponible');
            showAuthError('Error: Módulo de autenticación no disponible');
            hideAuthLoading();
            return;
        }
        
        console.log('✅ Supabase y auth disponibles');
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account'
                }
            }
        });

        if (error) {
            console.error('❌ Error en login:', error);
            console.error('❌ Detalles del error:', error.message);
            
            if (error.message.includes('OAuth')) {
                showAuthError('Error: OAuth no configurado correctamente en Supabase');
            } else if (error.message.includes('redirect')) {
                showAuthError('Error: URL de redirección no configurada');
            } else {
                showAuthError('Error al iniciar sesión: ' + error.message);
            }
            
            hideAuthLoading();
            return;
        }

        console.log('🔄 Redirigiendo a Google...');
        console.log('📊 Datos de respuesta:', data);
        
    } catch (error) {
        console.error('❌ Error en handleGoogleLogin:', error);
        showAuthError('Error inesperado: ' + error.message);
        hideAuthLoading();
    }
};

// Función de logout
const handleLogout = async () => {
    try {
        console.log('🚪 Cerrando sesión...');
        showAuthLoading();
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('❌ Error al cerrar sesión:', error);
            showAuthError('Error al cerrar sesión');
            return;
        }
        
        // Limpiar estado local
        currentUser = null;
        userRole = null;
        isAuthenticated = false;
        tableData = [];
        originalData = [];
        selectedRows.clear();
        hasUnsavedChanges = false;
        currentFilename = '';
        
        // Mostrar pantalla de login
        showLoginScreen();
        
        console.log('✅ Sesión cerrada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en logout:', error);
        showAuthError('Error al cerrar sesión');
    }
};

// Función para manejar cambios de estado de autenticación
const handleAuthStateChange = async (event, session) => {
    console.log('🔄 Estado de auth cambió:', event, session?.user?.email);
    
    if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Usuario autenticado:', session.user.email);
        
        try {
            showAuthLoading();
            
            // Verificar que la sesión sea válida
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at < now) {
                console.log('⚠️ Sesión expirada, intentando refrescar...');
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                    console.error('❌ Error refrescando sesión:', refreshError);
                    await handleLogout();
                    return;
                }
                session = refreshData.session;
            }
            
            // Verificar si el usuario está autorizado
            const authData = await isUserAuthorized(session.user.email);
            
            if (authData) {
                console.log('✅ Usuario autorizado con rol:', authData.role);
                
                // Configurar estado global
                currentUser = session.user;
                userRole = authData.role;
                isAuthenticated = true;
                
                // Actualizar UI
                updateUserInfo();
                setupRoleBasedUI();
                showMainApplication();
                
                // Cargar datos automáticamente
                setTimeout(() => {
                    loadDataFromSupabase();
                }, 500);
                
            } else {
                console.log('❌ Usuario no autorizado:', session.user.email);
                showAuthError('No tienes permisos para acceder a esta aplicación');
                
                // Cerrar sesión automáticamente
                setTimeout(() => {
                    handleLogout();
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ Error verificando autorización:', error);
            showAuthError('Error verificando permisos');
            hideAuthLoading();
        }
        
    } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Usuario desconectado');
        
        // Limpiar estado local completamente
        currentUser = null;
        userRole = null;
        isAuthenticated = false;
        tableData = [];
        originalData = [];
        selectedRows.clear();
        hasUnsavedChanges = false;
        
        // Limpiar localStorage si existe
        localStorage.removeItem('supabase.auth.token');
        
        // Mostrar login
        showLoginScreen();
        hideAuthLoading();
        
    } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token actualizado para:', session?.user?.email);
        // Verificar que el usuario sigue autorizado después del refresh
        if (session?.user && currentUser?.email !== session.user.email) {
            console.log('⚠️ Usuario cambió después del refresh, re-verificando...');
            await handleAuthStateChange('SIGNED_IN', session);
        }
    }
};

// Función para inicializar autenticación
const initializeAuth = async () => {
    console.log('🚀 Inicializando autenticación...');
    
    // Mostrar pantalla de login por defecto
    showLoginScreen();
    
    try {
        // Configurar listener de cambios de estado
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        
        // Intentar recuperar sesión actual con retry
        let attempts = 0;
        const maxAttempts = 3;
        let session = null;
        
        while (attempts < maxAttempts && !session) {
            attempts++;
            console.log(`🔄 Intento ${attempts} de obtener sesión...`);
            
            const { data: sessionData, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error(`❌ Error obteniendo sesión (intento ${attempts}):`, error);
                if (attempts === maxAttempts) {
                    showAuthError('Error de conexión persistente');
                    return;
                }
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            session = sessionData.session;
            break;
        }
        
        if (session?.user) {
            console.log('🔍 Sesión existente encontrada para:', session.user.email);
            
            // Verificar si la sesión no está expirada
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at < now + 300) { // 5 minutos de margen
                console.log('⚠️ Sesión próxima a expirar, refrescando...');
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                    console.error('❌ Error refrescando sesión inicial:', refreshError);
                    showLoginScreen();
                    return;
                }
                session = refreshData.session;
                console.log('✅ Sesión refrescada exitosamente');
            }
            
            // La función handleAuthStateChange se ejecutará automáticamente con onAuthStateChange
        } else {
            console.log('📝 No hay sesión activa');
            showLoginScreen();
        }
        
        // Configurar refresh automático cada 45 minutos
        setInterval(async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession && isAuthenticated) {
                console.log('🔄 Refrescando sesión automáticamente...');
                await supabase.auth.refreshSession();
            }
        }, 45 * 60 * 1000); // 45 minutos
        
    } catch (error) {
        console.error('❌ Error inicializando auth:', error);
        showAuthError('Error de inicialización');
    }
};

// ===== FUNCIONES EXISTENTES CON MODIFICACIONES MÍNIMAS =====

// Helper function para asegurar strings válidos
const ensureString = (value, defaultValue = 'No especificado') => {
    if (value === null || value === undefined) return defaultValue;
    const stringValue = String(value).trim();
    return stringValue === '' ? defaultValue : stringValue;
};

// Función para formatear monedas
const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '$0';
    const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(num);
};

const parseCurrency = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^\d.-]/g, '');
};

// ===== NUEVA FUNCIÓN PARA CÁLCULO AUTOMÁTICO =====
const calculateTotalValue = (rowData) => {
    const valores = [
        'Valor Acciones ($/Año)',
        'Valor Limpieza ($/Año)', 
        'Valor Celador ($/Año)',
        'Otros ($/Año)'
    ];
    
    let total = 0;
    valores.forEach(campo => {
        const valor = parseFloat(parseCurrency(rowData[campo] || '0'));
        if (!isNaN(valor)) total += valor;
    });
    
    return total;
};

const generateRowPDF = (rowData) => {
    try {
        // Verificar que jsPDF esté disponible (múltiples formas de acceso)
        let jsPDF;
        
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            // Formato moderno: window.jspdf.jsPDF
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jsPDF !== 'undefined') {
            // Formato clásico: window.jsPDF
            jsPDF = window.jsPDF;
        } else {
            // Si no está disponible, intentar cargar dinámicamente
            alert('Error: Librería PDF no disponible. Verificando carga...');
            console.log('🔍 Verificando jsPDF en window:', Object.keys(window).filter(key => key.toLowerCase().includes('pdf')));
            return;
        }

        console.log('✅ jsPDF encontrado:', typeof jsPDF);
        const doc = new jsPDF();
        
        // Configuración de colores corporativos Antofagasta
        const colors = {
            primary: [0, 90, 76],      // #005A4C
            secondary: [61, 167, 160], // #3DA7A0
            accent: [233, 84, 32],     // #E95420
            white: [255, 255, 255],
            lightGray: [248, 249, 250],
            darkGray: [75, 85, 99],
            black: [31, 41, 55]
        };

        // === HEADER DEL PDF ===
        // Fondo del header
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo y título principal
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.white);
        doc.text('COMPROBANTE DE COMPROMISO HÍDRICO', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Gestión Hídrica MLP', 105, 30, { align: 'center' });

        // === INFORMACIÓN DEL COMPROBANTE ===
        let yPos = 55;
        
        // Número de comprobante y fecha
        doc.setTextColor(...colors.black);
        doc.setFontSize(10);
        const comprobanteNum = `CH-${Date.now().toString().slice(-8)}`;
        const fechaGeneracion = new Date().toLocaleDateString('es-CL');
        
        doc.setFont('helvetica', 'bold');
        doc.text('N° Comprobante:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(comprobanteNum, 70, yPos);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha Generación:', 120, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(fechaGeneracion, 170, yPos);

        yPos += 15;

        // === DATOS DEL COMPROMISO ===
        // Título de sección
        doc.setFillColor(...colors.secondary);
        doc.rect(15, yPos - 5, 180, 10, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL COMPROMISO HÍDRICO', 105, yPos + 2, { align: 'center' });

        yPos += 20;
        doc.setTextColor(...colors.black);
        doc.setFontSize(11);

        // Crear tabla de datos - ACTUALIZADA CON NUEVOS CAMPOS
        const datosCompromiso = [
            { label: 'OUA:', value: ensureString(rowData['OUA']) },
            { label: 'Derechos de Agua:', value: ensureString(rowData['Derechos (l/s)'], '0') + ' l/s' },
            { label: 'N° de Acciones:', value: ensureString(rowData['Acciones']) },
            { label: 'Estado del Pago:', value: ensureString(rowData['Status Pago']) },
            { label: 'Período:', value: ensureString(rowData['Período']) },
            { label: 'Valor Acciones:', value: formatCurrency(rowData['Valor Acciones ($/Año)']) },
            { label: 'Valor Limpieza:', value: formatCurrency(rowData['Valor Limpieza ($/Año)']) },
            { label: 'Valor Celador:', value: formatCurrency(rowData['Valor Celador ($/Año)']) },
            { label: 'Otros Valores:', value: formatCurrency(rowData['Otros ($/Año)']) },
            { label: 'Valor Total:', value: formatCurrency(rowData['Valor Total ($/Año)']) },
            { label: 'Forma de Pago:', value: ensureString(rowData['Forma de Pago']) },
            { label: 'Fecha de Pago:', value: ensureString(rowData['Fecha Pago']) }
        ];

        // Dibujar tabla de datos
        datosCompromiso.forEach((dato, index) => {
            const isEven = index % 2 === 0;
            
            // Fondo alternado para filas
            if (isEven) {
                doc.setFillColor(...colors.lightGray);
                doc.rect(20, yPos - 4, 170, 12, 'F');
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.primary);
            doc.text(dato.label, 25, yPos + 3);
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.black);
            doc.text(dato.value, 80, yPos + 3);
            
            yPos += 12;
        });

        // === COMENTARIOS ===
        const comentarioTexto = ensureString(rowData['Comentario'], '');
        if (comentarioTexto.trim()) {
            yPos += 10;
            
            // Título de comentarios
            doc.setFillColor(...colors.accent);
            doc.rect(15, yPos - 5, 180, 10, 'F');
            doc.setTextColor(...colors.white);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('COMENTARIOS', 105, yPos + 2, { align: 'center' });

            yPos += 20;
            doc.setTextColor(...colors.black);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            // Dividir comentarios en líneas
            const comentarioLineas = doc.splitTextToSize(comentarioTexto, 170);
            doc.text(comentarioLineas, 20, yPos);
            yPos += comentarioLineas.length * 5 + 10;
        }

        // === SECCIÓN DE VALIDACIÓN ===
        yPos += 15;
        doc.setFillColor(...colors.lightGray);
        doc.rect(15, yPos - 5, 180, 25, 'F');
        
        doc.setTextColor(...colors.darkGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('VALIDACIÓN DEL COMPROBANTE', 105, yPos + 3, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(' ', 105, yPos + 10, { align: 'center' });
        doc.text('', 105, yPos + 16, { align: 'center' });

        // === FOOTER ===
        yPos = 270; // Posición fija para el footer
        
        // Línea separadora
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        
        yPos += 10;
        doc.setTextColor(...colors.darkGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('© 2025 Sistema de Gestión MLP', 105, yPos, { align: 'center' });
        
        const fechaHora = `Generado automáticamente el ${fechaGeneracion} a las ${new Date().toLocaleTimeString('es-CL')}`;
        doc.text(fechaHora, 105, yPos + 6, { align: 'center' });
        doc.text('Documento válido sin firma ni sello', 105, yPos + 12, { align: 'center' });

        // === GENERAR Y DESCARGAR ===
        const ouaName = ensureString(rowData['OUA'], 'Sin_OUA').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Comprobante_${ouaName}_${comprobanteNum}.pdf`;
        doc.save(filename);

        console.log('✅ PDF generado exitosamente:', filename);
        
        // Mostrar mensaje de éxito temporal
        showTemporaryMessage('📄 PDF descargado exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        console.error('📊 Datos que causaron el error:', rowData);
        
        // Mensaje de error más específico
        if (error.message && error.message.includes('Type of text must be string')) {
            alert('Error: Algunos datos no tienen el formato correcto para el PDF. Revisa la consola para más detalles.');
        } else {
            alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
        }
    }
};

// Función auxiliar para mostrar mensajes temporales
const showTemporaryMessage = (message, type = 'info') => {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Estilos según el tipo
    const styles = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-black'
    };
    
    messageDiv.className += ` ${styles[type] || styles.info}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Animación de entrada
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(full)';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
};

// === FUNCIONES SUPABASE CORREGIDAS ===

// Función mejorada para mostrar estados de carga
const showLoading = (message = 'Cargando...') => {
    console.log('⏳ Mostrando loading:', message);
    isLoading = true;
    
    // Remover overlay existente si existe
    const existingOverlay = document.getElementById('loading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Crear nuevo overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="
            background-color: white;
            border-radius: 8px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
            <div style="
                width: 24px;
                height: 24px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3DA7A0;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span style="color: #1f2937; font-weight: 500;">${message}</span>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loadingOverlay);
};

const hideLoading = () => {
    console.log('✅ Ocultando loading');
    isLoading = false;
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
};

// Función para manejar errores de Supabase
const handleSupabaseError = (error, operation = '') => {
    console.error(`Error en ${operation}:`, error);
    let message = `Error ${operation}`;
    
    if (error.message) {
        message += `: ${error.message}`;
    } else if (typeof error === 'string') {
        message += `: ${error}`;
    }
    
    alert(message);
    hideLoading();
};

// ===== FUNCIÓN CORREGIDA PARA OBTENER TODOS LOS DATOS =====
const fetchAllData = async () => {
    try {
        console.log('🔄 Iniciando carga de datos...');
        showLoading('Cargando datos desde la base de datos...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compromisos?select=*&order=id`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Respuesta recibida:', response.status);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        // Verificar que tenemos datos
        if (!Array.isArray(data)) {
            throw new Error('Los datos recibidos no son un array');
        }

        // ===== MAPEO ACTUALIZADO CON TODOS LOS CAMPOS NUEVOS =====
        tableData = data.map(row => ({
            id: row.id || 0,
            'OUA': row.oua || '',
            'Derechos (l/s)': row.derechos_ls || '',
            'Acciones': row.acciones || '',
            'Adjuntar Certificado': row.adjuntar_certificado_cobranza || '',
            'Período': row.periodo || '',
            'Valor Acciones ($/Año)': row.valor_acciones_anio || '',
            'Valor Limpieza ($/Año)': row.valor_limpieza_anio || '',
            'Valor Celador ($/Año)': row.valor_celador_anio || '',
            'Otros ($/Año)': row.otros_anio || '',
            'Valor Total ($/Año)': row.valor_total_anio || '',
            'Forma de Pago': row.forma_pago || '',
            'Adjuntar Memo Pago': row.adjuntar_memo_pago || '',
            'Fecha Pago': row.fecha_pago || '',
            'Status Pago': row.status_pago || '',
            'Comentario': row.comentario || ''
        }));

        console.log('🗂️ Datos mapeados:', tableData);

        // Actualizar nextId para nuevas filas
        if (tableData.length > 0) {
            nextId = Math.max(...tableData.map(r => r.id)) + 1;
            console.log('🆔 Próximo ID:', nextId);
        }

        // Guardar datos originales para comparación
        originalData = JSON.parse(JSON.stringify(tableData));
        hasUnsavedChanges = false;
        selectedRows.clear();
        currentFilename = 'Base de Datos';
        
        console.log('✅ Datos procesados exitosamente');
        console.log('📊 Total de registros:', tableData.length);
        
        // Renderizar tabla
        renderTable();
        updateAppState();
        
        hideLoading();
        
        // Mensaje de éxito
        if (tableData.length > 0) {
            console.log(`🎉 ¡Datos cargados exitosamente! ${tableData.length} registros encontrados.`);
        } else {
            console.log('⚠️ Base de datos conectada pero sin registros');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error detallado:', error);
        handleSupabaseError(error, 'al cargar datos');
        
        // En caso de error, asegurar que se oculte la carga
        hideLoading();
        return [];
    }
};

// ===== FUNCIÓN PARA INSERTAR UNA FILA =====
const insertRowToSupabase = async (row) => {
    try {
        showLoading('Guardando nueva fila...');
        
        // ===== MAPEO ACTUALIZADO CON TODOS LOS CAMPOS NUEVOS =====
        const supabaseRow = {
            oua: row['OUA'] || null,
            derechos_ls: row['Derechos (l/s)'] ? parseFloat(row['Derechos (l/s)']) : null,
            acciones: row['Acciones'] ? parseFloat(row['Acciones']) : null,
            adjuntar_certificado_cobranza: row['Adjuntar Certificado'] || null,
            periodo: row['Período'] || null,
            valor_acciones_anio: row['Valor Acciones ($/Año)'] ? parseFloat(parseCurrency(row['Valor Acciones ($/Año)'])) : null,
            valor_limpieza_anio: row['Valor Limpieza ($/Año)'] ? parseFloat(parseCurrency(row['Valor Limpieza ($/Año)'])) : null,
            valor_celador_anio: row['Valor Celador ($/Año)'] ? parseFloat(parseCurrency(row['Valor Celador ($/Año)'])) : null,
            otros_anio: row['Otros ($/Año)'] ? parseFloat(parseCurrency(row['Otros ($/Año)'])) : null,
            valor_total_anio: row['Valor Total ($/Año)'] ? parseFloat(parseCurrency(row['Valor Total ($/Año)'])) : null,
            forma_pago: row['Forma de Pago'] || null,
            adjuntar_memo_pago: row['Adjuntar Memo Pago'] || null,
            fecha_pago: row['Fecha Pago'] || null,
            status_pago: row['Status Pago'] || null,
            comentario: row['Comentario'] || null
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/compromisos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(supabaseRow)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        hideLoading();
        return data[0];
    } catch (error) {
        handleSupabaseError(error, 'al guardar fila');
        return null;
    }
};

// ===== FUNCIÓN PARA ACTUALIZAR UNA FILA =====
const updateRowInSupabase = async (id, row) => {
    try {
        showLoading('Actualizando fila...');
        
        // ===== MAPEO ACTUALIZADO CON TODOS LOS CAMPOS NUEVOS =====
        const supabaseRow = {
            oua: row['OUA'] || null,
            derechos_ls: row['Derechos (l/s)'] ? parseFloat(row['Derechos (l/s)']) : null,
            acciones: row['Acciones'] ? parseFloat(row['Acciones']) : null,
            adjuntar_certificado_cobranza: row['Adjuntar Certificado'] || null,
            periodo: row['Período'] || null,
            valor_acciones_anio: row['Valor Acciones ($/Año)'] ? parseFloat(parseCurrency(row['Valor Acciones ($/Año)'])) : null,
            valor_limpieza_anio: row['Valor Limpieza ($/Año)'] ? parseFloat(parseCurrency(row['Valor Limpieza ($/Año)'])) : null,
            valor_celador_anio: row['Valor Celador ($/Año)'] ? parseFloat(parseCurrency(row['Valor Celador ($/Año)'])) : null,
            otros_anio: row['Otros ($/Año)'] ? parseFloat(parseCurrency(row['Otros ($/Año)'])) : null,
            valor_total_anio: row['Valor Total ($/Año)'] ? parseFloat(parseCurrency(row['Valor Total ($/Año)'])) : null,
            forma_pago: row['Forma de Pago'] || null,
            adjuntar_memo_pago: row['Adjuntar Memo Pago'] || null,
            fecha_pago: row['Fecha Pago'] || null,
            status_pago: row['Status Pago'] || null,
            comentario: row['Comentario'] || null
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/compromisos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(supabaseRow)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        hideLoading();
        return data[0];
    } catch (error) {
        handleSupabaseError(error, 'al actualizar fila');
        return null;
    }
};

// Función para eliminar una fila
const deleteRowFromSupabase = async (id) => {
    try {
        showLoading('Eliminando fila...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compromisos?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        hideLoading();
        return true;
    } catch (error) {
        handleSupabaseError(error, 'al eliminar fila');
        return false;
    }
};

// Función para eliminar múltiples filas
const deleteMultipleRowsFromSupabase = async (ids) => {
    try {
        showLoading(`Eliminando ${ids.length} filas...`);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compromisos?id=in.(${ids.join(',')})`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        hideLoading();
        return true;
    } catch (error) {
        handleSupabaseError(error, 'al eliminar filas');
        return false;
    }
};

// Función para sincronizar todos los cambios locales con Supabase
const syncAllChangesToSupabase = async () => {
    try {
        showLoading('Sincronizando cambios con la base de datos...');
        
        const results = [];
        
        for (const row of tableData) {
            // Si la fila es nueva (no existe en originalData), insertarla
            const originalRow = originalData.find(r => r.id === row.id);
            
            if (!originalRow) {
                // Nueva fila - insertar
                const result = await insertRowToSupabase(row);
                if (result) {
                    // Actualizar el ID local con el ID de Supabase
                    row.id = result.id;
                    results.push({action: 'insert', success: true, id: result.id});
                } else {
                    results.push({action: 'insert', success: false, id: row.id});
                }
            } else {
                // Fila existente - verificar si cambió
                const hasChanged = headers.some(header => row[header] !== originalRow[header]);
                
                if (hasChanged) {
                    const result = await updateRowInSupabase(row.id, row);
                    results.push({
                        action: 'update', 
                        success: result !== null, 
                        id: row.id
                    });
                }
            }
        }
        
        // Verificar filas eliminadas
        for (const originalRow of originalData) {
            if (!tableData.find(r => r.id === originalRow.id)) {
                const result = await deleteRowFromSupabase(originalRow.id);
                results.push({
                    action: 'delete', 
                    success: result, 
                    id: originalRow.id
                });
            }
        }
        
        // Actualizar estado
        originalData = JSON.parse(JSON.stringify(tableData));
        hasUnsavedChanges = false;
        updateAppState();
        
        hideLoading();
        
        // Mostrar resumen
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        
        if (total > 0) {
            alert(`Sincronización completada: ${successful}/${total} operaciones exitosas`);
        }
        
        return results;
    } catch (error) {
        handleSupabaseError(error, 'al sincronizar cambios');
        return [];
    }
};

// ===== RESTO DE FUNCIONES EXISTENTES (sin cambios) =====

// === VALIDACIÓN DE PERÍODO ===

// Función SIMPLIFICADA para validar formato de período
const validatePeriodFormat = (value) => {
    if (!value) return true; // Permitir campo vacío
    
    // Patrón para año individual (ej: 2025) o rango (ej: 2020-2025, etc.)
    const yearPattern = /^(\d{4})$/; // Solo año: 2025
    const rangePattern = /^(\d{4})-(\d{4})$/; // Rango: 2020-2025
    
    if (yearPattern.test(value)) {
        const year = parseInt(value);
        return year >= 1900 && year <= 2100; // Rango razonable de años
    }
    
    if (rangePattern.test(value)) {
        const match = value.match(rangePattern);
        const startYear = parseInt(match[1]);
        const endYear = parseInt(match[2]);
        
        // Solo validar que ambos años estén en rango razonable
        if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
            return false;
        }
        
        // Validar que el año final sea mayor que el inicial
        if (endYear <= startYear) {
            return false;
        }
        
        return true; // ✅ Permitir cualquier diferencia de años
    }
    
    return false;
};

// Función para formatear período automáticamente
// ===== FUNCIÓN formatPeriod MEJORADA =====
// BUSCAR la función formatPeriod y REEMPLAZARLA

const formatPeriod = (value) => {
    console.log('🔧 Formateando período:', value);
    
    // 🔥 PASO 1: Eliminar TODO lo que no sea número o guión
    let cleaned = value.replace(/[^\d-]/g, '');
    
    // PASO 2: Limitar longitud máxima
    if (cleaned.length > 9) {
        cleaned = cleaned.substring(0, 9);
    }
    
    // PASO 3: Manejar múltiples guiones (solo permitir uno)
    const guionIndex = cleaned.indexOf('-');
    if (guionIndex !== -1) {
        // Tomar solo hasta el primer guión + lo que sigue
        const beforeGuion = cleaned.substring(0, guionIndex);
        const afterGuion = cleaned.substring(guionIndex + 1).replace(/-/g, ''); // Quitar guiones adicionales
        
        // Limitar cada parte a 4 dígitos
        const beforeLimited = beforeGuion.substring(0, 4);
        const afterLimited = afterGuion.substring(0, 4);
        
        cleaned = beforeLimited + (afterLimited ? '-' + afterLimited : '');
    } else {
        // Solo año individual, máximo 4 dígitos
        if (cleaned.length > 4) {
            cleaned = cleaned.substring(0, 4);
        }
    }
    
    console.log('✅ Período formateado:', cleaned);
    return cleaned;
};

// Función mejorada para crear input de período (SIN BLOQUEOS)

// ===== FUNCIÓN CORREGIDA PARA CREAR INPUT DE PERÍODO =====
// BUSCAR la función createPeriodInput en script.js y REEMPLAZARLA COMPLETA

const createPeriodInput = (value, rowId) => {
    const container = document.createElement('div');
    const input = document.createElement('input');
    
    input.className = 'table-body-cell-editable table-body-cell-editable-periodo';
    input.value = value || '';
    input.type = 'text';
    input.placeholder = '2025 o 2020-2025';
    input.dataset.key = 'Período';
    input.maxLength = 9; // Máximo: 2024-2025 (9 caracteres)
    
    // Solo deshabilitar para viewers
    if (userRole === 'viewer') {
        input.disabled = true;
        input.style.pointerEvents = 'none';
        input.style.backgroundColor = '#f9fafb';
        input.style.opacity = '0.7';
    }
    
    // ===== VALIDACIÓN MEJORADA EN TIEMPO REAL =====
    input.addEventListener('input', (e) => {
        let currentValue = e.target.value;
        
        // 🔥 ELIMINAR INMEDIATAMENTE cualquier carácter que no sea número o guión
        let cleanedValue = currentValue.replace(/[^\d-]/g, '');
        
        // Aplicar formato adicional
        const formatted = formatPeriod(cleanedValue);
        e.target.value = formatted;
        
        // Validar formato y mostrar feedback visual
        const isValid = validatePeriodFormat(formatted);
        
        if (formatted && !isValid) {
            e.target.style.borderColor = '#dc2626';
            e.target.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.3)';
            e.target.style.backgroundColor = '#fef2f2';
            e.target.title = 'Formato válido: 2025 o 2020-2025';
        } else {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = '';
            e.target.style.backgroundColor = '#ffffff';
            e.target.title = '';
        }
    });
    
    // ===== PREVENCIÓN ESTRICTA DE CARACTERES INVÁLIDOS =====
    input.addEventListener('keypress', (e) => {
        const char = e.key;
        const currentValue = e.target.value;
        
        console.log('🔍 Tecla presionada:', char, 'Código:', e.keyCode);
        
        // ✅ PERMITIR teclas de control (backspace, delete, arrows, tab, enter)
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key)) {
            return; // Permitir estas teclas
        }
        
        // ✅ PERMITIR solo números (0-9)
        if (char >= '0' && char <= '9') {
            return; // Permitir números
        }
        
        // ✅ PERMITIR guión solo en condiciones específicas
        if (char === '-') {
            // No permitir guión si ya hay uno
            if (currentValue.includes('-')) {
                console.log('❌ Ya hay un guión');
                e.preventDefault();
                return;
            }
            
            // No permitir guión al inicio
            if (currentValue.length === 0) {
                console.log('❌ Guión al inicio no permitido');
                e.preventDefault();
                return;
            }
            
            // No permitir guión si no hay al menos 4 dígitos antes
            if (currentValue.length < 4) {
                console.log('❌ Necesita al menos 4 dígitos antes del guión');
                e.preventDefault();
                return;
            }
            
            return; // Permitir guión en condiciones válidas
        }
        
        // 🚫 BLOQUEAR TODO LO DEMÁS (incluyendo letras, espacios, símbolos)
        console.log('❌ Carácter bloqueado:', char);
        e.preventDefault();
    });
    
    // ===== VALIDACIÓN AL PERDER FOCO =====
    input.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        
        // Si está vacío, permitir
        if (!value) {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = '';
            e.target.style.backgroundColor = '#ffffff';
            return;
        }
        
        // Limpiar cualquier carácter inválido que pueda haber quedado
        const finalCleaned = value.replace(/[^\d-]/g, '');
        if (finalCleaned !== value) {
            e.target.value = finalCleaned;
            console.log('🧹 Limpieza final aplicada');
        }
        
        // Validar formato final
        if (validatePeriodFormat(finalCleaned)) {
            e.target.style.borderColor = '#10b981'; // Verde para válido
            e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.3)';
            e.target.style.backgroundColor = '#f0fdf4';
            e.target.title = '';
            
            // Limpiar estilos después de 2 segundos
            setTimeout(() => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = '';
                e.target.style.backgroundColor = '#ffffff';
            }, 2000);
        } else if (finalCleaned) {
            e.target.style.borderColor = '#dc2626';
            e.target.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.3)';
            e.target.style.backgroundColor = '#fef2f2';
            e.target.title = 'Formato inválido. Ejemplos válidos: 2025 o 2020-2025';
        }
    });
    
    // ===== LIMPIAR ERRORES AL HACER CLIC =====
    input.addEventListener('focus', (e) => {
        if (e.target.style.borderColor === 'rgb(220, 38, 38)') {
            e.target.style.borderColor = '#3DA7A0';
            e.target.style.boxShadow = '0 0 0 2px rgba(61, 167, 160, 0.3)';
            e.target.style.backgroundColor = '#ffffff';
        }
    });
    
    // ===== PREVENCIÓN ADICIONAL CON PASTE =====
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        
        // Obtener texto del clipboard
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        console.log('📋 Texto pegado:', pastedText);
        
        // Limpiar solo números y guiones
        const cleanedPaste = pastedText.replace(/[^\d-]/g, '');
        
        // Aplicar formato
        const formattedPaste = formatPeriod(cleanedPaste);
        
        // Establecer valor limpio
        e.target.value = formattedPaste;
        
        // Disparar evento input para validación
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✅ Texto pegado y limpiado:', formattedPaste);
    });
    
    container.appendChild(input);
    return container;
};

// === FUNCIONES DE SELECCIÓN ===

const updateSelectionUI = () => {
    // Selection functionality disabled - function does nothing
    return;
};

// === FUNCIONES DEL DASHBOARD ===

const switchView = (view) => {
    currentView = view;
    
    if (view === 'data') {
        if (dataSection) dataSection.classList.remove('hidden');
        if (dashboardContainer) dashboardContainer.classList.add('hidden');
        if (dataViewBtn) dataViewBtn.classList.add('active');
        if (dashboardViewBtn) dashboardViewBtn.classList.remove('active');
        
        updateAppState(); // Centraliza la lógica de mostrar/ocultar
    } else {
        if (dataSection) dataSection.classList.add('hidden');
        if (dashboardContainer) dashboardContainer.classList.remove('hidden');
        if (dataViewBtn) dataViewBtn.classList.remove('active');
        if (dashboardViewBtn) dashboardViewBtn.classList.add('active');
        
        // Retraso para asegurar que el contenedor es visible antes de dibujar gráficos
        setTimeout(() => {
            updateDashboard();
        }, 100);
    }
};

const calculateMetrics = () => {
    if (tableData.length === 0) {
        return {
            totalOuas: 0, totalPaidAmount: 0, completionRate: 0, totalRights: 0,
            pendingPayments: 0, statusDistribution: {}, periodDistribution: {},
            recentPayments: [], upcomingPayments: [], alerts: []
        };
    }

    const metrics = {
        totalOuas: tableData.length,
        totalPaidAmount: 0, // Cambiado: solo suma pagos realizados
        completedPayments: 0,
        totalRights: 0, // Cambiado: suma total de derechos de agua
        pendingPayments: 0,
        statusDistribution: { 'Realizado': 0, 'Pendiente': 0, 'En Proceso': 0, 'Cancelado': 0, 'Rechazado': 0 },
        periodDistribution: {},
        recentPayments: [],
        upcomingPayments: [],
        alerts: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    tableData.forEach(row => {
        const status = row['Status Pago'] || 'Sin Estado';
        
        // 1. MONTO PAGADO: Solo sumar "Valor Total ($/Año)" si Status Pago es "Realizado"
        if (status === 'Realizado') {
            const amount = parseFloat(parseCurrency(row['Valor Total ($/Año)'] || 0));
            if (!isNaN(amount)) {
                metrics.totalPaidAmount += amount;
            }
        }

        // 2. TOTAL DERECHOS DE AGUA: Sumar todos los valores de "Derechos (l/s)"
        const rights = parseFloat(row['Derechos (l/s)'] || 0);
        if (!isNaN(rights)) {
            metrics.totalRights += rights;
        }

        // 3. Contadores para % PAGOS REALIZADOS
        if (metrics.statusDistribution.hasOwnProperty(status)) {
            metrics.statusDistribution[status]++;
        } else if (status !== 'Sin Estado') {
            metrics.statusDistribution[status] = 1;
        }

        if (status === 'Realizado') metrics.completedPayments++;
        if (status === 'Pendiente') metrics.pendingPayments++;

        const period = row['Período'] || 'Sin Período';
        metrics.periodDistribution[period] = (metrics.periodDistribution[period] || 0) + 1;
        
        const paymentDateStr = row['Fecha Pago'];
        if (paymentDateStr) {
            // Intentar crear una fecha válida, asumiendo formato AAAA-MM-DD
            const dateParts = paymentDateStr.split('-');
            if (dateParts.length === 3) {
                const paymentDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                 if (!isNaN(paymentDate)) {
                    const amount = parseFloat(parseCurrency(row['Valor Total ($/Año)'] || 0));
                    if (status === 'Realizado') {
                        metrics.recentPayments.push({ oua: row['OUA'], amount: formatCurrency(amount), date: paymentDate, rawDate: paymentDateStr });
                    }
                    if (status === 'Pendiente') {
                         metrics.upcomingPayments.push({ 
                             oua: row['OUA'], 
                             amount: formatCurrency(amount), 
                             date: paymentDate, 
                             status: status, 
                             isOverdue: paymentDate < today, 
                             rawDate: paymentDateStr,
                             comment: row['Comentario'] || '' 
                         });
                    }
                 }
            }
        }
    });

    // CÁLCULO CORRECTO: % Pagos Realizados = (Pagos Realizados / Total de OUAs) * 100
    metrics.completionRate = metrics.totalOuas > 0 ? Math.round((metrics.completedPayments / metrics.totalOuas) * 100) : 0;
    
    // YA NO NECESITAMOS avgRights porque totalRights ya es el total correcto
    // metrics.avgRights se elimina porque ahora usamos totalRights directamente

    metrics.recentPayments.sort((a, b) => b.date - a.date);
    metrics.recentPayments = metrics.recentPayments.slice(0, 5);

    metrics.upcomingPayments.sort((a, b) => a.date - b.date);
    metrics.upcomingPayments = metrics.upcomingPayments.slice(0, 5);

    return metrics;
};

const updateDashboard = () => {
    if (currentView !== 'dashboard') return;
    
    const metrics = calculateMetrics();
    
    const totalOuasEl = document.getElementById('total-ouas');
    const totalAmountEl = document.getElementById('total-amount');
    const completionRateEl = document.getElementById('completion-rate');
    const avgRightsEl = document.getElementById('avg-rights');
    const pendingPaymentsEl = document.getElementById('pending-payments');
    
    if (totalOuasEl) totalOuasEl.textContent = metrics.totalOuas;
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(metrics.totalPaidAmount);
    if (completionRateEl) completionRateEl.textContent = `${metrics.completionRate}%`;
    if (avgRightsEl) avgRightsEl.textContent = `${metrics.totalRights.toLocaleString('es-CL')} l/s`;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = metrics.pendingPayments;
    
    const alertsContainer = document.getElementById('alerts-container');
    if (alertsContainer) {
        alertsContainer.innerHTML = '';
        if (tableData.length === 0) {
            alertsContainer.innerHTML = `<div class="dashboard-alert dashboard-alert-warning"><strong>📊 Dashboard listo:</strong> Carga datos para ver análisis detallados.</div>`;
        } else {
            alertsContainer.innerHTML = `<div class="dashboard-alert dashboard-alert-success"><strong>✓ Datos cargados:</strong> Dashboard actualizado con ${tableData.length} registros.</div>`;
        }
    }
    
    updateDashboardTables(metrics.recentPayments, metrics.upcomingPayments);
    
    if (tableData.length > 0 && typeof Chart !== 'undefined') {
        createCharts(metrics);
    }
};

const updateDashboardTables = (recentPayments, upcomingPayments) => {
    const recentTable = document.getElementById('recent-payments-table');
    if (recentTable) {
        recentTable.innerHTML = recentPayments.length === 0 ? '<tr><td colspan="3" class="text-center text-gray-400 py-4">No hay pagos recientes</td></tr>' : recentPayments.map(p => `<tr><td class="font-medium">${p.oua || 'N/A'}</td><td>${p.amount}</td><td>${p.date.toLocaleDateString('es-CL')}</td></tr>`).join('');
    }

    const upcomingTable = document.getElementById('upcoming-payments-table');
    if (upcomingTable) {
        upcomingTable.innerHTML = upcomingPayments.length === 0 ? 
            '<tr><td colspan="5" class="text-center text-gray-400 py-4">No hay pagos pendientes</td></tr>' : 
            upcomingPayments.map(p => {
                const dateClass = p.isOverdue ? 'text-red-400 font-bold' : '';
                const statusBadge = '<span class="pending-status-badge">Pendiente</span>';
                const comment = p.comment ? p.comment.substring(0, 50) + (p.comment.length > 50 ? '...' : '') : '-';
                return `<tr>
                    <td class="font-medium">${p.oua || 'N/A'}</td>
                    <td>${p.amount}</td>
                    <td class="${dateClass}">${p.date.toLocaleDateString('es-CL')}</td>
                    <td>${statusBadge}</td>
                    <td class="comment-cell" title="${p.comment || ''}">${comment}</td>
                </tr>`;
            }).join('');
    }
};

const createCharts = (metrics) => {
    // Configuración base para tema blanco
    const chartOptions = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { 
                position: 'bottom', 
                labels: { 
                    color: '#1f2937', // TEXTO OSCURO
                    font: {
                        size: 12,
                        weight: '500'
                    },
                    usePointStyle: true,
                    padding: 15
                } 
            },
            tooltip: {
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1
            }
        } 
    };
    
    // Configuración de escalas para tema blanco
    const scaleOptions = { 
        y: { 
            beginAtZero: true, 
            ticks: { 
                color: '#1f2937', // TEXTO OSCURO
                font: {
                    size: 11,
                    weight: '500'
                }
            }, 
            grid: { 
                color: '#f3f4f6', // LÍNEAS CLARAS
                borderColor: '#d1d5db'
            } 
        }, 
        x: { 
            ticks: { 
                color: '#1f2937', // TEXTO OSCURO
                font: {
                    size: 11,
                    weight: '500'
                }
            }, 
            grid: { 
                color: '#f3f4f6', // LÍNEAS CLARAS
                borderColor: '#d1d5db'
            } 
        } 
    };

    // Gráfico de Estado de Pagos (Dona)
    if (statusChart) statusChart.destroy();
    
    // Calculate period range from the periodo field for the caption
    const periodos = new Set();
    tableData.forEach(row => {
        const periodo = row['Período'] || '';
        if (periodo && periodo.trim() !== '' && periodo !== 'Sin Período') {
            // Extract year from periodo (handle formats like "2024", "2024-2025", etc.)
            const yearMatch = periodo.match(/\d{4}/g);
            if (yearMatch) {
                yearMatch.forEach(year => {
                    const yearNum = parseInt(year);
                    if (yearNum >= 2000 && yearNum <= 2100) { // Reasonable year range
                        periodos.add(yearNum);
                    }
                });
            }
        }
    });
    
    // Update the caption with the calculated period range
    const periodRangeText = document.getElementById('periodRangeText');
    if (periodRangeText && periodos.size > 0) {
        const years = Array.from(periodos).sort((a, b) => a - b);
        const minYear = years[0];
        const maxYear = years[years.length - 1];
        
        if (minYear === maxYear) {
            periodRangeText.textContent = `Periodo considerado: ${minYear}`;
        } else {
            periodRangeText.textContent = `Periodo considerado: ${minYear} - ${maxYear}`;
        }
    }
    
    const statusData = Object.entries(metrics.statusDistribution).filter(([_, count]) => count > 0);
    if (statusData.length > 0) {
        const statusCanvas = document.getElementById('statusChart');
        if (statusCanvas) {
            statusChart = new Chart(statusCanvas, { 
                type: 'doughnut', 
                data: { 
                    labels: statusData.map(([s]) => s), 
                    datasets: [{ 
                        data: statusData.map(([_, c]) => c), 
                        backgroundColor: ['#3DA7A0', '#E95420', '#005A4C', '#6B7280', '#dc2626'], 
                        borderWidth: 2, 
                        borderColor: '#ffffff' // BORDES BLANCOS
                    }] 
                }, 
                options: {
                    ...chartOptions,
                    cutout: '60%'
                }
            });
        }
    }

    // Gráfico de Payments to OUAs by Regularization Period (Grouped Bar)
    if (amountChart) amountChart.destroy();
    
    // Calculate payment data by period and category
    const calculatePeriodPaymentData = (selectedOua = 'todas') => {
        console.log(`🔍 Calculating data for OUA: "${selectedOua}"`);
        
        let totalAcciones = 0;
        let totalLimpieza = 0;
        let totalCeladores = 0;
        const periods = new Set();
        let matchedRows = 0;
        
        tableData.forEach(row => {
            const oua = row['OUA'] || '';
            const periodo = row['Período'] || '';
            const status = row['Status Pago'] || '';
            
            // Skip if not paid or if OUA filter doesn't match
            if (status !== 'Realizado') return;
            if (selectedOua !== 'todas' && oua !== selectedOua) return;
            
            matchedRows++;
            
            // Collect period information
            if (periodo && periodo.trim() !== '' && periodo !== 'Sin Período') {
                periods.add(periodo.trim());
            }
            
            // Parse amounts and sum them
            const acciones = parseFloat(row['Valor Acciones ($/Año)'] || 0);
            const limpieza = parseFloat(row['Valor Limpieza ($/Año)'] || 0);
            const celadores = parseFloat(row['Valor Celador ($/Año)'] || 0);
            
            totalAcciones += isNaN(acciones) ? 0 : acciones;
            totalLimpieza += isNaN(limpieza) ? 0 : limpieza;
            totalCeladores += isNaN(celadores) ? 0 : celadores;
        });
        
        console.log(`📊 Matched ${matchedRows} rows for OUA "${selectedOua}"`);
        console.log(`💰 Totals - Acciones: ${totalAcciones}, Limpieza: ${totalLimpieza}, Celadores: ${totalCeladores}`);
        
        // Determine the period label
        let periodLabel = 'Sin período';
        if (periods.size > 0) {
            const periodArray = Array.from(periods).sort();
            
            if (selectedOua !== 'todas') {
                // For specific OUA, use the period as-is
                periodLabel = periodArray[0]; // Use first/primary period for this OUA
            } else {
                // For all OUAs, combine periods or show range
                if (periodArray.length === 1) {
                    periodLabel = periodArray[0];
                } else {
                    // Extract years and create range
                    const years = new Set();
                    periodArray.forEach(period => {
                        const yearMatches = period.match(/\d{4}/g);
                        if (yearMatches) {
                            yearMatches.forEach(year => years.add(parseInt(year)));
                        }
                    });
                    
                    if (years.size > 1) {
                        const sortedYears = Array.from(years).sort();
                        periodLabel = `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}`;
                    } else if (years.size === 1) {
                        periodLabel = Array.from(years)[0].toString();
                    } else {
                        periodLabel = periodArray.join(', ');
                    }
                }
            }
        }
        
        return {
            period: periodLabel,
            acciones: totalAcciones,
            limpieza: totalLimpieza,
            celadores: totalCeladores
        };
    };
    
    // Populate OUA filter dropdown for amount chart
    const populateOuaFilterAmount = () => {
        const ouaFilter = document.getElementById('ouaFilterAmount');
        if (!ouaFilter) {
            console.warn('⚠️ OUA filter element not found');
            return;
        }
        
        // Get unique OUAs
        const ouas = [...new Set(tableData.map(row => row['OUA'] || '').filter(oua => oua.trim() !== ''))].sort();
        
        console.log('🔍 Found OUAs for filter:', ouas);
        
        // Clear existing options except "Todas las OUAs"
        ouaFilter.innerHTML = '<option value="todas">Todas las OUAs</option>';
        
        // Add OUA options
        ouas.forEach(oua => {
            const option = document.createElement('option');
            option.value = oua;
            option.textContent = oua;
            ouaFilter.appendChild(option);
        });
        
        console.log('✅ OUA filter populated with', ouas.length, 'options');
    };
    
    // Create the grouped bar chart
    const createPeriodPaymentsChart = (selectedOua = 'todas') => {
        // Destroy existing chart first
        if (amountChart) {
            amountChart.destroy();
            amountChart = null;
        }
        
        const data = calculatePeriodPaymentData(selectedOua);
        
        // Check if we have any data
        if (data.acciones === 0 && data.limpieza === 0 && data.celadores === 0) {
            console.log('No period payment data available');
            // Create empty chart
            const amountCanvas = document.getElementById('amountChart');
            if (amountCanvas) {
                amountChart = new Chart(amountCanvas, {
                    type: 'bar',
                    data: {
                        labels: ['Sin datos'],
                        datasets: [{
                            label: 'No hay datos disponibles',
                            data: [0],
                            backgroundColor: '#9ca3af'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
            return;
        }
        
        const chartData = {
            labels: [data.period], // Single label for the period
            datasets: [
                {
                    label: 'Acciones',
                    data: [Math.round(data.acciones)],
                    backgroundColor: '#3DA7A0',
                    borderColor: '#3DA7A0',
                    borderWidth: 1
                },
                {
                    label: 'Limpieza',
                    data: [Math.round(data.limpieza)],
                    backgroundColor: '#005A4C',
                    borderColor: '#005A4C',
                    borderWidth: 1
                },
                {
                    label: 'Celadores',
                    data: [Math.round(data.celadores)],
                    backgroundColor: '#E95420',
                    borderColor: '#E95420',
                    borderWidth: 1
                }
            ]
        };
        
        console.log(`📊 Period Payments Chart - Period: ${data.period}, Acciones: $${data.acciones.toLocaleString()}, Limpieza: $${data.limpieza.toLocaleString()}, Celadores: $${data.celadores.toLocaleString()}`);
        
        const amountCanvas = document.getElementById('amountChart');
        if (amountCanvas) {
            amountChart = new Chart(amountCanvas, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                color: '#1f2937',
                                font: {
                                    size: 12,
                                    weight: '500'
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            ticks: {
                                color: '#1f2937',
                                font: {
                                    size: 11,
                                    weight: '500'
                                },
                                callback: function(value) {
                                    return '$' + value.toLocaleString('es-CL');
                                }
                            },
                            grid: {
                                color: '#f3f4f6',
                                borderColor: '#d1d5db'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#1f2937',
                                font: {
                                    size: 12,
                                    weight: '500'
                                },
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(31, 41, 55, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#374151',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: $${context.parsed.y.toLocaleString('es-CL')}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    };
    
    // Setup OUA filter functionality for amount chart
    populateOuaFilterAmount();
    createPeriodPaymentsChart();
    
    // Add event listener for OUA filter
    const ouaFilterAmount = document.getElementById('ouaFilterAmount');
    if (ouaFilterAmount) {
        console.log('✅ Adding event listener to OUA filter');
        ouaFilterAmount.addEventListener('change', function() {
            console.log(`🔄 OUA filter changed to: "${this.value}"`);
            createPeriodPaymentsChart(this.value);
        });
    } else {
        console.warn('⚠️ Could not find ouaFilterAmount element for event listener');
    }

    // Gráfico de % Derechos regularizados durante el año
    if (regularizationChart) regularizationChart.destroy();

    // Calculate cumulative regularization data from real Supabase data
    const calculateRegularizationData = () => {
        console.log('🔍 Calculating regularization data from tableData:', tableData.length, 'records');
        
        // Get total available water rights for all OUAs
        const totalRights = tableData.reduce((sum, row) => {
            const rights = parseFloat(row['Derechos (l/s)'] || 0);
            const validRights = isNaN(rights) ? 0 : rights;
            return sum + validRights;
        }, 0);

        console.log('💧 Total water rights:', totalRights, 'l/s');
        
        if (totalRights === 0) {
            console.warn('⚠️ No water rights data found');
            return { labels: [], datasets: [], totalRights: 0, regularizedRights: 0 };
        }

        // Group data by year and month for regularized rights (Status Pago = "Realizado")
        const regularizedByDate = {};
        const yearLastDates = {}; // Track the last date for each year
        let totalRegularizedRights = 0;
        
        tableData.forEach(row => {
            const status = row['Status Pago'] || '';  // Fixed field name
            if (status === 'Realizado') {
                const fecha = row['Fecha Pago'] || '';  // Fixed field name
                const rights = parseFloat(row['Derechos (l/s)'] || 0);
                
                if (fecha && !isNaN(rights) && rights > 0) {
                    // Parse date more robustly
                    let date = new Date(fecha);
                    
                    // If direct parsing fails, try different formats
                    if (isNaN(date.getTime())) {
                        // Try YYYY-MM-DD format
                        const parts = fecha.split('-');
                        if (parts.length === 3) {
                            date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        }
                    }
                    
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = date.getMonth(); // 0-11
                        
                        // Track the last date for each year
                        if (!yearLastDates[year] || date > yearLastDates[year]) {
                            yearLastDates[year] = date;
                        }
                        
                        const key = `${year}-${month}`;
                        if (!regularizedByDate[key]) {
                            regularizedByDate[key] = { year, month, rights: 0, count: 0, lastDate: date };
                        }
                        regularizedByDate[key].rights += rights;
                        regularizedByDate[key].count += 1;
                        
                        // Update last date for this month if this date is later
                        if (!regularizedByDate[key].lastDate || date > regularizedByDate[key].lastDate) {
                            regularizedByDate[key].lastDate = date;
                        }
                        
                        totalRegularizedRights += rights;
                    }
                }
            }
        });

        console.log('📈 Regularized rights by date:', regularizedByDate);
        console.log('📅 Last dates by year:', yearLastDates);
        console.log('✅ Total regularized rights:', totalRegularizedRights, 'l/s');

        // Create monthly labels
        const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Get unique years from actual data and sort them
        const actualYears = [...new Set(Object.values(regularizedByDate).map(d => d.year))].sort();
        const currentYear = new Date().getFullYear();
        
        console.log('📅 Years found in data:', actualYears);
        
        const datasets = [];
        const datasetMetadata = []; // Store metadata for each dataset including last point info
        
        actualYears.forEach((year) => {
            const yearData = [];
            let cumulativeRights = 0;
            let lastValidMonth = -1;
            let lastValidValue = 0;
            let actualLastDate = yearLastDates[year]; // Get the actual last date for this year
            
            // Calculate cumulative percentage for each month
            for (let month = 0; month < 12; month++) {
                const key = `${year}-${month}`;
                if (regularizedByDate[key]) {
                    cumulativeRights += regularizedByDate[key].rights;
                    lastValidMonth = month;
                }
                
                const percentage = totalRights > 0 ? (cumulativeRights / totalRights) * 100 : 0;
                const roundedPercentage = Math.round(percentage * 10) / 10;
                
                // Only include data up to current month for current year
                if (year === currentYear && month > new Date().getMonth()) {
                    yearData.push(null);
                } else {
                    yearData.push(roundedPercentage);
                    if (roundedPercentage > 0) {
                        lastValidValue = roundedPercentage;
                    }
                }
            }
            
            console.log(`📊 Year ${year} cumulative data:`, yearData);
            console.log(`📍 Last valid point for ${year}: month ${lastValidMonth}, value ${lastValidValue}%`);
            console.log(`📅 Actual last date for ${year}:`, actualLastDate);
            
            // Determine if this is the most recent year based on actual dates
            const isCurrentYear = year === currentYear;
            const lineColor = isCurrentYear ? '#ef4444' : '#9ca3af';
            
            const dataset = {
                label: year.toString(),
                data: yearData,
                borderColor: lineColor,
                backgroundColor: 'transparent',
                borderDash: isCurrentYear ? [] : [5, 5],
                tension: 0.4,
                fill: false,
                pointBackgroundColor: lineColor,
                pointBorderColor: lineColor,
                pointBorderWidth: isCurrentYear ? 2 : 1,
                pointRadius: isCurrentYear ? 4 : 3,
                pointHoverRadius: isCurrentYear ? 6 : 5
            };
            
            datasets.push(dataset);
            
            // Store metadata for label positioning
            datasetMetadata.push({
                year: year,
                lastValidMonth: lastValidMonth,
                lastValidValue: lastValidValue,
                lineColor: lineColor,
                actualLastDate: actualLastDate
            });
        });

        const currentYearPercentage = totalRights > 0 ? Math.round((totalRegularizedRights / totalRights) * 1000) / 10 : 0;
        console.log('🎯 Current regularization percentage:', currentYearPercentage + '%');

        return {
            labels: monthLabels,
            datasets: datasets,
            datasetMetadata: datasetMetadata,
            totalRights: totalRights,
            regularizedRights: totalRegularizedRights,
            currentPercentage: currentYearPercentage
        };
    };

    const regularizationData = calculateRegularizationData();
    
    // Update the indicator percentage with calculated current percentage
    const percentageEl = document.getElementById('regularizationPercentage');
    if (percentageEl) {
        if (regularizationData.currentPercentage !== undefined) {
            percentageEl.textContent = `${regularizationData.currentPercentage}%`;
            console.log('🔄 Updated indicator to:', regularizationData.currentPercentage + '%');
        } else {
            percentageEl.textContent = '0%';
            console.log('⚠️ No regularization data available, showing 0%');
        }
    }

    const regularizationCanvas = document.getElementById('regularizationChart');
    if (regularizationCanvas && regularizationData.datasets.length > 0) {
        regularizationChart = new Chart(regularizationCanvas, {
            type: 'line',
            data: regularizationData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: true,
                            color: '#e5e7eb'
                        },
                        ticks: {
                            display: false // No axis labels
                        },
                        border: {
                            display: true,
                            color: '#374151'
                        }
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 100,
                        grid: {
                            display: true,
                            color: '#e5e7eb'
                        },
                        ticks: {
                            display: false // No axis labels
                        },
                        border: {
                            display: true,
                            color: '#374151'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#374151',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                // Custom plugin registration for year labels
                plugins: [{
                    id: 'yearLabels',
                    afterDraw: function(chart) {
                        const ctx = chart.ctx;
                        const metadata = regularizationData.datasetMetadata;
                        
                        if (!metadata) return;
                        
                        metadata.forEach((meta, datasetIndex) => {
                            const datasetMeta = chart.getDatasetMeta(datasetIndex);
                            
                            if (meta.lastValidMonth >= 0 && meta.lastValidValue > 0 && datasetMeta.data[meta.lastValidMonth]) {
                                const point = datasetMeta.data[meta.lastValidMonth];
                                
                                // Set font and color to match the line
                                ctx.save();
                                ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
                                ctx.fillStyle = meta.lineColor;
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                
                                // Draw the year label to the right of the last point
                                ctx.fillText(meta.year.toString(), point.x + 12, point.y);
                                ctx.restore();
                                
                                console.log(`🏷️ Drew label "${meta.year}" at position (${point.x + 12}, ${point.y}) with color ${meta.lineColor}`);
                            }
                        });
                    }
                }],
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    } else if (regularizationCanvas) {
        // Create empty chart with proper 0-100 scale if no data
        regularizationChart = new Chart(regularizationCanvas, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Sin datos',
                    data: Array(12).fill(0),
                    borderColor: '#9ca3af',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        grid: { display: true, color: '#e5e7eb' },
                        ticks: { display: false },
                        border: { display: true, color: '#374151' }
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 100,
                        grid: { display: true, color: '#e5e7eb' },
                        ticks: { display: false },
                        border: { display: true, color: '#374151' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    // Gráfico Derechos de agua por OUA (Todas las OUAs)
    if (topOuasChart) topOuasChart.destroy();
    const ouasWithRights = tableData
        .map(r => ({ 
            o: (r['OUA'] || 'N/A').substring(0, 20), 
            d: parseFloat(r['Derechos (l/s)'] || 0) 
        }))
        .filter(i => i.d > 0)
        .sort((a, b) => b.d - a.d); // Removido .slice(0, 10) para mostrar todas las OUAs
        
    const topOuasCanvas = document.getElementById('topOuasChart');
    if (topOuasCanvas && ouasWithRights.length > 0) {
        // Ajustar altura del canvas dinámicamente basado en el número de OUAs
        const minHeight = 300;
        const maxHeight = 800;
        const barHeight = 25; // Altura aproximada por barra
        const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, ouasWithRights.length * barHeight + 100));
        
        topOuasCanvas.style.height = `${calculatedHeight}px`;
        topOuasCanvas.parentElement.style.height = `${calculatedHeight}px`;
        topOuasChart = new Chart(topOuasCanvas, { 
            type: 'bar', 
            data: { 
                labels: ouasWithRights.map(i => i.o), 
                datasets: [{ 
                    label: 'Derechos (l/s)', 
                    data: ouasWithRights.map(i => i.d), 
                    backgroundColor: '#E95420',
                    borderColor: '#E95420',
                    borderWidth: 1
                }] 
            }, 
            options: { 
                ...chartOptions, 
                indexAxis: 'y', 
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        ticks: { 
                            color: '#1f2937', // TEXTO OSCURO
                            font: {
                                size: Math.max(8, Math.min(11, 200 / ouasWithRights.length)), // Tamaño dinámico basado en cantidad de OUAs
                                weight: '500'
                            },
                            maxTicksLimit: Math.min(ouasWithRights.length, 50) // Limitar ticks si hay demasiadas OUAs
                        }, 
                        grid: { 
                            display: false 
                        } 
                    }, 
                    x: { 
                        ticks: { 
                            color: '#1f2937', // TEXTO OSCURO
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }, 
                        grid: { 
                            color: '#f3f4f6', // LÍNEAS CLARAS
                            borderColor: '#d1d5db'
                        } 
                    } 
                },
                plugins: {
                    ...chartOptions.plugins,
                    legend: {
                        display: false
                    }
                }
            } 
        });
    }
};

// === FUNCIONES DE DATOS MODIFICADAS PARA AUTENTICACIÓN ===

const toggleRowSelection = (rowId) => {
    // Selection functionality disabled
    return;
};

const toggleAllSelection = () => {
    // Selection functionality disabled
    return;
};

const clearSelection = () => {
    // Selection functionality disabled
    return;
};

// Function removed - delete selected rows functionality disabled

// Función updateAppState con debug
const updateAppState = () => {
    console.log('🔄 Ejecutando updateAppState()');
    
    const hasData = tableData.length > 0;
    console.log('📊 hasData:', hasData);
    console.log('👁️ currentView:', currentView);
    
    // Elementos DOM críticos
    const emptyStateElement = document.getElementById('empty-state');
    const dataContainerElement = document.getElementById('data-container');
    
    if (!emptyStateElement) {
        console.error('❌ No se encontró elemento empty-state');
        return;
    }
    
    if (!dataContainerElement) {
        console.error('❌ No se encontró elemento data-container');
        return;
    }
    
    if (currentView === 'data') {
        console.log('📋 Actualizando vista de datos');
        
        if (hasData) {
            console.log('✅ Mostrando contenedor de datos, ocultando estado vacío');
            emptyStateElement.classList.add('hidden');
            dataContainerElement.classList.remove('hidden');
        } else {
            console.log('⚠️ Mostrando estado vacío, ocultando contenedor de datos');
            emptyStateElement.classList.remove('hidden');
            dataContainerElement.classList.add('hidden');
        }
    }
    
    // Actualizar información de archivo
    if (currentFilenameElement) {
        currentFilenameElement.textContent = currentFilename || 'Sin datos';
        console.log('📄 Filename actualizado:', currentFilename);
    }
    
    if (unsavedIndicator) {
        unsavedIndicator.classList.toggle('hidden', !hasUnsavedChanges);
        console.log('💾 Cambios sin guardar:', hasUnsavedChanges);
    }
    
    // Actualizar botones (solo para editores)
    const canSave = hasData && hasUnsavedChanges && userRole === 'editor';
    if (saveBtn) {
        saveBtn.disabled = !canSave;
        console.log('💾 Botón guardar habilitado:', !saveBtn.disabled);
    }
    
    if (saveAsBtn) {
        saveAsBtn.disabled = !hasData;
        console.log('📁 Botón guardar como habilitado:', !saveAsBtn.disabled);
    }
    
    // Actualizar información de datos
    if (dataInfo) {
        dataInfo.textContent = hasData ? `${tableData.length} fila${tableData.length !== 1 ? 's' : ''}` : '';
        console.log('📊 Info datos actualizada:', dataInfo.textContent);
    }
    
    // Actualizar selección
    updateSelectionUI();
    
    console.log('✅ updateAppState() completado');
};

const markUnsavedChanges = () => {
    // Solo marcar cambios para editores
    if (userRole === 'editor') {
        hasUnsavedChanges = true;
        updateAppState();
        if (currentView === 'dashboard') {
            updateDashboard();
        }
    }
};

const markSaved = () => {
    hasUnsavedChanges = false;
    originalData = JSON.parse(JSON.stringify(tableData));
    updateAppState();
};

// ===== FUNCIÓN createFieldInput ACTUALIZADA CON TODOS LOS NUEVOS CAMPOS =====
const createFieldInput = (header, value, rowId) => {
    // Usar la nueva función específica para Período
    if (header === 'Período') {
        return createPeriodInput(value, rowId);
    }
    
    // Para otros campos, usar la lógica ampliada
    const container = document.createElement('div');
    let input;
    const classMap = { 
        'OUA': 'oua', 
        'Status Pago': 'status', 
        'Monto': 'monto', 
        'Período': 'periodo', 
        'Fecha Pago': 'fecha', 
        'Comentario': 'comentario',
        'Adjuntar Certificado': 'certificado',
        'Valor Acciones ($/Año)': 'valor',
        'Valor Limpieza ($/Año)': 'valor',
        'Valor Celador ($/Año)': 'valor',
        'Otros ($/Año)': 'valor',
        'Valor Total ($/Año)': 'valor',
        'Forma de Pago': 'forma-pago',
        'Adjuntar Memo Pago': 'memo'
    };
    const className = `table-body-cell-editable table-body-cell-editable-${classMap[header] || ''}`;

    // ===== NUEVOS CAMPOS =====
    if (header === 'Forma de Pago') {
        input = document.createElement('select');
        input.className = 'table-body-cell-select-dropdown table-body-cell-editable-forma-pago';
        input.innerHTML = `<option value="">Seleccionar...</option>` + 
            formasPagoOptions.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('');
    } else if (header.includes('Valor') && header.includes('$/Año')) {
        input = document.createElement('input');
        input.className = className + ' table-body-cell-editable-valor';
        input.value = formatCurrency(value);
        input.type = 'text';
        input.placeholder = '$0';
        
        // Marcar el campo de total como especial
        if (header.includes('Total')) {
            input.style.backgroundColor = '#f0fdf4';
            input.style.fontWeight = '600';
            input.readOnly = true; // El total se calcula automáticamente
        }
    } else if (header === 'Adjuntar Certificado') {
        // Crear botón para abrir modal de certificados
        const container = document.createElement('div');
        container.className = 'certificate-button-container';
        
        const button = document.createElement('button');
        button.className = 'certificate-link-btn';
        button.innerHTML = `
            <span class="material-icons">attach_file</span>
            <span>Gestionar PDF</span>
        `;
        button.title = 'Cargar o gestionar certificado PDF';
        button.dataset.rowId = rowId;
        button.dataset.header = header;
        
        // Deshabilitar para viewers
        if (userRole === 'viewer') {
            button.disabled = true;
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.7';
        }
        
        container.appendChild(button);
        return container;
    } else if (header === 'Adjuntar Memo Pago') {
        // Crear botón para abrir modal de memos de pago
        const container = document.createElement('div');
        container.className = 'memo-button-container';
        
        const button = document.createElement('button');
        button.className = 'memo-link-btn';
        button.innerHTML = `
            <span class="material-icons">receipt</span>
            <span>Gestionar Memo</span>
        `;
        button.title = 'Cargar o gestionar memo de pago PDF';
        button.dataset.rowId = rowId;
        button.dataset.header = header;
        
        // Deshabilitar para viewers
        if (userRole === 'viewer') {
            button.disabled = true;
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.7';
        }
        
        container.appendChild(button);
        return container;
    } else if (header === 'Status Pago') {
        input = document.createElement('select');
        input.className = 'table-body-cell-select-dropdown';
        input.innerHTML = `<option value="">Seleccionar...</option>` + statusOptions.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('');
    } else {
        input = document.createElement('input');
        input.className = className;
        input.value = (header === 'Monto') ? formatCurrency(value) : (value || '');
        input.type = { 'Derechos (l/s)': 'number', 'Acciones': 'number', 'Fecha Pago': 'date' }[header] || 'text';
        input.placeholder = { 'OUA': 'Nombre OUA', 'Monto': '$0', 'Período': '2025 o 2020-2025' }[header] || '';
    }
    
    input.dataset.key = header;
    
    // Deshabilitar inputs para viewers
    if (userRole === 'viewer') {
        input.disabled = true;
        input.style.pointerEvents = 'none';
        input.style.backgroundColor = '#f9fafb';
        input.style.opacity = '0.7';
    }
    
    container.appendChild(input);
    return container;
};

// Función renderTable con implementación de PDF
const renderTable = () => {
    console.log('🔄 Ejecutando renderTable()');
    console.log('📊 tableData.length:', tableData.length);
    console.log('📋 tableData:', tableData);
    
    // Verificar elementos DOM
    const tableBodyElement = document.getElementById('data-table-body');
    const filterInputElement = document.getElementById('table-filter-input');
    
    if (!tableBodyElement) {
        console.error('❌ No se encontró elemento data-table-body');
        return;
    }
    
    if (!filterInputElement) {
        console.error('❌ No se encontró elemento table-filter-input');
        return;
    }
    
    console.log('✅ Elementos DOM encontrados');
    
    const searchTerm = filterInputElement.value.toLowerCase();
    console.log('🔍 Término de búsqueda:', searchTerm);
    
    // Filtrar datos
    const dataToRender = tableData.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
    });
    
    console.log('📋 Datos filtrados:', dataToRender.length, 'de', tableData.length);
    
    // Limpiar tabla
    tableBodyElement.innerHTML = '';
    
    if (dataToRender.length === 0) {
        console.log('⚠️ No hay datos para renderizar');
        if (tableData.length === 0) {
            console.log('💡 No hay datos en tableData');
        } else {
            console.log('💡 Los datos fueron filtrados completamente');
        }
    }
    
    const fragment = document.createDocumentFragment();

    dataToRender.forEach((row, index) => {
        console.log(`📝 Renderizando fila ${index + 1}:`, row);
        
        const tr = document.createElement('tr');
        tr.className = 'hover-row border-b border-gray-700';
        if(selectedRows.has(row.id)) {
            tr.classList.add('row-selected');
        }
        tr.dataset.rowId = row.id;

        // Selection functionality removed

        // Celdas de datos
        headers.forEach(header => {
            const td = document.createElement('td');
            const classMap = { 
                'OUA': 'oua', 
                'Status Pago': 'status', 
                'Monto': 'monto', 
                'Período': 'periodo', 
                'Fecha Pago': 'fecha', 
                'Comentario': 'comentario',
                'Adjuntar Certificado': 'compact',
                'Valor Acciones ($/Año)': 'compact',
                'Valor Limpieza ($/Año)': 'compact',
                'Valor Celador ($/Año)': 'compact',
                'Otros ($/Año)': 'compact',
                'Valor Total ($/Año)': 'compact',
                'Forma de Pago': 'compact',
                'Adjuntar Memo Pago': 'compact'
            };
            td.className = `table-body-cell table-body-cell-${classMap[header] || ''}`;
            td.appendChild(createFieldInput(header, row[header], row.id));
            tr.appendChild(td);
        });

        // === CELDA DE ACCIONES CON PDF ===
        const actionTd = document.createElement('td');
        actionTd.className = 'table-body-cell text-center';
        
        // Crear contenedor flex para los botones
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex items-center justify-center gap-2';
        
        // Botón PDF (siempre visible)
        const pdfButton = document.createElement('button');
        pdfButton.className = 'icon-button-pdf';
        pdfButton.title = 'Descargar PDF';
        pdfButton.innerHTML = '<span class="material-icons text-base">picture_as_pdf</span>';
        pdfButton.dataset.action = 'pdf';
        pdfButton.dataset.rowId = row.id;
        
        actionsContainer.appendChild(pdfButton);
        
        // Delete button functionality removed
        
        // Agregar contenedor a la celda
        actionTd.appendChild(actionsContainer);
        tr.appendChild(actionTd);
        
        fragment.appendChild(tr);
    });

    tableBodyElement.appendChild(fragment);
    console.log('✅ Tabla renderizada con', dataToRender.length, 'filas');
    
    // Actualizar estado de la aplicación
    updateAppState();
};

// Function removed - delete row functionality disabled

// Function removed - add row functionality disabled

// Function removed - clear all data functionality disabled

// === FUNCIONES DE ARCHIVO MODIFICADAS ===

// Función para cargar datos desde Supabase (reemplaza CSV import)
const loadDataFromSupabase = async () => {
    await fetchAllData();
};

// Función para exportar a CSV (mantener funcionalidad de exportación)
const exportToCsv = () => {
    if (tableData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const filename = prompt('Nombre del archivo CSV:', 'datos_exportados.csv');
    if (!filename) return;
    
    const csvFilename = filename.endsWith('.csv') ? filename : filename + '.csv';
    
    // Preparar datos para exportación
    const exportData = tableData.map(row => {
        const exportRow = {};
        headers.forEach(header => {
            exportRow[header] = row[header] || '';
        });
        return exportRow;
    });
    
    const csvContent = Papa.unparse(exportData, { header: true });
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = csvFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Función para guardar (sincronizar con Supabase)
const handleSave = async () => {
    // Solo editores pueden guardar
    if (userRole !== 'editor') return;
    
    await syncAllChangesToSupabase();
};

// Función "Guardar Como" ahora exporta CSV
const handleSaveAs = () => {
    exportToCsv();
};

// === DEBUG FUNCTIONS ===

// Función para debug adicional
const debugTableData = () => {
    console.log('🔍 DEBUG - Estado actual:');
    console.log('- tableData.length:', tableData.length);
    console.log('- tableData:', tableData);
    console.log('- currentView:', currentView);
    console.log('- emptyState.hidden:', emptyState ? emptyState.classList.contains('hidden') : 'elemento no encontrado');
    console.log('- dataContainer.hidden:', dataContainer ? dataContainer.classList.contains('hidden') : 'elemento no encontrado');
    console.log('- currentUser:', currentUser?.email);
    console.log('- userRole:', userRole);
    console.log('- isAuthenticated:', isAuthenticated);
};

// Función para forzar carga de datos (debug)
window.debugForceLoad = async () => {
    console.log('🔄 Forzando carga de datos...');
    await fetchAllData();
};

// Función para validar todos los períodos existentes (útil para migración de datos)
const validateAllPeriods = () => {
    let invalidCount = 0;
    
    tableData.forEach((row, index) => {
        const period = row['Período'];
        if (period && !validatePeriodFormat(period)) {
            console.warn(`Fila ${index + 1}: Período inválido "${period}"`);
            invalidCount++;
        }
    });
    
    if (invalidCount > 0) {
        console.warn(`Se encontraron ${invalidCount} períodos con formato inválido`);
    } else {
        console.log('Todos los períodos tienen formato válido');
    }
    
    return invalidCount;
};

// Función helper para generar períodos comunes
const generateCommonPeriods = () => {
    const currentYear = new Date().getFullYear();
    const periods = [];
    
    // Años individuales (3 años hacia atrás, año actual, 2 años hacia adelante)
    for (let i = -3; i <= 2; i++) {
        periods.push((currentYear + i).toString());
    }
    
    // Rangos de años (ejemplos variados)
    periods.push(`2020-2025`);
    periods.push(`${currentYear-2}-${currentYear}`);
    periods.push(`${currentYear}-${currentYear+3}`);
    periods.push(`${currentYear+1}-${currentYear+5}`);
    
    return periods.sort();
};

// === DEBUG FUNCTIONS DE JSPDF ===
const debugJsPDF = () => {
    console.log('🔍 DEBUG jsPDF:');
    console.log('- window.jsPDF:', typeof window.jsPDF);
    console.log('- window.jspdf:', typeof window.jspdf);
    console.log('- window.jspdf?.jsPDF:', typeof window.jspdf?.jsPDF);
    console.log('- Propiedades de window con "pdf":', Object.keys(window).filter(key => key.toLowerCase().includes('pdf')));
    
    // Intentar crear una instancia de prueba
    try {
        let jsPDF;
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
            console.log('✅ jsPDF disponible en window.jspdf.jsPDF');
        } else if (typeof window.jsPDF !== 'undefined') {
            jsPDF = window.jsPDF;
            console.log('✅ jsPDF disponible en window.jsPDF');
        } else {
            console.log('❌ jsPDF no encontrado');
            return false;
        }
        
        const testDoc = new jsPDF();
        console.log('✅ Instancia de prueba creada exitosamente');
        return true;
    } catch (error) {
        console.log('❌ Error al crear instancia de prueba:', error);
        return false;
    }
};

// Hacer debug accesible globalmente
window.debugJsPDF = debugJsPDF;

// === EVENT LISTENERS CON AUTENTICACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página cargada, iniciando aplicación...');
    
    // *** CONFIGURACIÓN GLOBAL CHART.JS PARA TEMA BLANCO ***
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#1f2937'; // Texto oscuro por defecto
        Chart.defaults.borderColor = '#e5e7eb'; // Bordes claros
        Chart.defaults.backgroundColor = 'rgba(61, 167, 160, 0.1)'; // Fondo sutil
    }

    // Verificar elementos críticos
    const criticalElements = [
        'login-screen', 'main-app', 'google-login-btn', 'logout-btn',
        'empty-state', 'data-container', 'data-table-body', 
        'current-filename', 'save-btn', 'save-as-btn'
    ];
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`❌ Elemento crítico no encontrado: ${id}`);
        } else {
            console.log(`✅ Elemento encontrado: ${id}`);
        }
    });

    // === EVENT LISTENERS DE AUTENTICACIÓN ===
    console.log('🔍 Verificando botón de Google login:', googleLoginBtn);
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
        console.log('✅ Event listener de login configurado');
    } else {
        console.error('❌ Botón de Google login no encontrado!');
    }
    
    // Botón de diagnóstico
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', runDiagnostics);
    }
    
    // Botón de test download
    const testDownloadBtn = document.getElementById('test-download-btn');
    if (testDownloadBtn) {
        testDownloadBtn.addEventListener('click', async () => {
            console.log('🧪 Iniciando test de descarga...');
            
            // Listar archivos del bucket
            try {
                const { data: files, error } = await supabase.storage
                    .from('certificates')
                    .list('', { limit: 10 });
                
                if (error) {
                    console.error('❌ Error listando archivos:', error);
                    alert('Error listando archivos: ' + error.message);
                    return;
                }
                
                console.log('📁 Archivos encontrados:', files);
                
                if (files.length === 0) {
                    alert('No hay archivos en el bucket para probar');
                    return;
                }
                
                // Probar descarga del primer archivo
                const firstFile = files[0];
                console.log('📄 Probando descarga de:', firstFile.name);
                await downloadCertificate(firstFile.name);
                
            } catch (err) {
                console.error('❌ Error en test:', err);
                alert('Error en test: ' + err.message);
            }
        });
    }
    
    // Botón de debug de archivos
    const debugFilesBtn = document.getElementById('debug-files-btn');
    if (debugFilesBtn) {
        debugFilesBtn.addEventListener('click', async () => {
            console.log('📁 Iniciando debug de archivos...');
            
            try {
                // Listar archivos en bucket certificates
                console.log('📋 Archivos en bucket CERTIFICATES:');
                const { data: certFiles, error: certError } = await supabase.storage
                    .from('certificates')
                    .list('', { limit: 100 });
                
                if (certError) {
                    console.error('❌ Error listando certificates:', certError);
                } else {
                    console.table(certFiles.map(f => ({ name: f.name, size: f.metadata?.size })));
                }
                
                // Listar archivos en bucket memos
                console.log('📋 Archivos en bucket MEMOS:');
                const { data: memoFiles, error: memoError } = await supabase.storage
                    .from('memos')
                    .list('', { limit: 100 });
                
                if (memoError) {
                    console.error('❌ Error listando memos:', memoError);
                } else {
                    console.table(memoFiles.map(f => ({ name: f.name, size: f.metadata?.size })));
                }
                
                // Mostrar análisis
                const analysis = {
                    totalCertificates: certFiles?.length || 0,
                    totalMemos: memoFiles?.length || 0,
                    uniqueRowIds: new Set([
                        ...(certFiles || []).map(f => f.name.split('_')[1]),
                        ...(memoFiles || []).map(f => f.name.split('_')[1])
                    ]).size
                };
                
                console.log('📊 Análisis de archivos:', analysis);
                console.log('💾 Estado del cache:', {
                    filesCache,
                    lastCacheUpdate: Object.keys(lastCacheUpdate).map(key => ({
                        bucket: key,
                        lastUpdate: new Date(lastCacheUpdate[key]).toLocaleTimeString(),
                        ageSeconds: Math.floor((Date.now() - lastCacheUpdate[key]) / 1000)
                    }))
                });
                
                alert(`ANÁLISIS DE ARCHIVOS:\n\nCertificados: ${analysis.totalCertificates}\nMemos: ${analysis.totalMemos}\nFilas únicas: ${analysis.uniqueRowIds}\n\nCache activo: ${Object.keys(filesCache).length} buckets\n\nRevisa la consola para detalles completos.`);
                
            } catch (err) {
                console.error('❌ Error en debug:', err);
                alert('Error en debug: ' + err.message);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Event listener de logout configurado');
    }

    // === EVENT LISTENERS DE VISTAS ===
    if (dataViewBtn) dataViewBtn.addEventListener('click', () => switchView('data'));
    if (dashboardViewBtn) dashboardViewBtn.addEventListener('click', () => switchView('dashboard'));

    // === EVENT LISTENERS DE BOTONES DE DATOS ===
    const addRowBtn = document.getElementById('add-row-btn');
    const emptyAddBtn = document.getElementById('empty-add-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    if (addRowBtn) addRowBtn.addEventListener('click', addNewRow);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', addNewRow);
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllData);

    // === EVENT LISTENERS DE ARCHIVO ===
    const openFileBtn = document.getElementById('open-file-btn');
    const emptyOpenBtn = document.getElementById('empty-open-btn');
    
    if (openFileBtn) {
        openFileBtn.addEventListener('click', loadDataFromSupabase);
    }

    if (emptyOpenBtn) {
        emptyOpenBtn.addEventListener('click', loadDataFromSupabase);
    }
    
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (saveAsBtn) saveAsBtn.addEventListener('click', handleSaveAs);
    
    // === EVENT LISTENER DE FILTRO ===
    const filterInput = document.getElementById('table-filter-input');
    if (filterInput) {
        filterInput.addEventListener('input', renderTable);
    }

    // === INTERACCIONES DE LA TABLA CON SOPORTE PARA PDF Y CÁLCULO AUTOMÁTICO ===
    if (tableBody) {
        tableBody.addEventListener('change', async (e) => {
            const target = e.target;
            
            // Manejar checkboxes de selección
            if (target.matches('input[type="checkbox"]') && userRole === 'editor') {
                const rowId = parseInt(target.closest('tr').dataset.rowId);
                toggleRowSelection(rowId);
                return;
            }
            
            // Manejar inputs y selects (solo para editores)
            if (target.matches('input, select') && userRole === 'editor') {
                const rowId = parseInt(target.closest('tr').dataset.rowId);
                const key = target.dataset.key;
                const rowIndex = tableData.findIndex(row => row.id === rowId);
                
                if (rowIndex !== -1) {
                    let value = target.value;
                    
                    // Formatear valores monetarios
                    if (key && ((key.includes('Valor') && key.includes('$/Año')) || key === 'Monto' || key === 'Otros ($/Año)')) {
                    value = parseCurrency(value);
                    target.value = formatCurrency(value); // Re-formatea en el campo
}
                    
                    tableData[rowIndex][key] = value;
                    markUnsavedChanges();
                    
                    // ===== CÁLCULO AUTOMÁTICO DEL VALOR TOTAL =====
                    if (['Valor Acciones ($/Año)', 'Valor Limpieza ($/Año)', 'Valor Celador ($/Año)', 'Otros ($/Año)'].includes(key)) {
                        const newTotal = calculateTotalValue(tableData[rowIndex]);
                        tableData[rowIndex]['Valor Total ($/Año)'] = newTotal;
                        
                        // Actualizar el campo visual
                        const totalInput = target.closest('tr').querySelector('[data-key="Valor Total ($/Año)"]');
                        if (totalInput) {
                            totalInput.value = formatCurrency(newTotal);
                        }
                    }
                    
                    // Auto-sincronización con Supabase si la fila ya existe en la BD
                    if (rowId > 0) { // Solo para filas existentes (ID positivo)
                        // Debounce para evitar muchas llamadas
                        clearTimeout(target.saveTimeout);
                        target.saveTimeout = setTimeout(async () => {
                            await updateRowInSupabase(rowId, tableData[rowIndex]);
                            markSaved();
                        }, 2000); // Esperar 2 segundos de inactividad
                    }
                }
            }
        });
        
        // === EVENT LISTENER PARA BOTONES DE ACCIÓN (PDF Y ELIMINAR) ===
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const rowId = parseInt(button.dataset.rowId);
            const action = button.dataset.action;
            
            console.log('🖱️ Clic en botón:', action, 'rowId:', rowId);
            
            if (action === 'pdf') {
                // PDF disponible para todos los roles
                const rowData = tableData.find(row => row.id === rowId);
                if (rowData) {
                    console.log('📄 Generando PDF para:', rowData);
                    generateRowPDF(rowData);
                } else {
                    console.error('❌ No se encontró la fila con ID:', rowId);
                    alert('Error: No se pudo encontrar los datos de la fila');
                }
            }
            // Delete action removed
        });
    }

    // Selection and delete functionality removed

    // === ADVERTENCIA AL SALIR (solo para editores con cambios) ===
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges && userRole === 'editor') {
            e.preventDefault();
            e.returnValue = 'Tienes cambios sin sincronizar con la base de datos. ¿Seguro que quieres salir?';
        }
    });

    // === INICIALIZAR AUTENTICACIÓN ===
    console.log('🔐 Inicializando sistema de autenticación...');
    initializeAuth().then(() => {
        console.log('✅ Sistema de autenticación inicializado');
    }).catch((error) => {
        console.error('❌ Error inicializando autenticación:', error);
        showAuthError('Error de inicialización. Recarga la página.');
    });

    // === DEBUG AUTOMÁTICO AL CARGAR LA PÁGINA ===
    setTimeout(() => {
        console.log('📊 Estado después de carga inicial:');
        debugTableData();
        
        // Debug de jsPDF
        console.log('🔍 Verificando jsPDF después de la carga...');
        const jsPDFAvailable = debugJsPDF();
        if (jsPDFAvailable) {
            console.log('🎉 jsPDF cargado correctamente - Funcionalidad PDF lista');
        } else {
            console.warn('⚠️ jsPDF no se cargó correctamente - Revisa la conexión a internet');
        }
    }, 3000);

    console.log('✅ Aplicación inicializada correctamente');
    console.log('✅ Validación de períodos cargada');
    console.log('✅ Funcionalidad PDF integrada');
    console.log('🔐 Sistema de autenticación integrado');
    console.log('📅 Períodos comunes disponibles:', generateCommonPeriods());
    console.log('💰 Campos monetarios con cálculo automático configurados');
    console.log('📋 Total de campos configurados:', headers.length);
    
});

// ===== FUNCIONALIDAD DEL MODAL DE CERTIFICADOS =====

// Variables globales para el modal
let currentCertificateRowId = null;
let currentCertificateData = null;
let uploadedFile = null;
let modalOpening = false;
let currentFileType = 'certificate'; // 'certificate' o 'memo'
let currentLoadingPromise = null; // Para evitar múltiples cargas concurrentes
let filesCache = {}; // Cache de archivos por bucket
let lastCacheUpdate = {}; // Timestamp de última actualización del cache

// Referencias a elementos del modal
const modal = document.getElementById('certificate-modal');
const elements = {
    modal: modal,
    modalClose: document.getElementById('certificate-modal-close'),
    cancelBtn: document.getElementById('certificate-cancel-btn'),
    saveBtn: document.getElementById('certificate-save-btn'),
    uploadZone: document.getElementById('certificate-upload-zone'),
    fileInput: document.getElementById('certificate-file-input'),
    progressContainer: document.getElementById('certificate-upload-progress'),
    progressFill: document.getElementById('certificate-progress-fill'),
    progressText: document.getElementById('certificate-progress-text'),
    filesSection: document.getElementById('certificate-files-section'),
    filesList: document.getElementById('certificate-files-list')
};

// === FUNCIONES PRINCIPALES DEL MODAL ===

async function openFileModal(rowId, fileType = 'certificate') {
    // Prevenir múltiples aperturas simultáneas
    if (modalOpening) {
        return;
    }
    
    modalOpening = true;
    currentFileType = fileType;
    
    console.log(`🚀 Abriendo modal para fila ${rowId}, tipo: ${fileType}`);
    
    try {
        // Encontrar los datos de la fila
        const rowData = tableData.find(row => row.id == rowId);
        if (!rowData) {
            console.error(`❌ No se encontraron datos para la fila ${rowId}`);
            console.log('📊 IDs disponibles en tableData:', tableData.map(row => row.id));
            throw new Error('No se encontraron datos para esta fila');
        }
        
        console.log(`✅ Datos de fila encontrados:`, {
            id: rowData.id,
            OUA: rowData.OUA,
            Período: rowData['Período']
        });
        
        // Limpiar estado anterior
        currentCertificateRowId = rowId;
        currentCertificateData = rowData;
        uploadedFile = null;
        
        // Actualizar información en el modal según el tipo
        const titleElement = document.querySelector('.certificate-modal-title');
        const iconElement = document.querySelector('.certificate-modal-icon');
        const ouaElement = document.getElementById('certificate-modal-oua');
        const periodElement = document.getElementById('certificate-modal-period');
        
        if (fileType === 'memo') {
            if (titleElement) titleElement.textContent = 'Gestión de Memo de Pago';
            if (iconElement) iconElement.textContent = 'receipt';
        } else {
            if (titleElement) titleElement.textContent = 'Gestión de Certificado';
            if (iconElement) iconElement.textContent = 'picture_as_pdf';
        }
        
        if (ouaElement) ouaElement.textContent = rowData.OUA || '-';
        if (periodElement) periodElement.textContent = rowData['Período'] || '-';
        
        // Limpiar lista de archivos antes de mostrar el modal
        if (elements.filesList) {
            elements.filesList.innerHTML = '';
        }
        if (elements.filesSection) {
            elements.filesSection.classList.add('hidden');
        }
        
        // Mostrar modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Cargar archivos existentes según el tipo
        await loadExistingFiles(rowId, fileType);
        
    } catch (error) {
        console.error('Error abriendo modal:', error);
        const fileTypeText = fileType === 'memo' ? 'memos de pago' : 'certificados';
        alert('Error abriendo el gestor de ' + fileTypeText + ': ' + error.message);
    } finally {
        setTimeout(() => {
            modalOpening = false;
        }, 500);
    }
}

// Función de compatibilidad hacia atrás
async function openCertificateModal(rowId) {
    await openFileModal(rowId, 'certificate');
}

function closeCertificateModal() {
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Limpiar variables globales
    currentCertificateRowId = null;
    currentCertificateData = null;
    uploadedFile = null;
    modalOpening = false;
    currentFileType = 'certificate';
    
    // Cancelar cualquier carga en progreso
    if (currentLoadingPromise) {
        currentLoadingPromise = null;
    }
    
    // Limpiar cache completamente al cerrar modal
    filesCache = {};
    lastCacheUpdate = {};
    console.log('🧹 Cache limpiado al cerrar modal');
    
    // Resetear estado
    resetUploadState();
    
    // Limpiar el input de archivo
    if (elements.fileInput) {
        elements.fileInput.value = '';
    }
    
    // Limpiar lista de archivos completamente
    if (elements.filesList) {
        elements.filesList.innerHTML = '';
    }
    if (elements.filesSection) {
        elements.filesSection.classList.add('hidden');
    }
    
    // Resetear título del modal
    const titleElement = document.querySelector('.certificate-modal-title');
    const iconElement = document.querySelector('.certificate-modal-icon');
    if (titleElement) titleElement.textContent = 'Gestión de Certificado';
    if (iconElement) iconElement.textContent = 'picture_as_pdf';
}

// === FUNCIONES DE CARGA DE ARCHIVOS ===

async function handleFileUpload(file) {
    try {
        // Validar que sea PDF
        if (file.type !== 'application/pdf') {
            alert('Solo se permiten archivos PDF');
            return;
        }
        
        // Validar tamaño (máx 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }
        
        // Mostrar progreso
        showUploadProgress();
        
        // Generar nombre único del archivo
        const fileName = generateFileName(
            currentCertificateRowId,
            currentCertificateData.OUA,
            currentCertificateData['Período'],
            currentFileType
        );
        
        // Determinar el bucket según el tipo de archivo
        const bucketName = currentFileType === 'memo' ? 'memos' : 'certificates';
        
        // Subir archivo a Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });
        
        if (error) {
            console.error('Error subiendo archivo:', error);
            showUploadError();
            alert('Error subiendo el archivo: ' + error.message);
            return;
        }
        
        // Actualizar estado
        uploadedFile = {
            path: data.path,
            name: fileName,
            size: file.size
        };
        
        // Mostrar éxito
        showUploadSuccess();
        
        // Invalidar cache del bucket
        delete filesCache[bucketName];
        delete lastCacheUpdate[bucketName];
        console.log(`🗑️ Cache invalidado para bucket ${bucketName}`);
        
        // Pequeño delay para permitir que Supabase se sincronice
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recargar archivos existentes
        await loadExistingFiles(currentCertificateRowId, currentFileType);
        
    } catch (error) {
        console.error('Error en upload:', error);
        showUploadError();
        alert('Error procesando el archivo');
    }
}

function generateFileName(rowId, oua, period, fileType = 'certificate') {
    const timestamp = new Date().getTime();
    const cleanOUA = (oua || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPeriod = (period || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    
    let fileName;
    if (fileType === 'memo') {
        fileName = `memo_${rowId}_${cleanOUA}_${cleanPeriod}_${timestamp}.pdf`;
    } else {
        fileName = `cert_${rowId}_${cleanOUA}_${cleanPeriod}_${timestamp}.pdf`;
    }
    
    console.log(`📝 Generando nombre de archivo para:`, {
        rowId,
        oua,
        period,
        fileType,
        fileName
    });
    
    return fileName;
}

// Función de compatibilidad hacia atrás
function generateCertificateFileName(rowId, oua, period) {
    return generateFileName(rowId, oua, period, 'certificate');
}

// === FUNCIONES DE ESTADO DE CARGA ===

function showUploadProgress() {
    if (elements.progressContainer) {
        elements.progressContainer.classList.remove('hidden');
    }
    if (elements.uploadZone) {
        elements.uploadZone.style.display = 'none';
    }
    updateProgress(0);
}

function updateProgress(percent) {
    if (elements.progressFill) {
        elements.progressFill.style.width = percent + '%';
    }
    if (elements.progressText) {
        elements.progressText.textContent = `Subiendo... ${percent}%`;
    }
}

function showUploadSuccess() {
    updateProgress(100);
    if (elements.progressText) {
        elements.progressText.textContent = 'Archivo subido exitosamente';
    }
    setTimeout(() => {
        resetUploadState();
    }, 2000);
}

function showUploadError() {
    if (elements.progressText) {
        elements.progressText.textContent = 'Error en la subida';
    }
    setTimeout(() => {
        resetUploadState();
    }, 3000);
}

function resetUploadState() {
    if (elements.progressContainer) {
        elements.progressContainer.classList.add('hidden');
    }
    if (elements.uploadZone) {
        elements.uploadZone.style.display = 'block';
    }
    if (elements.progressFill) {
        elements.progressFill.style.width = '0%';
    }
    if (elements.progressText) {
        elements.progressText.textContent = 'Subiendo... 0%';
    }
}

// === FUNCIONES DE GESTIÓN DE CERTIFICADOS EXISTENTES ===

async function loadExistingFiles(rowId, fileType = 'certificate') {
    // Cancelar cualquier carga anterior
    if (currentLoadingPromise) {
        console.log('⏸️ Cancelando carga anterior...');
        currentLoadingPromise = null;
    }
    
    try {
        // Determinar bucket y prefijo según el tipo
        const bucketName = fileType === 'memo' ? 'memos' : 'certificates';
        const prefix = fileType === 'memo' ? `memo_${rowId}_` : `cert_${rowId}_`;
        
        // Crear una promesa que podamos cancelar
        currentLoadingPromise = loadFilesFromBucket(bucketName, prefix, rowId, fileType);
        
        await currentLoadingPromise;
        
    } catch (error) {
        console.error(`Error cargando ${fileType}s:`, error);
        
        // Mostrar mensaje de error en el modal
        if (elements.filesList) {
            elements.filesList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ef4444;">
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 10px;">error</span>
                    <p>Error cargando archivos: ${error.message}</p>
                    <button onclick="loadExistingFiles(${rowId}, '${fileType}')" style="margin-top: 10px; padding: 5px 15px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    } finally {
        currentLoadingPromise = null;
    }
}

async function loadFilesFromBucket(bucketName, prefix, rowId, fileType) {
    const loadingKey = `${bucketName}_${prefix}`;
    console.log(`📁 Cargando ${fileType}s existentes para fila ${rowId}`);
    console.log(`🔍 Buscando archivos con prefijo: "${prefix}"`);
    
    // Verificar cache (válido por 30 segundos)
    const now = Date.now();
    const cacheKey = bucketName;
    const cacheValidTime = 30000; // 30 segundos
    
    if (filesCache[cacheKey] && lastCacheUpdate[cacheKey] && 
        (now - lastCacheUpdate[cacheKey]) < cacheValidTime) {
        console.log(`📋 Usando cache para bucket ${bucketName}`);
        const files = filesCache[cacheKey];
        const rowFiles = files.filter(file => 
            file.name.startsWith(prefix) && 
            file.name.endsWith('.pdf')
        );
        
        console.log(`📄 Archivos filtrados desde cache para fila ${rowId}:`, rowFiles.map(f => f.name));
        console.log(`✅ Total encontrados: ${rowFiles.length} archivo(s) de tipo ${fileType}`);
        
        // Mostrar archivos existentes
        displayExistingFiles(rowFiles, fileType);
        return;
    }
    
    try {
        // Verificar si el bucket existe (solo para memos)
        if (fileType === 'memo') {
            try {
                const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
                if (!bucketsError) {
                    const bucketExists = buckets.some(bucket => bucket.name === 'memos');
                    if (!bucketExists) {
                        console.log('📁 Bucket "memos" no existe, creándolo...');
                        const { data: newBucket, error: createError } = await supabase.storage.createBucket('memos', {
                            public: true,
                            fileSizeLimit: 10485760, // 10MB
                            allowedMimeTypes: ['application/pdf']
                        });
                        if (createError) {
                            console.error('❌ Error creando bucket memos:', createError);
                        } else {
                            console.log('✅ Bucket "memos" creado exitosamente');
                        }
                    }
                }
            } catch (bucketError) {
                console.warn('⚠️ No se pudo verificar buckets:', bucketError);
            }
        }
        
        // Obtener lista de archivos del bucket con timeout más largo
        const { data: files, error } = await Promise.race([
            supabase.storage
                .from(bucketName)
                .list('', {
                    limit: 100,
                    offset: 0
                }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: No se pudo cargar la lista de archivos')), 15000)
            )
        ]);
        
        if (error) {
            console.error(`Error cargando ${fileType}s:`, error);
            throw error;
        }
        
        console.log(`📋 Todos los archivos en bucket ${bucketName}:`, files.map(f => f.name));
        
        // Actualizar cache
        filesCache[cacheKey] = files;
        lastCacheUpdate[cacheKey] = Date.now();
        console.log(`💾 Cache actualizado para bucket ${bucketName}`);
        
        // Filtrar archivos para esta fila
        const rowFiles = files.filter(file => 
            file.name.startsWith(prefix) && 
            file.name.endsWith('.pdf')
        );
        
        console.log(`📄 Archivos filtrados para fila ${rowId}:`, rowFiles.map(f => f.name));
        console.log(`✅ Total encontrados: ${rowFiles.length} archivo(s) de tipo ${fileType}`);
        
        // Mostrar archivos existentes
        displayExistingFiles(rowFiles, fileType);
        
    } catch (error) {
        console.error(`Error en loadFilesFromBucket:`, error);
        throw error;
    }
}

// Función para forzar actualización del cache
function invalidateCache(bucketName = null) {
    if (bucketName) {
        delete filesCache[bucketName];
        delete lastCacheUpdate[bucketName];
        console.log(`🗑️ Cache invalidado para bucket ${bucketName}`);
    } else {
        filesCache = {};
        lastCacheUpdate = {};
        console.log('🗑️ Cache completo invalidado');
    }
}

// Función de compatibilidad hacia atrás
async function loadExistingCertificates(rowId) {
    await loadExistingFiles(rowId, 'certificate');
}

function displayExistingFiles(files, fileType = 'certificate') {
    if (!elements.filesList) return;
    
    // Limpiar lista
    elements.filesList.innerHTML = '';
    
    if (files.length === 0) {
        elements.filesSection.classList.add('hidden');
        return;
    }
    
    // Mostrar sección
    elements.filesSection.classList.remove('hidden');
    
    // Actualizar título de la sección
    const titleElement = document.querySelector('.certificate-files-title');
    if (titleElement) {
        titleElement.textContent = fileType === 'memo' ? 'Memos de Pago Subidos' : 'Certificados Subidos';
    }
    
    // Crear elementos para cada archivo
    files.forEach(file => {
        const fileElement = createFileElement(file, fileType);
        elements.filesList.appendChild(fileElement);
    });
    
    // Log visual para confirmar
    console.log(`🎯 Modal actualizado: Mostrando ${files.length} archivo(s) de tipo ${fileType} para fila ${currentCertificateRowId}`);
}

// Función de compatibilidad hacia atrás
function displayExistingCertificates(files) {
    displayExistingFiles(files, 'certificate');
}

function createFileElement(file, fileType = 'certificate') {
    console.log('🏗️ Creando elemento para archivo:', file.name, 'tipo:', fileType);
    const div = document.createElement('div');
    div.className = 'certificate-file-item';
    
    // Iconos según el tipo
    const icon = fileType === 'memo' ? 'receipt' : 'picture_as_pdf';
    const bucketName = fileType === 'memo' ? 'memos' : 'certificates';
    
    div.innerHTML = `
        <div class="certificate-file-info">
            <span class="material-icons">${icon}</span>
            <span class="certificate-file-name">${file.name}</span>
            <span class="certificate-file-size">${formatFileSize(file.metadata?.size || 0)}</span>
        </div>
        <div class="certificate-file-actions">
            <button class="btn-certificate-download" data-filename="${file.name}" data-bucket="${bucketName}" title="Descargar/Ver PDF">
                <span class="material-icons">download</span>
            </button>
            <button class="btn-certificate-copy-url" data-filename="${file.name}" data-bucket="${bucketName}" title="Copiar URL">
                <span class="material-icons">content_copy</span>
            </button>
            <button class="btn-certificate-delete" data-filename="${file.name}" data-bucket="${bucketName}" title="Eliminar">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;
    console.log('✅ Elemento creado con botones:', div.querySelectorAll('.btn-certificate-download').length);
    return div;
}

// Función de compatibilidad hacia atrás
function createCertificateFileElement(file) {
    return createFileElement(file, 'certificate');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === FUNCIONES DE DESCARGA Y ELIMINACIÓN ===

async function downloadCertificate(fileName, bucketName = 'certificates') {
    try {
        console.log('🔽 Iniciando descarga de archivo:', fileName, 'desde bucket:', bucketName);
        
        // Crear URL firmada para descarga
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileName, 60);
        
        if (error) {
            console.error('❌ Error Supabase:', error);
            alert('Error generando enlace de descarga: ' + error.message);
            return;
        }
        
        if (!data?.signedUrl) {
            console.error('❌ No se recibió URL firmada');
            alert('Error: No se pudo generar enlace de descarga');
            return;
        }
        
        console.log('✅ URL firmada generada:', data.signedUrl);
        
        // Método 1: Intentar abrir en nueva pestaña
        let opened = null;
        try {
            opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.warn('⚠️ Error con window.open:', error);
        }
        
        // Verificar si se abrió correctamente
        setTimeout(() => {
            if (!opened || opened.closed || typeof opened.closed == 'undefined') {
                console.warn('⚠️ Pop-up bloqueado o falló, intentando métodos alternativos');
                
                // Método 2: Crear enlace temporal y hacer clic
                const link = document.createElement('a');
                link.href = data.signedUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.style.display = 'none';
                
                // Agregar al DOM temporalmente
                document.body.appendChild(link);
                
                try {
                    link.click();
                    console.log('✅ PDF abierto usando enlace temporal');
                } catch (clickError) {
                    console.warn('⚠️ Error con link.click:', clickError);
                    
                    // Método 3: Asignar directamente a window.location
                    const userConfirmed = confirm('No se pudo abrir el PDF en nueva pestaña. ¿Quieres abrir el PDF en esta pestaña?');
                    if (userConfirmed) {
                        window.location.href = data.signedUrl;
                    } else {
                        // Método 4: Mostrar URL para copiar
                        const textarea = document.createElement('textarea');
                        textarea.value = data.signedUrl;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        
                        alert('URL del PDF copiada al portapapeles. Pégala en una nueva pestaña para ver el archivo.');
                    }
                }
                
                // Limpiar enlace temporal
                document.body.removeChild(link);
                
            } else {
                console.log('✅ PDF abierto en nueva pestaña exitosamente');
            }
        }, 100);
        
    } catch (err) {
        console.error('❌ Error total:', err);
        alert('Error de descarga: ' + err.message);
    }
}

async function copyFileURL(fileName, bucketName = 'certificates') {
    try {
        console.log('📋 Copiando URL de archivo:', fileName, 'desde bucket:', bucketName);
        
        // Crear URL firmada
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileName, 60);
        
        if (error || !data?.signedUrl) {
            console.error('❌ Error generando URL:', error);
            alert('Error generando enlace: ' + (error?.message || 'No se pudo generar URL'));
            return;
        }
        
        // Copiar al portapapeles
        try {
            await navigator.clipboard.writeText(data.signedUrl);
            console.log('✅ URL copiada al portapapeles');
            alert('URL del PDF copiada al portapapeles. Pégala en una nueva pestaña para ver el archivo.');
        } catch (clipboardError) {
            console.warn('⚠️ Error con navigator.clipboard, usando método alternativo');
            
            // Método alternativo para navegadores más antiguos
            const textarea = document.createElement('textarea');
            textarea.value = data.signedUrl;
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            alert('URL del PDF copiada al portapapeles. Pégala en una nueva pestaña para ver el archivo.');
        }
        
    } catch (err) {
        console.error('❌ Error copiando URL:', err);
        alert('Error copiando URL: ' + err.message);
    }
}

async function deleteCertificate(fileName, bucketName = 'certificates') {
    const fileTypeText = bucketName === 'memos' ? 'memo de pago' : 'certificado';
    
    if (!confirm(`¿Estás seguro de que quieres eliminar este ${fileTypeText}?`)) {
        return;
    }
    
    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([fileName]);
        
        if (error) {
            console.error(`Error eliminando ${fileTypeText}:`, error);
            alert('Error eliminando el archivo');
            return;
        }
        
        // Invalidar cache del bucket
        delete filesCache[bucketName];
        delete lastCacheUpdate[bucketName];
        console.log(`🗑️ Cache invalidado para bucket ${bucketName} después de eliminación`);
        
        // Pequeño delay para permitir que Supabase se sincronice
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recargar lista de archivos
        const fileType = bucketName === 'memos' ? 'memo' : 'certificate';
        await loadExistingFiles(currentCertificateRowId, fileType);
        
    } catch (err) {
        console.error('Error total:', err);
        alert('Error eliminando el archivo');
    }
}

// === EVENT LISTENERS PARA EL MODAL ===

// Event listeners para cerrar el modal
if (elements.modalClose) {
    elements.modalClose.addEventListener('click', closeCertificateModal);
}

if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', closeCertificateModal);
}

// Cerrar modal al hacer click en el overlay
if (elements.modal) {
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeCertificateModal();
        }
    });
}

// Event listeners para upload
if (elements.uploadZone && elements.fileInput) {
    elements.uploadZone.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadZone.classList.add('dragover');
    });
    
    elements.uploadZone.addEventListener('dragleave', () => {
        elements.uploadZone.classList.remove('dragover');
    });
    
    elements.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    elements.fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

// Event delegation para botones de gestión de archivos
document.addEventListener('click', function(e) {
    // Botón de descarga individual
    if (e.target.closest('.btn-certificate-download')) {
        console.log('🖱️ Clic detectado en botón de descarga');
        const btn = e.target.closest('.btn-certificate-download');
        const filename = btn.dataset.filename;
        const bucket = btn.dataset.bucket || 'certificates';
        console.log('📄 Archivo a descargar:', filename, 'desde bucket:', bucket);
        
        if (filename) {
            e.preventDefault();
            e.stopPropagation();
            downloadCertificate(filename, bucket);
        } else {
            console.error('❌ No se encontró filename en el botón');
        }
        return;
    }
    
    // Botón de copiar URL
    if (e.target.closest('.btn-certificate-copy-url')) {
        console.log('🖱️ Clic detectado en botón de copiar URL');
        const btn = e.target.closest('.btn-certificate-copy-url');
        const filename = btn.dataset.filename;
        const bucket = btn.dataset.bucket || 'certificates';
        console.log('📋 Archivo para copiar URL:', filename, 'desde bucket:', bucket);
        
        if (filename) {
            e.preventDefault();
            e.stopPropagation();
            copyFileURL(filename, bucket);
        } else {
            console.error('❌ No se encontró filename en el botón de copiar');
        }
        return;
    }
    
    // Botón de eliminación individual
    if (e.target.closest('.btn-certificate-delete')) {
        const btn = e.target.closest('.btn-certificate-delete');
        const filename = btn.dataset.filename;
        const bucket = btn.dataset.bucket || 'certificates';
        if (filename) {
            deleteCertificate(filename, bucket);
        }
        return;
    }
    
    // Botón de certificado en tabla
    const certBtn = e.target.closest('.certificate-link-btn');
    if (certBtn && !certBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        const rowId = certBtn.dataset.rowId;
        
        if (rowId) {
            openFileModal(rowId, 'certificate');
        }
        return;
    }
    
    // Botón de memo de pago en tabla
    const memoBtn = e.target.closest('.memo-link-btn');
    if (memoBtn && !memoBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        
        const rowId = memoBtn.dataset.rowId;
        
        if (rowId) {
            openFileModal(rowId, 'memo');
        }
        return;
    }
});


