import { appConfig } from './app-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const REQUIRED_FIREBASE_KEYS = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId'
];

const FIXED_HOST_RESPONSES = [
    {
        id: 'fixed-host-shabnam',
        uid: 'fixed-host-shabnam',
        firstName: 'Shabnam',
        lastName: '',
        displayName: 'Shabnam',
        attending: 'yes',
        guestCount: '1',
        childrenCount: '0',
        isFixedResponse: true
    },
    {
        id: 'fixed-host-arsham',
        uid: 'fixed-host-arsham',
        firstName: 'Arsham',
        lastName: '',
        displayName: 'Arsham',
        attending: 'yes',
        guestCount: '1',
        childrenCount: '0',
        isFixedResponse: true
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const elements = getElements();
    const state = {
        auth: null,
        db: null,
        currentUser: null,
        isAdmin: false,
        adminRsvpUnsubscribe: null,
        adminProfilesUnsubscribe: null,
        adminRolesUnsubscribe: null,
        adminBlockedUnsubscribe: null,
        existingRsvp: null,
        adminEntries: [],
        verifiedProfiles: [],
        grantedAdmins: [],
        blockedUsers: [],
        adminViewMode: 'summary',
        bankDetailsVisible: false
    };

    setPrivateSectionVisibility(false, elements);
    attachStaticInteractions(elements);
    bindFormVisibilityHandlers(elements);
    bindAuthTabs(elements);
    bindProtectedInteractions(state, elements);
    renderWeddingFundDetails(state, elements);
    resetRsvpForm(elements, null);
    renderAdminEntries(state.adminEntries, state, elements);

    elements.signInForm.addEventListener('submit', (event) => handleSignIn(event, state, elements));
    elements.signUpForm.addEventListener('submit', (event) => handleSignUp(event, state, elements));
    elements.recheckVerificationButton.addEventListener('click', () => refreshSession(state, elements));
    elements.refreshSessionButton.addEventListener('click', () => refreshSession(state, elements));
    elements.resendVerificationButton.addEventListener('click', () => resendVerification(state, elements));
    elements.rsvpForm.addEventListener('submit', (event) => handleRsvpSubmit(event, state, elements));

    if (!hasFirebaseConfig(appConfig.firebase)) {
        elements.setupNotice.classList.remove('hidden');
        elements.authView.classList.add('hidden');
        setBanner(elements, 'Firebase is not configured yet. Add your project details in app-config.js before testing sign-in, RSVP storage, or the admin view.', 'error');
        return;
    }

    initializeFirebase(state, elements);
});

