// Ensure flashcards array is available from data.js
let cards = [];
let currentIndex = 0;

const flashcardEl = document.getElementById('flashcard');
const questionTextEl = document.getElementById('question-text');
const answerTextEl = document.getElementById('answer-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const flipBtn = document.getElementById('flip-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const progressTextEl = document.getElementById('progress-text');
const progressFillEl = document.getElementById('progress-fill');
const confidenceBadgeEl = document.getElementById('confidence-badge');
const confidenceButtons = document.querySelectorAll('.btn-conf');
const sidebarEl = document.getElementById('sidebar');
const sidebarOverlayEl = document.getElementById('sidebar-overlay');
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const filterItems = document.querySelectorAll('.filter-item');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnNdB2ID8gx7k6bz7FOTVCtuWO8N4-JyI",
  authDomain: "fm-flashcard.firebaseapp.com",
  projectId: "fm-flashcard",
  storageBucket: "fm-flashcard.firebasestorage.app",
  messagingSenderId: "645660318045",
  appId: "1:645660318045:web:21cc9142e5380b80a930b4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentFilter = 'all';
let currentUser = null;

function init() {
    if (typeof flashcards !== 'undefined' && flashcards.length > 0) {
        applyFilter('all');
    } else {
        questionTextEl.textContent = "No flashcards found. Check data.js";
        answerTextEl.innerHTML = "";
    }
    setupEventListeners();
}

function applyFilter(filter) {
    currentFilter = filter;
    
    // Update active class on filter items
    filterItems.forEach(item => {
        if (item.getAttribute('data-filter') === filter) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    cards = flashcards.filter(card => {
        const level = localStorage.getItem('conf_' + hashCode(card.question));
        if (filter === 'all') return true;
        if (filter === 'unrated') return !level;
        return level === filter;
    });

    currentIndex = 0;
    if (cards.length > 0) {
        loadCard(currentIndex);
    } else {
        // Show empty state
        questionTextEl.textContent = "No cards found for this filter.";
        answerTextEl.innerHTML = "Try selecting a different confidence level.";
        progressTextEl.textContent = `Card 0 / 0`;
        progressFillEl.style.width = `0%`;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        confidenceBadgeEl.style.display = 'none'; // hide badge
        
        // Remove flip effect if any
        if (flashcardEl.classList.contains('is-flipped')) {
            flashcardEl.classList.remove('is-flipped');
        }
    }
}

function loadCard(index) {
    if (index < 0 || index >= cards.length) return;
    
    // Unflip card before changing content
    if (flashcardEl.classList.contains('is-flipped')) {
        flashcardEl.classList.remove('is-flipped');
        setTimeout(() => updateCardContent(index), 300); // Wait for unflip animation
    } else {
        updateCardContent(index);
    }
}

function updateCardContent(index) {
    const card = cards[index];
    questionTextEl.textContent = card.question;
    answerTextEl.innerHTML = card.answer;
    
    // Update progress
    progressTextEl.textContent = `Card ${index + 1} / ${cards.length}`;
    progressFillEl.style.width = `${((index + 1) / cards.length) * 100}%`;
    
    // Update buttons
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === cards.length - 1;

    // Load confidence level
    const savedLevel = localStorage.getItem('conf_' + hashCode(card.question));
    if (savedLevel) {
        confidenceBadgeEl.textContent = savedLevel.toUpperCase();
        confidenceBadgeEl.className = 'badge ' + savedLevel;
    } else {
        confidenceBadgeEl.className = 'badge';
        confidenceBadgeEl.textContent = '';
    }
}

// simple hash function for keys
function hashCode(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash;
}

function flipCard() {
    flashcardEl.classList.toggle('is-flipped');
}

function nextCard() {
    if (currentIndex < cards.length - 1) {
        currentIndex++;
        loadCard(currentIndex);
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        loadCard(currentIndex);
    }
}

function shuffleCards() {
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    currentIndex = 0;
    loadCard(currentIndex);
}

function setupEventListeners() {
    flashcardEl.addEventListener('click', flipCard);
    flipBtn.addEventListener('click', flipCard);
    
    nextBtn.addEventListener('click', nextCard);
    prevBtn.addEventListener('click', prevCard);
    
    shuffleBtn.addEventListener('click', shuffleCards);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextCard();
        else if (e.key === 'ArrowLeft') prevCard();
        else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            flipCard();
        }
    });

    // Confidence buttons logic
    confidenceButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent flipping the card back immediately
            if (cards.length === 0) return;
            const level = e.target.getAttribute('data-level');
            const card = cards[currentIndex];
            const hashStr = hashCode(card.question).toString();
            
            localStorage.setItem('conf_' + hashStr, level);
            
            // Save to Firestore if logged in
            if (currentUser) {
                db.collection('users').doc(currentUser.uid).collection('confidence').doc(hashStr).set({
                    level: level,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.error("Error saving to cloud:", err));
            }
            
            // show feedback then go to next card
            setTimeout(() => {
                if (currentIndex < cards.length - 1) {
                    nextCard();
                } else {
                    flipCard(); // Just unflip if it's the last card
                    loadCard(currentIndex); // reload to show badge
                }
            }, 150);
        });
    });

    // Sidebar toggle
    menuBtn.addEventListener('click', () => {
        sidebarEl.classList.add('open');
        sidebarOverlayEl.classList.add('active');
    });

    function closeSidebar() {
        sidebarEl.classList.remove('open');
        sidebarOverlayEl.classList.remove('active');
    }

    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlayEl.addEventListener('click', closeSidebar);

    filterItems.forEach(item => {
        item.addEventListener('click', () => {
            const filter = item.getAttribute('data-filter');
            applyFilter(filter);
            closeSidebar();
            if(flashcardEl.classList.contains('is-flipped')) {
                flashcardEl.classList.remove('is-flipped');
            }
        });
    });

    // Auth Event Listeners
    setupAuthListeners();
}

function setupAuthListeners() {
    const authModal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signinBtn = document.getElementById('signin-btn');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const authError = document.getElementById('auth-error');

    loginBtn.addEventListener('click', () => authModal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
        authError.textContent = '';
    });
    logoutBtn.addEventListener('click', () => auth.signOut());

    signupBtn.addEventListener('click', () => {
        if(!emailInput.value || !passwordInput.value) return;
        auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(() => {
                authModal.classList.remove('active');
                emailInput.value = ''; passwordInput.value = ''; authError.textContent = '';
            })
            .catch(err => { authError.textContent = err.message; });
    });

    signinBtn.addEventListener('click', () => {
        if(!emailInput.value || !passwordInput.value) return;
        auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(() => {
                authModal.classList.remove('active');
                emailInput.value = ''; passwordInput.value = ''; authError.textContent = '';
            })
            .catch(err => { authError.textContent = err.message; });
    });

    // Firebase Auth State Observer
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('user-info').textContent = user.email;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            syncDataFromFirestore();
        } else {
            currentUser = null;
            document.getElementById('user-info').textContent = 'Not logged in';
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            applyFilter(currentFilter);
        }
    });
}

function syncDataFromFirestore() {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).collection('confidence').get().then(snapshot => {
        let hasChanges = false;
        snapshot.forEach(doc => {
            const currentVal = localStorage.getItem('conf_' + doc.id);
            if(currentVal !== doc.data().level) {
                localStorage.setItem('conf_' + doc.id, doc.data().level);
                hasChanges = true;
            }
        });
        if (hasChanges) {
            applyFilter(currentFilter);
        }
    }).catch(err => console.error("Error fetching data:", err));
}

window.addEventListener('DOMContentLoaded', init);
