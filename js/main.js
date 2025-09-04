// Main JavaScript for AI Autocomplete Website

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offset = 80; // Account for fixed navbar
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Add scroll effect to navbar
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll
        if (currentScroll > 10) {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Observe steps
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(30px)';
        step.style.transition = `all 0.6s ease ${index * 0.2}s`;
        observer.observe(step);
    });

    // Observe pricing cards
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.15}s`;
        observer.observe(card);
    });

    // Typing animation for hero section
    const typingDemo = document.querySelector('.typing-demo');
    if (typingDemo) {
        const suggestions = [
            ' today because I\'m feeling unwell',
            ' this morning due to a doctor\'s appointment',
            ' tomorrow as I have a family emergency',
            ' because of a scheduling conflict',
            ' due to unexpected circumstances'
        ];
        
        let currentSuggestion = 0;
        const suggestionElement = typingDemo.querySelector('.suggestion');
        
        if (suggestionElement) {
            setInterval(() => {
                suggestionElement.style.opacity = '0';
                setTimeout(() => {
                    currentSuggestion = (currentSuggestion + 1) % suggestions.length;
                    suggestionElement.textContent = suggestions[currentSuggestion];
                    suggestionElement.style.opacity = '0.7';
                }, 200);
            }, 2000);
        }
    }

    // Mobile menu toggle (for future implementation)
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Copy to clipboard functionality for keyboard shortcuts
    const shortcuts = document.querySelectorAll('.shortcut');
    shortcuts.forEach(shortcut => {
        shortcut.style.cursor = 'pointer';
        shortcut.addEventListener('click', () => {
            const kbds = shortcut.querySelectorAll('kbd');
            const shortcutText = Array.from(kbds).map(kbd => kbd.textContent).join('+');
            
            navigator.clipboard.writeText(shortcutText).then(() => {
                // Visual feedback
                const originalBg = shortcut.style.background;
                shortcut.style.background = 'rgba(255, 255, 255, 0.1)';
                setTimeout(() => {
                    shortcut.style.background = originalBg;
                }, 200);
            });
        });
    });

    // Add hover effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.5)';
            ripple.style.pointerEvents = 'none';
            ripple.style.transition = 'width 0.6s, height 0.6s, opacity 0.6s';
            
            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.style.width = '300px';
                ripple.style.height = '300px';
                ripple.style.opacity = '0';
            }, 0);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Stats counter animation
    const stats = document.querySelectorAll('.stat-value');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const value = stat.textContent;
                const isPercentage = value.includes('%');
                const isPlus = value.includes('+');
                const numericValue = parseInt(value.replace(/\D/g, ''));
                
                let current = 0;
                const increment = numericValue / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        current = numericValue;
                        clearInterval(timer);
                    }
                    
                    let display = Math.floor(current);
                    if (isPercentage) display += '%';
                    if (isPlus) display += '+';
                    stat.textContent = display;
                }, 30);
                
                statsObserver.unobserve(stat);
            }
        });
    }, { threshold: 1 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });

    // Active section highlighting in legal pages
    if (window.location.pathname.includes('privacy.html') || window.location.pathname.includes('terms.html')) {
        const sections = document.querySelectorAll('.legal-content section[id]');
        const tocLinks = document.querySelectorAll('.toc-card a');
        
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    tocLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-100px 0px -70% 0px',
            threshold: 0
        });
        
        sections.forEach(section => {
            sectionObserver.observe(section);
        });
    }

    // Placeholder for future video player
    const videoPlaceholder = document.querySelector('.video-placeholder');
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', () => {
            // Future: Replace with actual video player initialization
            console.log('Video player will be implemented here');
        });
    }

    // Performance optimization - lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    images.forEach(img => {
        imageObserver.observe(img);
    });
});