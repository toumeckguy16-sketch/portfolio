// Supabase Configuration
// Remplacer ces valeurs par vos propres clés Supabase
const SUPABASE_URL = 'https://wrckwbfflbrbktmpoacp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JyBy-7AEbcXaIPHlbacxwg_Fc9HvWgy'; // À remplacer par votre clé réelle

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Reveal animations on scroll
    const reveals = document.querySelectorAll('.skill-card, .project-card, .section-title, .about-container');

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 150;

        reveals.forEach(element => {
            const revealTop = element.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                element.classList.add('active');
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Initial styles for reveal elements
    reveals.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger once on load

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            mobileMenu.classList.toggle('is-active');

            // Basic mobile menu styling toggle
            if (navLinks.style.display === 'flex') {
                navLinks.style.position = 'absolute';
                navLinks.style.top = '80px';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.backgroundColor = '#4B8E7D';
                navLinks.style.flexDirection = 'column';
                navLinks.style.padding = '2rem';
                navLinks.querySelectorAll('li').forEach(li => {
                    li.style.margin = '1rem 0';
                });
            }
        });
    }

    // Dynamic Projects Fetching
    const fetchProjects = async () => {
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid) return;

        try {
            const { data: projects, error } = await supabaseClient
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (projects && projects.length > 0) {
                projectsGrid.innerHTML = ''; // Clear placeholders
                projects.forEach(project => {
                    const card = document.createElement('div');
                    card.className = 'project-card';
                    card.style.opacity = '0'; // For animation
                    card.style.transform = 'translateY(30px)';

                    const tagsHtml = project.tags ? project.tags.map(tag => `<span>${tag}</span>`).join('') : '';

                    card.innerHTML = `
                        <div class="project-img" style="background-image: url('${project.image_url || 'https://via.placeholder.com/400x300'}'); background-size: cover;"></div>
                        <div class="project-info">
                            <h3>${project.title}</h3>
                            <p>${project.description}</p>
                            <div class="tags">
                                ${tagsHtml}
                            </div>
                            ${project.link ? `<a href="${project.link}" target="_blank" class="project-link">View Project →</a>` : ''}
                        </div>
                    `;
                    projectsGrid.appendChild(card);
                });
                // Re-run animation detection or force visibility
                setTimeout(() => {
                    document.querySelectorAll('.project-card').forEach(card => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    });
                    if (typeof revealOnScroll === 'function') revealOnScroll();
                }, 200);
            }
        } catch (error) {
            console.error('Error fetching projects:', error.message);
        }
    };

    fetchProjects();

    // Dynamic Site Settings (Colors, Text, Images)
    const applySettings = async () => {
        try {
            const { data: settings, error } = await supabaseClient
                .from('site_settings')
                .select('*')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No settings found in Supabase. Using default values.');
                } else {
                    throw error;
                }
                return;
            }

            if (settings) {
                // Apply Colors (CSS Variables)
                if (settings.primary_color) document.documentElement.style.setProperty('--header-green', settings.primary_color);
                if (settings.accent_color) document.documentElement.style.setProperty('--accent-coral', settings.accent_color);
                if (settings.hero_bg_color) document.documentElement.style.setProperty('--hero-mint', settings.hero_bg_color);

                // Gestion du Thème (Sombre / Clair)
                if (settings.is_dark_mode) {
                    document.documentElement.style.setProperty('--bg-primary', '#0f1110');
                    document.documentElement.style.setProperty('--bg-secondary', '#0f1110');
                    document.documentElement.style.setProperty('--bg-card', '#1a1c1b');
                    document.documentElement.style.setProperty('--text-main', '#ffffff');
                    document.documentElement.style.setProperty('--text-muted-color', '#a0a0a0');
                    document.documentElement.style.setProperty('--header-green', '#0f1110');
                    document.documentElement.style.setProperty('--hero-mint', '#0f1110');
                    document.body.classList.add('dark-theme');
                } else {
                    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
                    document.documentElement.style.setProperty('--bg-secondary', '#fafafa');
                    document.documentElement.style.setProperty('--bg-card', '#ffffff');
                    document.documentElement.style.setProperty('--text-main', '#2d3e39');
                    document.documentElement.style.setProperty('--text-muted-color', '#5a7a72');
                    document.documentElement.style.setProperty('--header-green', '#4b8e7d');
                    document.documentElement.style.setProperty('--hero-mint', '#e8f8f3');
                    document.body.classList.remove('dark-theme');
                }

                // Apply Text Content
                if (settings.hero_title) document.querySelector('.hero-title').innerText = settings.hero_title;
                if (settings.hero_description) document.querySelector('.hero-description').innerHTML = settings.hero_description;
                if (settings.about_text) document.querySelector('.about-text').innerHTML = settings.about_text;

                // Apply Images
                if (settings.profile_image_url) {
                    document.querySelectorAll('.hero-img-main, .profile-img').forEach(img => {
                        img.src = settings.profile_image_url;
                    });
                }

                // Apply Social Links
                const socialLinks = document.querySelector('.social-links');
                if (socialLinks) {
                    if (settings.linkedin_url) socialLinks.querySelector('.fa-linkedin').parentElement.href = settings.linkedin_url;
                    if (settings.github_url) socialLinks.querySelector('.fa-github').parentElement.href = settings.github_url;
                    if (settings.twitter_url) socialLinks.querySelector('.fa-twitter').parentElement.href = settings.twitter_url;
                }

                console.log('Site settings applied successfully!');
            }
        } catch (error) {
            console.error('Error applying site settings:', error.message);
        }
    };

    applySettings();

    // Contact Form Submission to Supabase
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;

            const name = contactForm.querySelector('input[type="text"]').value;
            const email = contactForm.querySelector('input[type="email"]').value;
            const message = contactForm.querySelector('textarea').value;

            btn.innerText = 'SENDING...';
            btn.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from('messages')
                    .insert([{ name, email, message }]);

                if (error) throw error;

                alert('Merci ! Votre message a été envoyé avec succès.');
                contactForm.reset();
            } catch (error) {
                console.error('Error sending message:', error.message);
                alert('Oups ! Une erreur est survenue lors de l\'envoi du message.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Header Background Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            navbar.style.height = '70px';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.height = '80px';
        }
    });
});