function getElements() {
    return {
        rsvpSection: document.getElementById('rsvp'),
        privateSections: Array.from(document.querySelectorAll('[data-private-section]')),
        authMessage: document.getElementById('authMessage'),
        authStatusBar: document.getElementById('authStatusBar'),
        authStatusText: document.getElementById('authStatusText'),
        heroGuestLoginButton: document.getElementById('heroGuestLoginButton'),
        openGuestAreaButton: document.getElementById('openGuestAreaButton'),
        openGuestPreviewButton: document.getElementById('openGuestPreviewButton'),
        authView: document.getElementById('authView'),
        guestView: document.getElementById('guestView'),
        guestAreaTitle: document.getElementById('guestAreaTitle'),
        adminView: document.getElementById('adminView'),
        adminDashboardTitle: document.getElementById('adminDashboardTitle'),
        adminAccessPanel: document.getElementById('adminAccessPanel'),
        adminList: document.getElementById('adminList'),
        adminTableBody: document.getElementById('adminTableBody'),
        adminAccessList: document.getElementById('adminAccessList'),
        adminAccessEmptyState: document.getElementById('adminAccessEmptyState'),
        adminSummaryGrid: document.getElementById('adminSummaryGrid'),
        adminSummaryHighlights: document.getElementById('adminSummaryHighlights'),
        adminSummaryView: document.getElementById('adminSummaryView'),
        adminResponsesView: document.getElementById('adminResponsesView'),
        adminTableView: document.getElementById('adminTableView'),
        adminViewButtons: Array.from(document.querySelectorAll('[data-admin-view]')),
        adminEmptyState: document.getElementById('adminEmptyState'),
        adminRsvpCount: document.getElementById('adminRsvpCount'),
        setupNotice: document.getElementById('setupNotice'),
        verificationGate: document.getElementById('verificationGate'),
        verificationEmail: document.getElementById('verificationEmail'),
        signInForm: document.getElementById('signInForm'),
        signUpForm: document.getElementById('signUpForm'),
        signInTab: document.getElementById('signInTab'),
        signUpTab: document.getElementById('signUpTab'),
        signInEmail: document.getElementById('signInEmail'),
        signInPassword: document.getElementById('signInPassword'),
        signUpFirstName: document.getElementById('signUpFirstName'),
        signUpLastName: document.getElementById('signUpLastName'),
        signUpEmail: document.getElementById('signUpEmail'),
        signUpPassword: document.getElementById('signUpPassword'),
        signUpPasswordConfirm: document.getElementById('signUpPasswordConfirm'),
        resendVerificationButton: document.getElementById('resendVerificationButton'),
        recheckVerificationButton: document.getElementById('recheckVerificationButton'),
        refreshSessionButton: document.getElementById('refreshSessionButton'),
        openDashboardButton: document.getElementById('openDashboardButton'),
        returnToAdminViewButton: document.getElementById('returnToAdminViewButton'),
        signOutButtons: Array.from(document.querySelectorAll('[data-action="sign-out"]')),
        toggleBankDetailsButton: document.getElementById('toggleBankDetailsButton'),
        sensitiveBankDetails: document.getElementById('sensitiveBankDetails'),
        rsvpForm: document.getElementById('rsvpForm'),
        submitRsvpButton: document.getElementById('submitRsvpButton'),
        rsvpPanelTitle: document.getElementById('rsvpPanelTitle'),
        rsvpPanelIntro: document.getElementById('rsvpPanelIntro'),
        successMessage: document.getElementById('successMessage'),
        successMessageHeading: document.getElementById('successMessageHeading'),
        successMessageText: document.getElementById('successMessageText'),
        successMessageNote: document.getElementById('successMessageNote'),
        firstName: document.getElementById('firstName'),
        lastName: document.getElementById('lastName'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        guestCountGroup: document.getElementById('guestCountGroup'),
        childrenGroup: document.getElementById('childrenGroup'),
        guestNamesGroup: document.getElementById('guestNamesGroup'),
        childrenAgesGroup: document.getElementById('childrenAgesGroup'),
        dietaryGroup: document.getElementById('dietaryGroup'),
        accessibilityGroup: document.getElementById('accessibilityGroup'),
        accommodationInterestGroup: document.getElementById('accommodationInterestGroup'),
        accommodationCountGroup: document.getElementById('accommodationCountGroup'),
        songRequestGroup: document.getElementById('songRequestGroup'),
        attendingRadios: Array.from(document.querySelectorAll('input[name="attending"]')),
        accommodationInterestFields: Array.from(document.querySelectorAll('input[name="accommodationInterest"]')),
        guestCountField: document.getElementById('guestCount'),
        childrenCountField: document.getElementById('childrenCount'),
        guestNamesField: document.getElementById('guestNames'),
        childrenAgesField: document.getElementById('childrenAges'),
        dietaryField: document.getElementById('dietary'),
        accessibilityField: document.getElementById('accessibility'),
        accommodationCountField: document.getElementById('accommodationCount'),
        songRequestField: document.getElementById('songRequest'),
        messageField: document.getElementById('message'),
        fundBankName: document.getElementById('fundBankName'),
        fundAccountName: document.getElementById('fundAccountName'),
        fundSortCode: document.getElementById('fundSortCode'),
        fundAccountNumber: document.getElementById('fundAccountNumber')
    };
}

function hasFirebaseConfig(firebaseConfig) {
    const config = firebaseConfig || {};

    return REQUIRED_FIREBASE_KEYS.every((key) => {
        const value = config[key];
        return typeof value === 'string' && value.trim().length > 0;
    });
}

function setPrivateSectionVisibility(isVisible, elements) {
    document.body.classList.toggle('app-shell-locked', !isVisible);
    (elements.privateSections || []).forEach((section) => {
        section.classList.toggle('hidden', !isVisible);
    });
}

function initializeFirebase(state, elements) {
    const firebaseApp = initializeApp(appConfig.firebase);
    state.auth = getAuth(firebaseApp);
    state.db = getFirestore(firebaseApp);

    onAuthStateChanged(state.auth, async (user) => {
        await syncSession(user, state, elements);
    });
}

async function syncSession(user, state, elements) {
    state.currentUser = user;
    state.bankDetailsVisible = false;
    updateBankDetailsVisibility(state, elements);
    clearAdminSubscriptions(state);
    hideSuccessMessage(elements);
    let accessChecksLimited = false;

    if (!user) {
        setPrivateSectionVisibility(false, elements);
        state.isAdmin = false;
        state.existingRsvp = null;
        state.adminEntries = [];
        state.verifiedProfiles = [];
        state.grantedAdmins = [];
        state.blockedUsers = [];
        state.adminViewMode = 'summary';
        renderAdminEntries(state.adminEntries, state, elements);
        elements.authStatusBar.classList.add('hidden');
        elements.heroGuestLoginButton.classList.remove('hidden');
        elements.authView.classList.remove('hidden');
        elements.verificationGate.classList.add('hidden');
        elements.guestView.classList.add('hidden');
        elements.adminView.classList.add('hidden');
        elements.openGuestAreaButton.classList.add('hidden');
        elements.openGuestPreviewButton.classList.add('hidden');
        elements.openDashboardButton.classList.add('hidden');
        elements.returnToAdminViewButton.classList.add('hidden');
        resetRsvpForm(elements, null);
        switchAuthTab('sign-in', elements);
        return 'logged-out';
    }

    elements.authStatusBar.classList.remove('hidden');
    elements.heroGuestLoginButton.classList.add('hidden');
    elements.authStatusText.textContent = user.emailVerified
        ? `Signed in as ${user.email}`
        : `Signed in as ${user.email}. Email verification is still required.`;

    if (!user.emailVerified) {
        setPrivateSectionVisibility(false, elements);
        elements.authView.classList.add('hidden');
        elements.verificationGate.classList.remove('hidden');
        elements.guestView.classList.add('hidden');
        elements.adminView.classList.add('hidden');
        elements.openGuestAreaButton.classList.add('hidden');
        elements.openGuestPreviewButton.classList.add('hidden');
        elements.openDashboardButton.classList.add('hidden');
        elements.returnToAdminViewButton.classList.add('hidden');
        elements.verificationEmail.textContent = user.email || '';
        setBanner(elements, 'Verify your email before protected content, bank details, and RSVP submissions become available. Please check your spam folder as well as your inbox.', 'info');
        return 'verification-required';
    }

    elements.verificationGate.classList.add('hidden');

    try {
        const blockedSnapshot = await getDoc(doc(state.db, 'blockedUsers', user.uid));
        if (blockedSnapshot.exists()) {
            setPrivateSectionVisibility(false, elements);
            await signOut(state.auth);
            setBanner(elements, 'Your access to this site has been removed. Please contact the couple if this seems incorrect.', 'error');
            return 'blocked';
        }
    } catch (error) {
        accessChecksLimited = true;
    }

    setPrivateSectionVisibility(true, elements);

    try {
        await ensureVerifiedProfile(user, state);
    } catch (error) {
        setBanner(elements, 'Your account is verified, but the site could not refresh your access profile yet. Core access still works, but admin self-service may need the latest Firestore rules.', 'info');
    }

    try {
        state.isAdmin = await isAdminUser(user, state);
    } catch (error) {
        accessChecksLimited = true;
        state.isAdmin = isBootstrapAdminEmail(user.email || '');
    }

    if (state.isAdmin) {
        elements.authStatusText.textContent = `Signed in as ${user.email} with admin access`;
        elements.authView.classList.add('hidden');
        setBanner(
            elements,
            accessChecksLimited
                ? 'Verified admin access enabled. The dashboard is available, although some access checks could not be fully refreshed just now.'
                : 'Verified admin access enabled. RSVP submissions are shown below.',
            'success'
        );
        renderAdminEntries(state.adminEntries, state, elements);
        subscribeToAdminData(state, elements);
        openAdminDashboard('summary', state, elements);
        return 'admin';
    }

    elements.authStatusText.textContent = `Signed in as ${user.email}`;
    elements.authView.classList.add('hidden');
    elements.adminView.classList.add('hidden');
    elements.openGuestAreaButton.classList.remove('hidden');
    elements.openGuestPreviewButton.classList.add('hidden');
    elements.openDashboardButton.classList.add('hidden');
    elements.returnToAdminViewButton.classList.add('hidden');
    elements.guestView.classList.remove('hidden');
    setBanner(elements, 'You are signed in with a verified email address. The protected RSVP form and wedding fund details are now visible.', 'success');
    await loadGuestRsvp(state, elements, user);
    openGuestArea(elements);
    return 'guest';
}

async function isAdminUser(user, state) {
    const configuredAdminEmails = (appConfig.adminEmails || []).map((email) => email.trim().toLowerCase());
    const email = (user.email || '').trim().toLowerCase();

    if (configuredAdminEmails.includes(email)) {
        return true;
    }

    const adminSnapshot = await getDoc(doc(state.db, 'admins', user.uid));
    return adminSnapshot.exists();
}

async function ensureVerifiedProfile(user, state) {
    const fallbackName = splitName('', '', user.displayName || '');
    const displayName = user.displayName || `${fallbackName.firstName} ${fallbackName.lastName}`.trim() || user.email || 'Verified guest';

    await setDoc(doc(state.db, 'profiles', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName,
        emailVerified: true,
        lastSeenAt: serverTimestamp()
    }, { merge: true });
}

function bindAuthTabs(elements) {
    elements.signInTab.addEventListener('click', () => switchAuthTab('sign-in', elements));
    elements.signUpTab.addEventListener('click', () => switchAuthTab('sign-up', elements));
}

function bindProtectedInteractions(state, elements) {
    elements.signOutButtons.forEach((button) => {
        button.addEventListener('click', () => handleSignOut(state, elements));
    });

    elements.openGuestAreaButton.addEventListener('click', () => {
        openGuestArea(elements);
    });

    elements.openGuestPreviewButton.addEventListener('click', async () => {
        await openGuestExperience(state, elements);
    });

    elements.openDashboardButton.addEventListener('click', () => {
        openAdminDashboard('summary', state, elements);
    });

    elements.returnToAdminViewButton.addEventListener('click', () => {
        openAdminDashboard(state.adminViewMode, state, elements);
    });

    elements.toggleBankDetailsButton.addEventListener('click', () => {
        state.bankDetailsVisible = !state.bankDetailsVisible;
        updateBankDetailsVisibility(state, elements);
    });

    elements.adminViewButtons.forEach((button) => {
        button.addEventListener('click', () => {
            state.adminViewMode = button.dataset.adminView || 'summary';
            applyAdminView(state.adminViewMode, elements);
        });
    });

    elements.adminView.addEventListener('submit', (event) => {
        const donationForm = event.target.closest('[data-donation-form]');

        if (!donationForm) {
            return;
        }

        handleAdminDonationSubmit(event, donationForm, state, elements);
    });

    elements.adminView.addEventListener('click', (event) => {
        const grantAdminButton = event.target.closest('[data-grant-admin]');

        if (grantAdminButton) {
            handleGrantAdmin(grantAdminButton, state, elements);
            return;
        }

        const revokeAdminButton = event.target.closest('[data-revoke-admin]');

        if (revokeAdminButton) {
            handleRevokeAdmin(revokeAdminButton, state, elements);
            return;
        }

        const removeUserButton = event.target.closest('[data-remove-user]');

        if (removeUserButton) {
            handleRemoveUser(removeUserButton, state, elements);
            return;
        }

        const restoreUserButton = event.target.closest('[data-restore-user]');

        if (restoreUserButton) {
            handleRestoreUser(restoreUserButton, state, elements);
            return;
        }

        const clearRsvpButton = event.target.closest('[data-clear-rsvp]');

        if (clearRsvpButton) {
            handleClearRsvp(clearRsvpButton, state, elements);
            return;
        }

        const deleteButton = event.target.closest('[data-delete-rsvp]');

        if (!deleteButton) {
            return;
        }

        handleAdminDelete(deleteButton, state, elements);
    });
}

function switchAuthTab(tabName, elements) {
    const showingSignIn = tabName === 'sign-in';
    elements.signInTab.classList.toggle('auth-tab-active', showingSignIn);
    elements.signInTab.setAttribute('aria-selected', String(showingSignIn));
    elements.signUpTab.classList.toggle('auth-tab-active', !showingSignIn);
    elements.signUpTab.setAttribute('aria-selected', String(!showingSignIn));
    elements.signInForm.classList.toggle('hidden', !showingSignIn);
    elements.signUpForm.classList.toggle('hidden', showingSignIn);
}

async function handleSignIn(event, state, elements) {
    event.preventDefault();

    if (!state.auth) {
        setBanner(elements, 'Firebase is not configured yet.', 'error');
        return;
    }

    const email = elements.signInEmail.value.trim();
    const password = elements.signInPassword.value;
    const restore = setBusy(elements.signInForm.querySelector('button[type="submit"]'), 'Signing In...');

    try {
        const credential = await signInWithEmailAndPassword(state.auth, email, password);
        elements.signInPassword.value = '';
        await syncSession(credential.user, state, elements);
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    } finally {
        restore();
    }
}

async function handleSignUp(event, state, elements) {
    event.preventDefault();

    if (!state.auth) {
        setBanner(elements, 'Firebase is not configured yet.', 'error');
        return;
    }

    const firstName = elements.signUpFirstName.value.trim();
    const lastName = elements.signUpLastName.value.trim();
    const email = elements.signUpEmail.value.trim();
    const password = elements.signUpPassword.value;
    const confirmPassword = elements.signUpPasswordConfirm.value;

    if (password !== confirmPassword) {
        setBanner(elements, 'Passwords do not match.', 'error');
        return;
    }

    if (password.length < 8) {
        setBanner(elements, 'Please choose a password with at least 8 characters.', 'error');
        return;
    }

    const restore = setBusy(elements.signUpForm.querySelector('button[type="submit"]'), 'Creating Account...');

    try {
        const credential = await createUserWithEmailAndPassword(state.auth, email, password);
        const displayName = `${firstName} ${lastName}`.trim();

        if (displayName) {
            await updateProfile(credential.user, { displayName });
        }

        await sendEmailVerification(credential.user);
        elements.signUpPassword.value = '';
        elements.signUpPasswordConfirm.value = '';
        await syncSession(credential.user, state, elements);
        setBanner(elements, 'Account created. Please check your inbox and spam folder, then click the verification link before continuing.', 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    } finally {
        restore();
    }
}

async function resendVerification(state, elements) {
    if (!state.currentUser) {
        return;
    }

    const restore = setBusy(elements.resendVerificationButton, 'Sending...');

    try {
        await sendEmailVerification(state.currentUser);
        setBanner(elements, 'A fresh verification email has been sent. Please check your inbox and spam folder.', 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    } finally {
        restore();
    }
}

async function refreshSession(state, elements) {
    if (!state.currentUser) {
        return;
    }

    const restore = setBusy(elements.refreshSessionButton, 'Refreshing...');
    const restoreVerify = setBusy(elements.recheckVerificationButton, 'Checking...');

    try {
        await state.currentUser.reload();
        await state.currentUser.getIdToken(true);
        const status = await syncSession(state.auth.currentUser, state, elements);

        if (status === 'guest' || status === 'admin') {
            setBanner(elements, 'Email verification confirmed. Access refreshed.', 'success');
        } else if (status === 'verification-required') {
            setBanner(elements, 'The account is still not showing as verified. If you just clicked the email link, wait a moment and try again.', 'info');
        }
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    } finally {
        restore();
        restoreVerify();
    }
}

async function handleSignOut(state, elements) {
    if (!state.auth) {
        return;
    }

    try {
        await signOut(state.auth);
        state.bankDetailsVisible = false;
        updateBankDetailsVisibility(state, elements);
        setBanner(elements, 'You have been signed out.', 'success');
        elements.rsvpSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    }
}

function renderWeddingFundDetails(state, elements) {
    const fund = appConfig.weddingFund || {};
    const bankName = fund.bankName?.trim() || 'Add bank name in app-config.js';
    const accountName = fund.accountName?.trim() || 'Add account name in app-config.js';
    const sortCode = fund.sortCode?.trim() || 'Add sort code in app-config.js';
    const accountNumber = fund.accountNumber?.trim() || 'Add account number in app-config.js';

    elements.fundBankName.textContent = bankName;
    elements.fundAccountName.textContent = accountName;
    elements.fundSortCode.textContent = sortCode;
    elements.fundAccountNumber.textContent = accountNumber;
    updateBankDetailsVisibility(state, elements);
}

function updateBankDetailsVisibility(state, elements) {
    elements.sensitiveBankDetails.classList.toggle('hidden', !state.bankDetailsVisible);
    elements.toggleBankDetailsButton.textContent = state.bankDetailsVisible
        ? 'Hide Protected Bank Details'
        : 'Click To Show Bank Details';
}

async function loadGuestRsvp(state, elements, user) {
    prefillIdentityFields(elements, user);

    try {
        const snapshot = await getDoc(doc(state.db, 'rsvps', user.uid));

        if (!snapshot.exists()) {
            state.existingRsvp = null;
            resetRsvpForm(elements, user);
            renderGuestSubmissionState(state, elements, user);
            return;
        }

        state.existingRsvp = snapshot.data();
        renderGuestSubmissionState(state, elements, user);
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'guest-rsvp-load'), 'error');
    }
}

function resetRsvpForm(elements, user) {
    elements.rsvpForm.reset();
    clearRadioGroup(elements.attendingRadios);
    clearRadioGroup(elements.accommodationInterestFields);
    elements.guestCountField.value = '1';
    elements.childrenCountField.value = '0';
    elements.accommodationCountField.value = '';
    prefillIdentityFields(elements, user);
    updateAttendingFields(false, elements);
    hideSuccessMessage(elements);
    elements.rsvpForm.classList.remove('hidden');
    elements.submitRsvpButton.textContent = 'Save RSVP';
}

function renderGuestSubmissionState(state, elements, user) {
    const hasExistingRsvp = Boolean(state.existingRsvp);

    elements.rsvpForm.classList.toggle('hidden', hasExistingRsvp);

    if (!hasExistingRsvp) {
        elements.rsvpPanelTitle.textContent = 'RSVP';
        elements.rsvpPanelIntro.textContent = 'Please respond by the date provided in your invitation. If you are attending, do also let us know whether you might want college accommodation.';
        hideSuccessMessage(elements);
        return;
    }

    const firstName = state.existingRsvp?.firstName || splitName('', '', user?.displayName || '').firstName || 'there';
    const recordedCopy = state.existingRsvp?.attending === 'yes'
        ? `${firstName}, your response is on file. We cannot wait to celebrate with you.`
        : `${firstName}, your response is on file. We appreciate you letting us know.`;
    elements.rsvpPanelTitle.textContent = 'Your Response Has Been Recorded';
    elements.rsvpPanelIntro.textContent = 'We have safely recorded your response and there is nothing further you need to do here.';
    showSuccessMessage(
        elements,
        {
            heading: 'RSVP Received',
            message: recordedCopy,
            note: 'If you would also like to mark the occasion with a contribution, the wedding fund details remain available alongside this message, though please feel no pressure at all.'
        }
    );
}

async function handleRsvpSubmit(event, state, elements) {
    event.preventDefault();

    if (!state.currentUser || !state.currentUser.emailVerified) {
        setBanner(elements, 'You must be signed in with a verified email address before saving an RSVP.', 'error');
        return;
    }

    if (state.existingRsvp) {
        renderGuestSubmissionState(state, elements, state.currentUser);
        setBanner(elements, 'Your response has already been recorded. If anything important has changed, please contact the couple directly.', 'info');
        return;
    }

    const attendingSelection = document.querySelector('input[name="attending"]:checked');
    if (!attendingSelection) {
        setBanner(elements, 'Please tell us whether you will be attending.', 'error');
        return;
    }

    const isAttending = attendingSelection.value === 'yes';
    const fullName = `${elements.firstName.value.trim()} ${elements.lastName.value.trim()}`.trim();
    const restore = setBusy(elements.submitRsvpButton, 'Saving RSVP...');

    const payload = {
        uid: state.currentUser.uid,
        displayName: state.currentUser.displayName || fullName,
        firstName: elements.firstName.value.trim(),
        lastName: elements.lastName.value.trim(),
        email: state.currentUser.email || elements.email.value.trim(),
        phone: elements.phone.value.trim(),
        attending: attendingSelection.value,
        guestCount: isAttending ? elements.guestCountField.value : '0',
        childrenCount: isAttending ? elements.childrenCountField.value : '0',
        guestNames: isAttending ? elements.guestNamesField.value.trim() : '',
        childrenAges: isAttending ? elements.childrenAgesField.value.trim() : '',
        dietary: isAttending ? elements.dietaryField.value.trim() : '',
        accessibility: isAttending ? elements.accessibilityField.value.trim() : '',
        accommodationInterest: isAttending
            ? (document.querySelector('input[name="accommodationInterest"]:checked') || {}).value || ''
            : '',
        accommodationCount: isAttending ? elements.accommodationCountField.value : '',
        songRequest: isAttending ? elements.songRequestField.value.trim() : '',
        message: elements.messageField.value.trim(),
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(state.db, 'rsvps', state.currentUser.uid), payload);
        await loadGuestRsvp(state, elements, state.currentUser);
        setBanner(elements, 'Your RSVP has been received and recorded.', 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'guest-rsvp-save'), 'error');
    } finally {
        restore();
    }
}

