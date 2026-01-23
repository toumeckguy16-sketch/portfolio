// Supabase Configuration
const SUPABASE_URL = 'https://wrckwbfflbrbktmpoacp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JyBy-7AEbcXaIPHlbacxwg_Fc9HvWgy';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const settingsForm = document.getElementById('settings-form');
const projectsList = document.getElementById('projects-list');
const messagesList = document.getElementById('messages-list');
const sidebarItems = document.querySelectorAll('.admin-sidebar li');
const contentSections = document.querySelectorAll('.content-section');
const addProjectBtn = document.getElementById('add-project-btn');
const projectModal = document.getElementById('project-modal');
const projectForm = document.getElementById('project-form');
const closeModal = document.querySelector('.close-modal');
const profileUrlInput = document.getElementById('profile-url-input');
const profilePreview = document.getElementById('profile-preview');
const profileUpload = document.getElementById('profile-upload');
const accessList = document.getElementById('access-list');
const addAccessForm = document.getElementById('add-access-form');

// State
let currentProject = null;

// --- Authentication ---
const checkSession = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const isAuthorized = await checkAuthorization(session.user.email);
        if (isAuthorized) {
            showDashboard(session.user);
        } else {
            alert('Accès refusé. Votre email n\'est pas autorisé.');
            await supabaseClient.auth.signOut();
            showLogin();
        }
    } else {
        showLogin();
    }
};

const checkAuthorization = async (email) => {
    // Si la table n'existe pas encore ou est vide, on autorise le premier utilisateur (vous)
    const { data, error } = await supabaseClient
        .from('authorized_users')
        .select('*');

    if (error || !data || data.length === 0) return true;

    return data.some(user => user.email === email);
};

const showLogin = () => {
    authContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
};

const showDashboard = (user) => {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    document.getElementById('user-email').innerText = user.email;
    loadSettings();
    loadProjects();
    loadMessages();
    loadAuthorizedUsers();
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const errorMsg = document.getElementById('login-error');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        errorMsg.innerText = error.message;
    } else {
        showDashboard(data.user);
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

// --- Sidebar Navigation ---
sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        const sectionId = item.getAttribute('data-section');

        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        contentSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${sectionId}-section`) {
                section.classList.add('active');
            }
        });
    });
});

// --- Site Settings ---
const loadSettings = async () => {
    const { data: settings, error } = await supabaseClient
        .from('site_settings')
        .select('*')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
    }

    if (settings) {
        Object.keys(settings).forEach(key => {
            const input = settingsForm.elements[key];
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = settings[key];
                } else {
                    input.value = settings[key] || '';
                }
            }
        });
        // Update profile preview
        if (settings.profile_image_url) {
            profilePreview.src = settings.profile_image_url;
        }
    }
};

// Live Preview for Profile Image
profileUrlInput.addEventListener('input', (e) => {
    profilePreview.src = e.target.value || 'assets/imageMe.jpg';
});

// Image Upload to Supabase Storage
profileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `profile-${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    try {
        const { error: uploadError, data } = await supabaseClient.storage
            .from('portfolio_assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage
            .from('portfolio_assets')
            .getPublicUrl(filePath);

        profileUrlInput.value = publicUrl;
        profilePreview.src = publicUrl;
        alert('Image uploadée avec succès ! N\'oubliez pas de sauvegarder les changements.');
    } catch (error) {
        console.error('Error uploading image:', error.message);
        alert('Erreur lors de l\'upload : ' + error.message + '\nAssurez-vous d\'avoir créé un bucket "portfolio_assets" public dans Supabase.');
    }
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    const updates = Object.fromEntries(formData.entries());

    // Handle checkbox
    updates.is_dark_mode = settingsForm.is_dark_mode.checked;

    const { error } = await supabaseClient
        .from('site_settings')
        .upsert({ id: 1, ...updates }); // Assuming single row with ID 1

    if (error) {
        alert('Error updating settings: ' + error.message);
    } else {
        alert('Settings saved successfully!');
    }
});

// --- Projects Management ---
const loadProjects = async () => {
    const { data: projects, error } = await supabaseClient
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    projectsList.innerHTML = '';
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'admin-project-card';
        card.innerHTML = `
            <div class="admin-project-img" style="background-image: url('${project.image_url || 'https://via.placeholder.com/400x300'}')"></div>
            <div class="admin-project-info">
                <h3>${project.title}</h3>
                <div class="admin-project-actions">
                    <button class="btn-sm btn-edit" onclick="editProject('${project.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteProject('${project.id}')">Delete</button>
                </div>
            </div>
        `;
        projectsList.appendChild(card);
    });
};

window.editProject = async (id) => {
    const { data: project, error } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

    if (project) {
        currentProject = project;
        document.getElementById('modal-title').innerText = 'Edit Project';
        projectForm.id.value = project.id;
        projectForm.title.value = project.title;
        projectForm.description.value = project.description;
        projectForm.image_url.value = project.image_url || '';
        projectForm.link.value = project.link || '';
        projectForm.tags.value = project.tags ? project.tags.join(', ') : '';
        projectModal.style.display = 'block';
    }
};

window.deleteProject = async (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
        const { error } = await supabaseClient
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) alert('Error: ' + error.message);
        else loadProjects();
    }
};

addProjectBtn.addEventListener('click', () => {
    currentProject = null;
    document.getElementById('modal-title').innerText = 'Add Project';
    projectForm.reset();
    projectForm.id.value = '';
    projectModal.style.display = 'block';
});

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(projectForm);
    const projectData = Object.fromEntries(formData.entries());

    // Process tags
    if (projectData.tags) {
        projectData.tags = projectData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    } else {
        projectData.tags = [];
    }

    const id = projectData.id;
    delete projectData.id; // Don't include ID in data update

    let result;
    if (id) {
        result = await supabaseClient.from('projects').update(projectData).eq('id', id);
    } else {
        result = await supabaseClient.from('projects').insert([projectData]);
    }

    if (result.error) {
        alert('Error: ' + result.error.message);
    } else {
        projectModal.style.display = 'none';
        loadProjects();
    }
});

// --- Messages ---
const loadMessages = async () => {
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    messagesList.innerHTML = '';
    messages.forEach(msg => {
        const date = new Date(msg.created_at).toLocaleDateString();
        const card = document.createElement('div');
        card.className = 'message-card';
        card.innerHTML = `
            <div class="message-header">
                <strong>From: ${msg.name}</strong>
                <span class="message-meta">${date}</span>
            </div>
            <div class="message-meta">Email: ${msg.email}</div>
            <div class="message-body" style="margin-top: 1rem;">${msg.message}</div>
        `;
        messagesList.appendChild(card);
    });
};

// --- Authorized Users ---
const loadAuthorizedUsers = async () => {
    const { data: users, error } = await supabaseClient
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching authorized users:', error);
        return;
    }

    accessList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${user.email}</span>
            <button class="btn-remove" onclick="removeAuthorization('${user.id}')"><i class="fas fa-trash"></i></button>
        `;
        accessList.appendChild(li);
    });
};

addAccessForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-access-email').value;

    const { error } = await supabaseClient
        .from('authorized_users')
        .insert([{ email }]);

    if (error) {
        alert('Erreur: ' + error.message);
    } else {
        document.getElementById('new-access-email').value = '';
        loadAuthorizedUsers();
    }
});

window.removeAuthorization = async (id) => {
    if (confirm('Supprimer l\'accès pour cet email ?')) {
        const { error } = await supabaseClient
            .from('authorized_users')
            .delete()
            .eq('id', id);

        if (error) alert('Erreur: ' + error.message);
        else loadAuthorizedUsers();
    }
};

// Modal Close logic
closeModal.addEventListener('click', () => projectModal.style.display = 'none');
window.onclick = (event) => {
    if (event.target == projectModal) projectModal.style.display = 'none';
};

// Initialize
checkSession();