async function handleAdminDonationSubmit(event, donationForm, state, elements) {
    event.preventDefault();

    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to update donations.', 'error');
        return;
    }

    const rsvpId = donationForm.dataset.donationForm;
    const household = donationForm.dataset.household || 'this RSVP';
    const input = donationForm.querySelector('input[name="donationAmount"]');
    const submitButton = donationForm.querySelector('button[type="submit"]');
    const rawValue = input.value.trim();

    if (rawValue !== '') {
        const parsed = Number.parseFloat(rawValue);

        if (Number.isNaN(parsed) || parsed < 0) {
            setBanner(elements, 'Please enter a valid donation amount or leave it blank.', 'error');
            return;
        }
    }

    const donationAmount = rawValue === '' ? null : Number.parseFloat(Number.parseFloat(rawValue).toFixed(2));
    const restore = setBusy(submitButton, 'Saving...');

    try {
        await updateDoc(doc(state.db, 'rsvps', rsvpId), {
            donationAmount,
            donationUpdatedAt: serverTimestamp()
        });
        setBanner(elements, `Saved the recorded donation for ${household}.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleAdminDelete(deleteButton, state, elements) {
    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to delete RSVPs.', 'error');
        return;
    }

    const rsvpId = deleteButton.dataset.deleteRsvp;
    const household = deleteButton.dataset.household || 'this RSVP';
    const confirmed = window.confirm(`Delete the RSVP for ${household}? This cannot be undone.`);

    if (!confirmed) {
        return;
    }

    const restore = setBusy(deleteButton, 'Deleting...');

    try {
        await deleteDoc(doc(state.db, 'rsvps', rsvpId));
        state.adminEntries = state.adminEntries.filter((entry) => entry.id !== rsvpId);
        renderAdminEntries(state.adminEntries, state, elements);
        setBanner(elements, `Deleted the RSVP for ${household}.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleGrantAdmin(grantButton, state, elements) {
    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to grant admin roles.', 'error');
        return;
    }

    const targetUid = grantButton.dataset.grantAdmin;
    const targetEmail = grantButton.dataset.email || '';
    const targetName = grantButton.dataset.name || targetEmail || 'this verified user';
    const restore = setBusy(grantButton, 'Granting...');

    try {
        await setDoc(doc(state.db, 'admins', targetUid), {
            uid: targetUid,
            email: targetEmail,
            displayName: targetName,
            grantedAt: serverTimestamp(),
            grantedBy: state.currentUser?.uid || ''
        }, { merge: true });
        setBanner(elements, `${targetName} can now use the admin dashboard after refreshing their session.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleRevokeAdmin(revokeButton, state, elements) {
    if (!state.isAdmin || !isBootstrapCurrentAdmin(state)) {
        setBanner(elements, 'Only antiret@gmail.com can revoke admin status.', 'error');
        return;
    }

    const targetUid = revokeButton.dataset.revokeAdmin;
    const targetEmail = revokeButton.dataset.email || '';
    const targetName = revokeButton.dataset.name || targetEmail || 'this admin';

    if (targetUid === state.currentUser?.uid || isBootstrapAdminEmail(targetEmail)) {
        setBanner(elements, 'That admin role cannot be revoked from this account.', 'error');
        return;
    }

    const confirmed = window.confirm(`Revoke admin status for ${targetName}? They will keep normal website access unless you remove it separately.`);

    if (!confirmed) {
        return;
    }

    const restore = setBusy(revokeButton, 'Revoking...');

    try {
        await deleteDoc(doc(state.db, 'admins', targetUid));
        state.grantedAdmins = state.grantedAdmins.filter((entry) => (entry.uid || entry.id) !== targetUid);
        renderAdminEntries(state.adminEntries, state, elements);
        setBanner(elements, `${targetName} no longer has admin access.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleRemoveUser(removeButton, state, elements) {
    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to remove users.', 'error');
        return;
    }

    const targetUid = removeButton.dataset.removeUser;
    const targetEmail = removeButton.dataset.email || '';
    const targetName = removeButton.dataset.name || targetEmail || 'this user';

    if (targetUid === state.currentUser?.uid) {
        setBanner(elements, 'You cannot remove the account you are currently using.', 'error');
        return;
    }

    if (isBootstrapAdminEmail(targetEmail)) {
        setBanner(elements, 'That fixed admin account cannot be removed from the website.', 'error');
        return;
    }

    const confirmed = window.confirm(`Remove ${targetName} from the site? This will revoke their access and any admin role they currently have.`);

    if (!confirmed) {
        return;
    }

    const restore = setBusy(removeButton, 'Removing...');

    try {
        await setDoc(doc(state.db, 'blockedUsers', targetUid), {
            uid: targetUid,
            email: targetEmail,
            displayName: targetName,
            blockedAt: serverTimestamp(),
            blockedBy: state.currentUser?.uid || ''
        }, { merge: true });

        if (isBootstrapCurrentAdmin(state) && isGrantedAdminProfile({ uid: targetUid }, state)) {
            await deleteDoc(doc(state.db, 'admins', targetUid));
        }

        upsertLocalBlockedUser(state, {
            uid: targetUid,
            email: targetEmail,
            displayName: targetName,
            blockedAt: new Date(),
            blockedBy: state.currentUser?.uid || ''
        });
        state.grantedAdmins = state.grantedAdmins.filter((entry) => (entry.uid || entry.id) !== targetUid);
        renderAdminEntries(state.adminEntries, state, elements);
        setBanner(elements, `${targetName} has been removed from the website.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleRestoreUser(restoreButton, state, elements) {
    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to restore users.', 'error');
        return;
    }

    const targetUid = restoreButton.dataset.restoreUser;
    const targetName = restoreButton.dataset.name || 'this user';
    const restore = setBusy(restoreButton, 'Restoring...');

    try {
        await deleteDoc(doc(state.db, 'blockedUsers', targetUid));
        state.blockedUsers = state.blockedUsers.filter((entry) => (entry.uid || entry.id) !== targetUid);
        renderAdminEntries(state.adminEntries, state, elements);
        setBanner(elements, `${targetName} can access the website again.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

async function handleClearRsvp(clearButton, state, elements) {
    if (!state.isAdmin) {
        setBanner(elements, 'Admin access is required to clear RSVPs.', 'error');
        return;
    }

    const targetUid = clearButton.dataset.clearRsvp;
    const rsvpDocId = clearButton.dataset.rsvpDocId || targetUid;
    const targetName = clearButton.dataset.name || 'this user';
    const confirmed = window.confirm(`Clear the RSVP for ${targetName}? This removes their saved response but does not remove website access.`);

    if (!confirmed) {
        return;
    }

    const restore = setBusy(clearButton, 'Clearing...');

    try {
        await deleteDoc(doc(state.db, 'rsvps', rsvpDocId));
        state.adminEntries = state.adminEntries.filter((entry) => entry.id !== rsvpDocId && (entry.uid || entry.id) !== targetUid);
        renderAdminEntries(state.adminEntries, state, elements);
        setBanner(elements, `Cleared the RSVP for ${targetName}.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error, 'admin-action'), 'error');
    } finally {
        restore();
    }
}

function bindFormVisibilityHandlers(elements) {
    elements.attendingRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
            updateAttendingFields(radio.value === 'yes', elements);
        });
    });

    elements.guestCountField.addEventListener('change', () => updateGuestDetailsRequirements(elements));
    elements.childrenCountField.addEventListener('change', () => updateGuestDetailsRequirements(elements));
    elements.accommodationInterestFields.forEach((field) => {
        field.addEventListener('change', () => updateAccommodationRequirements(elements));
    });
}

function setGroupVisibility(group, isVisible) {
    group.classList.toggle('hidden', !isVisible);
}

function updateGuestDetailsRequirements(elements) {
    const guestCount = parseInt(elements.guestCountField.value, 10);
    const childrenCount = parseInt(elements.childrenCountField.value, 10);
    const hasAdditionalGuests = guestCount > 1 || childrenCount > 0;

    elements.guestNamesField.required = hasAdditionalGuests;
    elements.childrenAgesField.required = childrenCount > 0;
}

function updateAccommodationRequirements(elements) {
    const selectedAccommodation = document.querySelector('input[name="accommodationInterest"]:checked');
    const mayNeedAccommodation = selectedAccommodation &&
        (selectedAccommodation.value === 'yes' || selectedAccommodation.value === 'maybe');

    setGroupVisibility(elements.accommodationCountGroup, Boolean(mayNeedAccommodation));
    elements.accommodationCountField.required = Boolean(mayNeedAccommodation);

    if (!mayNeedAccommodation) {
        elements.accommodationCountField.value = '';
    }
}

function resetAttendingDetails(elements) {
    elements.guestCountField.value = '1';
    elements.childrenCountField.value = '0';
    elements.guestNamesField.value = '';
    elements.childrenAgesField.value = '';
    elements.dietaryField.value = '';
    elements.accessibilityField.value = '';
    elements.accommodationCountField.value = '';
    elements.songRequestField.value = '';
    clearRadioGroup(elements.accommodationInterestFields);
}

function updateAttendingFields(isAttending, elements) {
    setGroupVisibility(elements.guestCountGroup, isAttending);
    setGroupVisibility(elements.childrenGroup, isAttending);
    setGroupVisibility(elements.guestNamesGroup, isAttending);
    setGroupVisibility(elements.childrenAgesGroup, isAttending);
    setGroupVisibility(elements.dietaryGroup, isAttending);
    setGroupVisibility(elements.accessibilityGroup, isAttending);
    setGroupVisibility(elements.accommodationInterestGroup, isAttending);
    setGroupVisibility(elements.songRequestGroup, isAttending);

    elements.guestCountField.required = isAttending;
    elements.dietaryField.required = isAttending;
    elements.accommodationInterestFields.forEach((field) => {
        field.required = isAttending;
    });

    if (isAttending) {
        updateGuestDetailsRequirements(elements);
        updateAccommodationRequirements(elements);
        return;
    }

    elements.guestNamesField.required = false;
    elements.childrenAgesField.required = false;
    elements.accommodationCountField.required = false;
    setGroupVisibility(elements.accommodationCountGroup, false);
    resetAttendingDetails(elements);
}

function prefillIdentityFields(elements, user) {
    const { firstName, lastName } = splitName('', '', user?.displayName || '');

    if (!elements.firstName.value) {
        elements.firstName.value = firstName;
    }

    if (!elements.lastName.value) {
        elements.lastName.value = lastName;
    }

    elements.email.value = user?.email || '';
    elements.email.readOnly = true;
}

function splitName(firstName, lastName, displayName) {
    if (firstName || lastName) {
        return { firstName: firstName || '', lastName: lastName || '' };
    }

    const trimmed = (displayName || '').trim();
    if (!trimmed) {
        return { firstName: '', lastName: '' };
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function setRadioValue(fields, value) {
    fields.forEach((field) => {
        field.checked = field.value === value;
    });
}

function clearRadioGroup(fields) {
    fields.forEach((field) => {
        field.checked = false;
    });
}

function attachStaticInteractions(elements) {
    const ctaButton = elements.heroGuestLoginButton;
    if (ctaButton) {
        ctaButton.addEventListener('click', (event) => {
            event.preventDefault();
            document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth' });
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.story, .details, .rsvp').forEach((section) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
}

function subscribeToAdminData(state, elements) {
    clearAdminSubscriptions(state);

    const rsvpQuery = query(collection(state.db, 'rsvps'), orderBy('updatedAt', 'desc'));

    state.adminRsvpUnsubscribe = onSnapshot(rsvpQuery, (snapshot) => {
        state.adminEntries = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        }));

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error, 'admin-dashboard'), 'error');
    });

    state.adminProfilesUnsubscribe = onSnapshot(collection(state.db, 'profiles'), (snapshot) => {
        state.verifiedProfiles = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        })).sort((left, right) => {
            return (left.displayName || left.email || '').localeCompare(right.displayName || right.email || '');
        });

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error, 'admin-dashboard'), 'error');
    });

    state.adminRolesUnsubscribe = onSnapshot(collection(state.db, 'admins'), (snapshot) => {
        state.grantedAdmins = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        }));

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error, 'admin-dashboard'), 'error');
    });

    state.adminBlockedUnsubscribe = onSnapshot(collection(state.db, 'blockedUsers'), (snapshot) => {
        state.blockedUsers = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        }));

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error, 'admin-dashboard'), 'error');
    });
}

function clearAdminSubscriptions(state) {
    [
        state.adminRsvpUnsubscribe,
        state.adminProfilesUnsubscribe,
        state.adminRolesUnsubscribe,
        state.adminBlockedUnsubscribe
    ].forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });

    state.adminRsvpUnsubscribe = null;
    state.adminProfilesUnsubscribe = null;
    state.adminRolesUnsubscribe = null;
    state.adminBlockedUnsubscribe = null;
}

function renderAdminEntries(entries, state, elements) {
    const displayEntries = getDisplayAdminEntries(entries);

    elements.adminRsvpCount.textContent = String(displayEntries.length);
    renderAdminAccess(state, elements);
    renderAdminSummary(displayEntries, elements);
    elements.adminList.innerHTML = displayEntries.map((entry) => buildAdminCard(entry, state)).join('');
    elements.adminTableBody.innerHTML = displayEntries.map((entry) => buildAdminTableRow(entry, state)).join('');

    if (!displayEntries.length) {
        elements.adminEmptyState.classList.remove('hidden');
    } else {
        elements.adminEmptyState.classList.add('hidden');
    }

    applyAdminView(state.adminViewMode, elements);
}

function getDisplayAdminEntries(entries) {
    return [
        ...(entries || []),
        ...FIXED_HOST_RESPONSES
    ];
}

function renderAdminAccess(state, elements) {
    const profiles = getAdminAccessProfiles(state);

    if (!profiles.length) {
        elements.adminAccessEmptyState.classList.remove('hidden');
        elements.adminAccessList.innerHTML = '';
        return;
    }

    elements.adminAccessEmptyState.classList.add('hidden');
    elements.adminAccessList.innerHTML = profiles.map((profile) => buildAdminAccessRow(profile, state)).join('');
}

function buildAdminAccessRow(profile, state) {
    const uid = profile.uid || profile.id;
    const email = profile.email || '';
    const isGrantedAdmin = isGrantedAdminProfile(profile, state);
    const isBootstrapAdmin = isBootstrapAdminEmail(email);
    const isAnyAdmin = isGrantedAdmin || isBootstrapAdmin;
    const isCurrentSession = uid === state.currentUser?.uid;
    const isBlocked = isBlockedUserProfile(profile, state);
    const canRevokeAdmin = isBootstrapCurrentAdmin(state) && isGrantedAdmin && !isBootstrapAdmin && !isCurrentSession;
    const statusLabel = isBlocked
        ? 'Access Removed'
        : isBootstrapAdmin
            ? 'Fixed Admin'
            : isGrantedAdmin
                ? 'Admin Granted'
                : profile.hasProfile
                    ? 'Verified User'
                    : profile.hasRsvp
                        ? 'RSVP On File'
                        : 'User';
    const buttonMarkup = isBlocked
        ? '<span class="status-pill">Access Removed</span>'
        : isAnyAdmin
            ? '<span class="status-pill status-pill-admin">Already Admin</span>'
            : `<button type="button" class="inline-button" data-grant-admin="${escapeHtml(uid)}" data-email="${escapeHtml(email)}" data-name="${escapeHtml(profile.displayName || email || 'Verified user')}">Make Admin</button>`;
    const revokeAdminMarkup = canRevokeAdmin
        ? `<button type="button" class="ghost-button" data-revoke-admin="${escapeHtml(uid)}" data-email="${escapeHtml(email)}" data-name="${escapeHtml(profile.displayName || email || 'This admin')}">Revoke Admin</button>`
        : '';
    const removeMarkup = isBlocked
        ? `<button type="button" class="inline-button" data-restore-user="${escapeHtml(uid)}" data-name="${escapeHtml(profile.displayName || email || 'This user')}">Restore Access</button>`
        : (isBootstrapAdmin || isCurrentSession)
        ? `<span class="status-pill ${isCurrentSession ? 'status-pill-admin' : ''}">${escapeHtml(isCurrentSession ? 'Current Session' : 'Protected')}</span>`
        : `<button type="button" class="danger-button" data-remove-user="${escapeHtml(uid)}" data-email="${escapeHtml(email)}" data-name="${escapeHtml(profile.displayName || email || 'Verified user')}">Remove Access</button>`;
    const clearRsvpMarkup = profile.hasRsvp
        ? `<button type="button" class="ghost-button" data-clear-rsvp="${escapeHtml(uid)}" data-rsvp-doc-id="${escapeHtml(profile.rsvpDocId || uid)}" data-name="${escapeHtml(profile.displayName || email || 'This user')}">Clear RSVP</button>`
        : '';
    const provenanceCopy = profile.hasProfile
        ? `Last seen ${escapeHtml(formatTimestamp(profile.lastSeenAt))}`
        : profile.hasRsvp
            ? `RSVP saved ${escapeHtml(formatTimestamp(profile.lastSeenAt))}`
            : `Last updated ${escapeHtml(formatTimestamp(profile.lastSeenAt))}`;
    const accessCopy = isBlocked
        ? `Access removed ${escapeHtml(formatTimestamp(profile.blockedAt || profile.lastSeenAt))}`
        : profile.hasRsvp && !profile.hasProfile
            ? 'Visible here because an RSVP exists for this account.'
            : 'Signed in with a verified email address.';

    return `
        <article class="admin-access-row">
            <div class="admin-access-meta">
                <strong>${escapeHtml(profile.displayName || email || 'Verified user')}</strong>
                <div class="admin-access-copy">${escapeHtml(email || 'No email recorded')}</div>
                <div class="admin-access-copy">${provenanceCopy}</div>
                <div class="admin-access-copy">${accessCopy}</div>
            </div>
            <div class="admin-access-actions">
                <span class="status-pill ${isAnyAdmin ? 'status-pill-admin' : ''}">${escapeHtml(statusLabel)}</span>
                ${buttonMarkup}
                ${revokeAdminMarkup}
                ${clearRsvpMarkup}
                ${removeMarkup}
            </div>
        </article>
    `;
}

function getAdminAccessProfiles(state) {
    const merged = new Map();

    (state.verifiedProfiles || []).forEach((profile) => {
        mergeAdminAccessProfile(merged, profile, 'profile');
    });

    (state.adminEntries || []).forEach((entry) => {
        mergeAdminAccessProfile(merged, {
            uid: entry.uid || entry.id,
            email: entry.email || '',
            displayName: buildHouseholdName(entry),
            lastSeenAt: entry.updatedAt || entry.submittedAt
        }, 'rsvp');
    });

    (state.grantedAdmins || []).forEach((entry) => {
        mergeAdminAccessProfile(merged, entry, 'admin');
    });

    (state.blockedUsers || []).forEach((entry) => {
        mergeAdminAccessProfile(merged, entry, 'blocked');
    });

    return Array.from(merged.values()).sort((left, right) => {
        if (left.isBlocked !== right.isBlocked) {
            return left.isBlocked ? 1 : -1;
        }

        return (left.displayName || left.email || '').localeCompare(right.displayName || right.email || '');
    });
}

function mergeAdminAccessProfile(map, entry, source) {
    const uid = entry.uid || entry.id || '';
    const email = (entry.email || '').trim();
    const key = uid || (email ? `email:${email.toLowerCase()}` : '');

    if (!key) {
        return;
    }

    const existing = map.get(key) || {
        uid: uid || '',
        email: email || '',
        displayName: '',
        lastSeenAt: null,
        blockedAt: null,
        hasProfile: false,
        hasRsvp: false,
        rsvpDocId: '',
        hasAdminRole: false,
        isBlocked: false
    };

    const candidateName = (entry.displayName || `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || email).trim();
    const merged = {
        ...existing,
        uid: existing.uid || uid,
        email: existing.email || email,
        displayName: existing.displayName || candidateName || existing.email || 'Verified user',
        lastSeenAt: pickLaterTimestamp(existing.lastSeenAt, entry.lastSeenAt || entry.updatedAt || entry.submittedAt || entry.grantedAt || entry.blockedAt),
        blockedAt: source === 'blocked'
            ? pickLaterTimestamp(existing.blockedAt, entry.blockedAt)
            : existing.blockedAt,
        hasProfile: existing.hasProfile || source === 'profile',
        hasRsvp: existing.hasRsvp || source === 'rsvp',
        rsvpDocId: existing.rsvpDocId || (source === 'rsvp' ? (entry.id || entry.uid || '') : ''),
        hasAdminRole: existing.hasAdminRole || source === 'admin',
        isBlocked: existing.isBlocked || source === 'blocked'
    };

    map.set(key, merged);
}

function isGrantedAdminProfile(profile, state) {
    const uid = profile.uid || profile.id;
    return (state.grantedAdmins || []).some((entry) => (entry.uid || entry.id) === uid);
}

function isBootstrapAdminEmail(email) {
    const configuredAdminEmails = (appConfig.adminEmails || []).map((entry) => entry.trim().toLowerCase());
    return configuredAdminEmails.includes((email || '').trim().toLowerCase());
}

function isBootstrapCurrentAdmin(state) {
    return isBootstrapAdminEmail(state.currentUser?.email || '');
}

function isBlockedUserProfile(profile, state) {
    const uid = profile.uid || profile.id;
    return (state.blockedUsers || []).some((entry) => (entry.uid || entry.id) === uid);
}

function upsertLocalBlockedUser(state, blockedEntry) {
    const uid = blockedEntry.uid || blockedEntry.id;

    if (!uid) {
        return;
    }

    const remaining = (state.blockedUsers || []).filter((entry) => (entry.uid || entry.id) !== uid);
    state.blockedUsers = [
        ...remaining,
        blockedEntry
    ];
}

function pickLaterTimestamp(currentValue, candidateValue) {
    return toTimestampMillis(candidateValue) > toTimestampMillis(currentValue)
        ? candidateValue
        : currentValue;
}

function toTimestampMillis(value) {
    if (!value) {
        return -1;
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().getTime();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? -1 : parsed.getTime();
}

function renderAdminSummary(entries, elements) {
    const attendingEntries = entries.filter((entry) => entry.attending === 'yes');
    const declineEntries = entries.filter((entry) => entry.attending === 'no');
    const accommodationEntries = attendingEntries.filter((entry) => ['yes', 'maybe'].includes((entry.accommodationInterest || '').toLowerCase()));
    const guestsExpected = attendingEntries.reduce((sum, entry) => sum + getPartySize(entry), 0);
    const donationEntries = entries.filter((entry) => getDonationNumber(entry.donationAmount) !== null);
    const totalDonations = donationEntries.reduce((sum, entry) => sum + (getDonationNumber(entry.donationAmount) || 0), 0);
    const latestEntry = entries[0] || null;

    elements.adminSummaryGrid.innerHTML = [
        buildSummaryCard('Total Responses', entries.length, 'Households with a saved RSVP on file.'),
        buildSummaryCard('Attending', attendingEntries.length, 'Households currently marked as attending.'),
        buildSummaryCard('Declines', declineEntries.length, 'Households that have regretfully declined.'),
        buildSummaryCard('Guests Expected', guestsExpected, 'Adults and children expected based on accepted RSVPs.'),
        buildSummaryCard('Accommodation Interest', accommodationEntries.length, 'Households that may want college rooms.'),
        buildSummaryCard('Recorded Gifts', formatCurrency(totalDonations), donationEntries.length ? `${donationEntries.length} households have a recorded donation amount.` : 'No donation amounts have been entered yet.')
    ].join('');

    elements.adminSummaryHighlights.innerHTML = [
        buildSummaryHighlight(
            'Attendance Snapshot',
            [
                { label: 'Accepted households', value: attendingEntries.length },
                { label: 'Declined households', value: declineEntries.length },
                { label: 'College stay interest', value: accommodationEntries.length }
            ]
        ),
        buildSummaryHighlight(
            'Latest Activity',
            latestEntry
                ? [
                    { label: 'Most recent response', value: buildHouseholdName(latestEntry) },
                    { label: 'Last updated', value: formatTimestamp(latestEntry.updatedAt || latestEntry.submittedAt) },
                    { label: 'Recorded gift total', value: formatCurrency(totalDonations) }
                ]
                : [
                    { label: 'Most recent response', value: '--' },
                    { label: 'Last updated', value: '--' },
                    { label: 'Recorded gift total', value: formatCurrency(0) }
                ]
        )
    ].join('');
}

function applyAdminView(mode, elements) {
    const normalizedMode = ['summary', 'responses', 'table'].includes(mode) ? mode : 'summary';

    elements.adminViewButtons.forEach((button) => {
        const isActive = button.dataset.adminView === normalizedMode;
        button.classList.toggle('admin-view-button-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });

    elements.adminSummaryView.classList.toggle('hidden', normalizedMode !== 'summary');
    elements.adminResponsesView.classList.toggle('hidden', normalizedMode !== 'responses');
    elements.adminTableView.classList.toggle('hidden', normalizedMode !== 'table');
}

function openAdminDashboard(target, state, elements) {
    if (!state.isAdmin) {
        return;
    }

    const normalizedTarget = ['access', 'summary', 'responses', 'table'].includes(target) ? target : 'summary';

    if (normalizedTarget !== 'access') {
        state.adminViewMode = normalizedTarget;
        applyAdminView(state.adminViewMode, elements);
    }

    elements.guestView.classList.add('hidden');
    elements.adminView.classList.remove('hidden');
    elements.openGuestAreaButton.classList.add('hidden');
    elements.openGuestPreviewButton.classList.remove('hidden');
    elements.openDashboardButton.classList.remove('hidden');
    elements.returnToAdminViewButton.classList.add('hidden');

    const scrollTarget = getAdminScrollTarget(normalizedTarget, elements);

    window.requestAnimationFrame(() => {
        scrollTarget.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        if (normalizedTarget === 'access') {
            elements.adminAccessPanel?.focus?.({ preventScroll: true });
            return;
        }

        elements.adminDashboardTitle?.focus?.({ preventScroll: true });
    });
}

function openGuestArea(elements) {
    window.requestAnimationFrame(() => {
        elements.guestView.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        elements.guestAreaTitle?.focus?.({ preventScroll: true });
    });
}

async function openGuestExperience(state, elements) {
    if (state.isAdmin && state.currentUser) {
        await loadGuestRsvp(state, elements, state.currentUser);
        elements.adminView.classList.add('hidden');
        elements.guestView.classList.remove('hidden');
        elements.openGuestAreaButton.classList.add('hidden');
        elements.openGuestPreviewButton.classList.remove('hidden');
        elements.openDashboardButton.classList.remove('hidden');
        elements.returnToAdminViewButton.classList.remove('hidden');
        openGuestArea(elements);
        return;
    }

    openGuestArea(elements);
}

function getAdminScrollTarget(target, elements) {
    switch (target) {
    case 'access':
        return elements.adminAccessPanel || elements.adminView;
    case 'responses':
        return elements.adminResponsesView || elements.adminView;
    case 'table':
        return elements.adminTableView || elements.adminView;
    case 'summary':
    default:
        return elements.adminView;
    }
}

function buildSummaryCard(title, value, copy) {
    return `
        <article class="admin-summary-card">
            <p class="card-eyebrow">${escapeHtml(title)}</p>
            <div class="admin-summary-number">${escapeHtml(String(value))}</div>
            <p class="admin-summary-copy">${escapeHtml(copy)}</p>
        </article>
    `;
}

function buildSummaryHighlight(title, items) {
    const itemMarkup = items.map((item) => `
        <div class="admin-summary-item">
            <span>${escapeHtml(String(item.label))}</span>
            <strong>${escapeHtml(String(item.value))}</strong>
        </div>
    `).join('');

    return `
        <article class="admin-summary-highlight">
            <p class="card-eyebrow">Overview</p>
            <h4>${escapeHtml(title)}</h4>
            <div class="admin-summary-list">${itemMarkup}</div>
        </article>
    `;
}

function buildAdminCard(entry, state) {
    const household = buildHouseholdName(entry);
    const guestCount = entry.guestCount && entry.guestCount !== '0' ? entry.guestCount : '--';
    const childrenCount = entry.childrenCount && entry.childrenCount !== '0' ? entry.childrenCount : '0';
    const status = entry.attending === 'yes' ? 'Attending' : 'Declines';
    const submittedLabel = entry.isFixedResponse
        ? 'Included'
        : entry.updatedAt
            ? 'Updated'
            : 'Submitted';
    const submittedValue = entry.isFixedResponse
        ? 'Counted automatically'
        : formatTimestamp(entry.updatedAt || entry.submittedAt);
    const toolbarMarkup = entry.isFixedResponse
        ? `
            <div class="admin-entry-toolbar">
                <p class="admin-entry-toolbar-copy">Included automatically so the couple are counted in the adult attendance total. No RSVP details are required here.</p>
            </div>
        `
        : `
            <div class="admin-entry-toolbar">
                <p class="admin-entry-toolbar-copy">Record the amount received in the bank account here, remove this RSVP if it was entered in error, or revoke the guest's website access directly from the same row.</p>
                <div class="admin-entry-actions">
                    ${buildDonationForm(entry)}
                    <button type="button" class="danger-button" data-delete-rsvp="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">Delete RSVP Only</button>
                    ${buildUserAccessAction(entry, state)}
                </div>
            </div>
        `;

    return `
        <article class="admin-entry">
            <div class="admin-entry-header">
                <div>
                    <span class="detail-badge">${escapeHtml(status)}</span>
                    <h4>${escapeHtml(household)}</h4>
                </div>
                <div class="admin-entry-meta">
                    <div>${escapeHtml(entry.isFixedResponse ? 'Fixed host entry' : (entry.email || 'No email provided'))}</div>
                    <div>${escapeHtml(submittedLabel)} ${escapeHtml(submittedValue)}</div>
                </div>
            </div>

            ${toolbarMarkup}

            <dl class="admin-entry-grid">
                ${detailPair('Phone', entry.phone)}
                ${detailPair('Adults', guestCount)}
                ${detailPair('Children', childrenCount)}
                ${detailPair('Recorded Gift', formatDonationValue(entry.donationAmount))}
                ${detailPair('Additional Guests', entry.guestNames)}
                ${detailPair('Children\'s Ages', entry.childrenAges)}
                ${detailPair('Dietary Needs', entry.dietary)}
                ${detailPair('Accessibility', entry.accessibility)}
                ${detailPair('Accommodation Interest', entry.accommodationInterest)}
                ${detailPair('Accommodation Count', entry.accommodationCount)}
                ${detailPair('Song Request', entry.songRequest)}
                ${detailPair('Message', entry.message)}
            </dl>
        </article>
    `;
}

function buildAdminTableRow(entry, state) {
    const household = buildHouseholdName(entry);
    const status = entry.attending === 'yes' ? 'Attending' : 'Declines';
    const partySize = formatPartySummary(entry);
    const accommodation = formatAccommodationSummary(entry);
    const giftCell = entry.isFixedResponse ? '<span class="status-pill">Host</span>' : buildCompactDonationForm(entry);
    const actionCell = entry.isFixedResponse
        ? '<span class="status-pill">Fixed Entry</span>'
        : `
                <div class="admin-table-actions">
                    <button type="button" class="danger-button" data-delete-rsvp="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">Delete</button>
                    ${buildUserAccessAction(entry, state, { compact: true })}
                </div>
            `;
    const whenValue = entry.isFixedResponse ? '--' : formatCompactTimestamp(entry.updatedAt || entry.submittedAt);

    return `
        <tr>
            <td class="admin-table-guest">
                <strong>${escapeHtml(household)}</strong>
                <div class="admin-table-meta">${escapeHtml(entry.isFixedResponse ? 'Fixed host entry' : (entry.email || 'No email provided'))}</div>
            </td>
            <td>${escapeHtml(status)}</td>
            <td>${escapeHtml(partySize)}</td>
            <td>${escapeHtml(accommodation)}</td>
            <td>${giftCell}</td>
            <td>${escapeHtml(whenValue)}</td>
            <td>${actionCell}</td>
        </tr>
    `;
}

function buildUserAccessAction(entry, state, options = {}) {
    const uid = entry.uid || entry.id || '';
    const email = entry.email || '';
    const name = buildHouseholdName(entry);
    const isCurrentSession = uid === state.currentUser?.uid;
    const isBootstrapAdmin = isBootstrapAdminEmail(email);
    const isBlocked = isBlockedUserProfile({ uid }, state);
    const isCompact = options.compact === true;

    if (!uid) {
        return '<span class="status-pill">No Account ID</span>';
    }

    if (isBlocked) {
        return `<button type="button" class="inline-button" data-restore-user="${escapeHtml(uid)}" data-name="${escapeHtml(name)}">${isCompact ? 'Restore' : 'Restore Access'}</button>`;
    }

    if (isCurrentSession) {
        return '<span class="status-pill status-pill-admin">Current Session</span>';
    }

    if (isBootstrapAdmin) {
        return '<span class="status-pill">Protected</span>';
    }

    return `<button type="button" class="danger-button" data-remove-user="${escapeHtml(uid)}" data-email="${escapeHtml(email)}" data-name="${escapeHtml(name)}">${isCompact ? 'Block' : 'Remove Access'}</button>`;
}

function buildDonationForm(entry) {
    const household = buildHouseholdName(entry);
    const donationValue = getDonationNumber(entry.donationAmount);
    const inputValue = donationValue === null ? '' : donationValue.toFixed(2);

    return `
        <form class="admin-donation-form" data-donation-form="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">
            <div>
                <label for="donation-${escapeHtml(entry.id)}">Recorded gift (GBP)</label>
                <input id="donation-${escapeHtml(entry.id)}" type="number" name="donationAmount" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${escapeHtml(inputValue)}">
            </div>
            <button type="submit" class="inline-button">Save</button>
        </form>
    `;
}

function buildCompactDonationForm(entry) {
    const household = buildHouseholdName(entry);
    const donationValue = getDonationNumber(entry.donationAmount);
    const inputValue = donationValue === null ? '' : donationValue.toFixed(2);

    return `
        <form class="admin-donation-form admin-donation-form-compact" data-donation-form="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">
            <input aria-label="Recorded gift for ${escapeHtml(household)}" id="donation-compact-${escapeHtml(entry.id)}" type="number" name="donationAmount" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${escapeHtml(inputValue)}">
            <button type="submit" class="inline-button">Save</button>
        </form>
    `;
}

function formatPartySummary(entry) {
    if (entry.attending !== 'yes') {
        return '--';
    }

    return `${getAdultCount(entry)}A ${getChildCount(entry)}C`;
}

function formatAccommodationSummary(entry) {
    if (!entry.accommodationInterest) {
        return '--';
    }

    const base = capitalize(entry.accommodationInterest);
    return entry.accommodationCount ? `${base} ${entry.accommodationCount}` : base;
}

function detailPair(label, value) {
    const rendered = escapeHtml(normalizeValue(value));
    return `
        <div class="detail-pair">
            <dt>${escapeHtml(label)}</dt>
            <dd>${rendered}</dd>
        </div>
    `;
}

function buildHouseholdName(entry) {
    return `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || entry.displayName || entry.email || 'Unnamed guest';
}

function getAdultCount(entry) {
    return Math.max(parseCount(entry.guestCount), entry.attending === 'yes' ? 1 : 0);
}

function getChildCount(entry) {
    return parseCount(entry.childrenCount);
}

function getPartySize(entry) {
    return getAdultCount(entry) + getChildCount(entry);
}

function parseCount(value) {
    const parsed = Number.parseInt(value || '0', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getDonationNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function formatDonationValue(value) {
    const donation = getDonationNumber(value);
    return donation === null ? '--' : formatCurrency(donation);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(value || 0);
}

function normalizeValue(value) {
    if (value === undefined || value === null) {
        return '--';
    }

    const rendered = String(value).trim();
    return rendered || '--';
}

function capitalize(value) {
    if (!value) {
        return '--';
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTimestamp(value) {
    if (!value) {
        return 'just now';
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'just now';
    }

    return parsed.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCompactTimestamp(value) {
    if (!value) {
        return '--';
    }

    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showSuccessMessage(elements, content) {
    const config = typeof content === 'string'
        ? { message: content }
        : (content || {});

    elements.successMessageHeading.textContent = config.heading || 'Your Response Has Been Recorded';
    elements.successMessageText.textContent = config.message || 'Your response is safely on file.';
    elements.successMessageNote.textContent = config.note || '';
    elements.successMessageNote.classList.toggle('hidden', !config.note);
    elements.successMessage.classList.remove('hidden');
}

function hideSuccessMessage(elements) {
    elements.successMessageHeading.textContent = 'Your Response Has Been Recorded';
    elements.successMessageText.textContent = 'Your response is safely on file.';
    elements.successMessageNote.textContent = '';
    elements.successMessageNote.classList.add('hidden');
    elements.successMessage.classList.add('hidden');
}

function setBusy(button, busyLabel) {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel;

    return () => {
        button.disabled = false;
        button.textContent = originalLabel;
    };
}

function setBanner(elements, message, variant = 'info') {
    elements.authMessage.textContent = message;
    elements.authMessage.classList.remove('hidden', 'info-banner-error', 'info-banner-success');

    if (variant === 'error') {
        elements.authMessage.classList.add('info-banner-error');
        return;
    }

    if (variant === 'success') {
        elements.authMessage.classList.add('info-banner-success');
    }
}

function friendlyErrorMessage(error, context = 'general') {
    const errorCode = error?.code || '';

    switch (errorCode) {
    case 'auth/email-already-in-use':
        return 'That email address already has an account. Try signing in instead.';
    case 'auth/invalid-email':
        return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
        return 'Those sign-in details do not match our records.';
    case 'auth/weak-password':
        return 'Please choose a stronger password.';
    case 'auth/too-many-requests':
        return 'Too many attempts have been made. Please wait a little and try again.';
    case 'permission-denied':
        if (context === 'admin-dashboard') {
            return 'The admin dashboard could not load yet. Please refresh the page, and if that does not help, publish the latest Firestore rules in Firebase.';
        }

        if (context === 'admin-action') {
            return 'That admin action could not be completed. Please refresh the page and, if needed, publish the latest Firestore rules in Firebase.';
        }

        if (context === 'guest-rsvp-load') {
            return 'We could not load your saved RSVP just now. Please refresh the page and try again.';
        }

        if (context === 'guest-rsvp-save') {
            return 'We could not save your RSVP just now. Please refresh the page and try again.';
        }

        if (context === 'session') {
            return 'We could not refresh your access just now. Please refresh the page and try again.';
        }

        return 'We could not complete that request with this account. Please refresh the page and try again.';
    case 'not-found':
        return 'That RSVP record could not be found.';
    default:
        return error?.message || 'Something went wrong. Please try again.';
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
