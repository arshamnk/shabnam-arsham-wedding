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
        authMessage: document.getElementById('authMessage'),
        authStatusBar: document.getElementById('authStatusBar'),
        authStatusText: document.getElementById('authStatusText'),
        authView: document.getElementById('authView'),
        guestView: document.getElementById('guestView'),
        adminView: document.getElementById('adminView'),
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
        signOutButtons: Array.from(document.querySelectorAll('[data-action="sign-out"]')),
        toggleBankDetailsButton: document.getElementById('toggleBankDetailsButton'),
        sensitiveBankDetails: document.getElementById('sensitiveBankDetails'),
        rsvpForm: document.getElementById('rsvpForm'),
        submitRsvpButton: document.getElementById('submitRsvpButton'),
        successMessage: document.getElementById('successMessage'),
        successMessageText: document.getElementById('successMessageText'),
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

    if (!user) {
        state.isAdmin = false;
        state.existingRsvp = null;
        state.adminEntries = [];
        state.verifiedProfiles = [];
        state.grantedAdmins = [];
        state.blockedUsers = [];
        state.adminViewMode = 'summary';
        renderAdminEntries(state.adminEntries, state, elements);
        elements.authStatusBar.classList.add('hidden');
        elements.authView.classList.remove('hidden');
        elements.verificationGate.classList.add('hidden');
        elements.guestView.classList.add('hidden');
        elements.adminView.classList.add('hidden');
        resetRsvpForm(elements, null);
        switchAuthTab('sign-in', elements);
        return;
    }

    elements.authStatusBar.classList.remove('hidden');
    elements.authStatusText.textContent = user.emailVerified
        ? `Signed in as ${user.email}`
        : `Signed in as ${user.email}. Email verification is still required.`;

    if (!user.emailVerified) {
        elements.authView.classList.add('hidden');
        elements.verificationGate.classList.remove('hidden');
        elements.guestView.classList.add('hidden');
        elements.adminView.classList.add('hidden');
        elements.verificationEmail.textContent = user.email || '';
        setBanner(elements, 'Verify your email before protected content, bank details, and RSVP submissions become available.', 'info');
        return;
    }

    elements.verificationGate.classList.add('hidden');

    try {
        const blockedSnapshot = await getDoc(doc(state.db, 'blockedUsers', user.uid));
        if (blockedSnapshot.exists()) {
            await signOut(state.auth);
            setBanner(elements, 'Your access to this site has been removed. Please contact the couple if this seems incorrect.', 'error');
            return;
        }
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
        return;
    }

    try {
        await ensureVerifiedProfile(user, state);
    } catch (error) {
        setBanner(elements, 'Your account is verified, but the site could not refresh your access profile yet. Core access still works, but admin self-service may need the latest Firestore rules.', 'info');
    }

    try {
        state.isAdmin = await isAdminUser(user, state);
    } catch (error) {
        state.isAdmin = false;
        setBanner(elements, friendlyErrorMessage(error), 'error');
        return;
    }

    if (state.isAdmin) {
        elements.authView.classList.add('hidden');
        elements.guestView.classList.add('hidden');
        elements.adminView.classList.remove('hidden');
        setBanner(elements, 'Verified admin access enabled. RSVP submissions are shown below.', 'success');
        renderAdminEntries(state.adminEntries, state, elements);
        subscribeToAdminData(state, elements);
        return;
    }

    elements.authView.classList.add('hidden');
    elements.adminView.classList.add('hidden');
    elements.guestView.classList.remove('hidden');
    setBanner(elements, 'You are signed in with a verified email address. The protected RSVP form and wedding fund details are now visible.', 'success');
    await loadGuestRsvp(state, elements, user);
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

        const removeUserButton = event.target.closest('[data-remove-user]');

        if (removeUserButton) {
            handleRemoveUser(removeUserButton, state, elements);
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
        await signInWithEmailAndPassword(state.auth, email, password);
        elements.signInPassword.value = '';
        setBanner(elements, 'Signed in successfully.', 'success');
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
        setBanner(elements, 'Account created. Please check your inbox and click the verification link before continuing.', 'success');
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
        setBanner(elements, 'A fresh verification email has been sent.', 'success');
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
        await syncSession(state.auth.currentUser, state, elements);

        if (state.auth.currentUser?.emailVerified) {
            setBanner(elements, 'Email verification confirmed. Access refreshed.', 'success');
        } else {
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
            return;
        }

        state.existingRsvp = snapshot.data();
        populateRsvpForm(elements, user, state.existingRsvp);
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
    elements.submitRsvpButton.textContent = 'Save RSVP';
}

function populateRsvpForm(elements, user, data) {
    const { firstName, lastName } = splitName(data.firstName, data.lastName, user?.displayName);

    elements.firstName.value = firstName;
    elements.lastName.value = lastName;
    elements.email.value = user?.email || data.email || '';
    elements.phone.value = data.phone || '';
    setRadioValue(elements.attendingRadios, data.attending || '');
    updateAttendingFields(data.attending === 'yes', elements);
    elements.guestCountField.value = data.guestCount || '1';
    elements.childrenCountField.value = data.childrenCount || '0';
    elements.guestNamesField.value = data.guestNames || '';
    elements.childrenAgesField.value = data.childrenAges || '';
    elements.dietaryField.value = data.dietary || '';
    elements.accessibilityField.value = data.accessibility || '';
    setRadioValue(elements.accommodationInterestFields, data.accommodationInterest || '');
    updateAccommodationRequirements(elements);
    elements.accommodationCountField.value = data.accommodationCount || '';
    elements.songRequestField.value = data.songRequest || '';
    elements.messageField.value = data.message || '';
    updateGuestDetailsRequirements(elements);
    elements.submitRsvpButton.textContent = 'Update RSVP';
}

async function handleRsvpSubmit(event, state, elements) {
    event.preventDefault();

    if (!state.currentUser || !state.currentUser.emailVerified) {
        setBanner(elements, 'You must be signed in with a verified email address before saving an RSVP.', 'error');
        return;
    }

    const attendingSelection = document.querySelector('input[name="attending"]:checked');
    if (!attendingSelection) {
        setBanner(elements, 'Please tell us whether you will be attending.', 'error');
        return;
    }

    const isAttending = attendingSelection.value === 'yes';
    const fullName = `${elements.firstName.value.trim()} ${elements.lastName.value.trim()}`.trim();
    const isUpdate = Boolean(state.existingRsvp);
    const restore = setBusy(elements.submitRsvpButton, isUpdate ? 'Updating RSVP...' : 'Saving RSVP...');

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
        submittedAt: state.existingRsvp?.submittedAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(state.db, 'rsvps', state.currentUser.uid), payload, { merge: true });
        await loadGuestRsvp(state, elements, state.currentUser);
        showSuccessMessage(
            elements,
            isUpdate
                ? 'Your RSVP has been updated.'
                : 'Your RSVP has been received. We can\'t wait to celebrate with you.'
        );
        setBanner(elements, isUpdate ? 'RSVP updated successfully.' : 'RSVP saved successfully.', 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
        setBanner(elements, `Deleted the RSVP for ${household}.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
        setBanner(elements, friendlyErrorMessage(error), 'error');
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

        if (isGrantedAdminProfile({ uid: targetUid }, state)) {
            await deleteDoc(doc(state.db, 'admins', targetUid));
        }

        setBanner(elements, `${targetName} has been removed from the website.`, 'success');
    } catch (error) {
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
    const ctaButton = document.querySelector('.cta-button');
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
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
        setBanner(elements, friendlyErrorMessage(error), 'error');
    });

    state.adminRolesUnsubscribe = onSnapshot(collection(state.db, 'admins'), (snapshot) => {
        state.grantedAdmins = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        }));

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error), 'error');
    });

    state.adminBlockedUnsubscribe = onSnapshot(collection(state.db, 'blockedUsers'), (snapshot) => {
        state.blockedUsers = snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data()
        }));

        renderAdminEntries(state.adminEntries, state, elements);
    }, (error) => {
        setBanner(elements, friendlyErrorMessage(error), 'error');
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
    elements.adminRsvpCount.textContent = String(entries.length);
    renderAdminAccess(state, elements);
    renderAdminSummary(entries, elements);
    elements.adminList.innerHTML = entries.map((entry) => buildAdminCard(entry)).join('');
    elements.adminTableBody.innerHTML = entries.map((entry) => buildAdminTableRow(entry)).join('');

    if (!entries.length) {
        elements.adminEmptyState.classList.remove('hidden');
    } else {
        elements.adminEmptyState.classList.add('hidden');
    }

    applyAdminView(state.adminViewMode, elements);
}

function renderAdminAccess(state, elements) {
    const profiles = (state.verifiedProfiles || []).filter((profile) => !isBlockedUserProfile(profile, state));

    if (!profiles.length) {
        elements.adminAccessEmptyState.classList.remove('hidden');
        elements.adminAccessList.innerHTML = '';
        return;
    }

    elements.adminAccessEmptyState.classList.add('hidden');
    elements.adminAccessList.innerHTML = profiles.map((profile) => buildAdminAccessRow(profile, state)).join('');
}

function buildAdminAccessRow(profile, state) {
    const isGrantedAdmin = isGrantedAdminProfile(profile, state);
    const isBootstrapAdmin = isBootstrapAdminEmail(profile.email);
    const isAnyAdmin = isGrantedAdmin || isBootstrapAdmin;
    const isCurrentSession = (profile.uid || profile.id) === state.currentUser?.uid;
    const statusLabel = isBootstrapAdmin ? 'Fixed Admin' : (isGrantedAdmin ? 'Admin Granted' : 'Verified User');
    const buttonMarkup = isAnyAdmin
        ? '<span class="status-pill status-pill-admin">Already Admin</span>'
        : `<button type="button" class="inline-button" data-grant-admin="${escapeHtml(profile.uid || profile.id)}" data-email="${escapeHtml(profile.email || '')}" data-name="${escapeHtml(profile.displayName || profile.email || 'Verified user')}">Make Admin</button>`;
    const removeMarkup = (isBootstrapAdmin || isCurrentSession)
        ? `<span class="status-pill ${isCurrentSession ? 'status-pill-admin' : ''}">${escapeHtml(isCurrentSession ? 'Current Session' : 'Protected')}</span>`
        : `<button type="button" class="danger-button" data-remove-user="${escapeHtml(profile.uid || profile.id)}" data-email="${escapeHtml(profile.email || '')}" data-name="${escapeHtml(profile.displayName || profile.email || 'Verified user')}">Remove User</button>`;

    return `
        <article class="admin-access-row">
            <div class="admin-access-meta">
                <strong>${escapeHtml(profile.displayName || profile.email || 'Verified user')}</strong>
                <div class="admin-access-copy">${escapeHtml(profile.email || 'No email recorded')}</div>
                <div class="admin-access-copy">Last seen ${escapeHtml(formatTimestamp(profile.lastSeenAt))}</div>
            </div>
            <div class="admin-access-actions">
                <span class="status-pill ${isAnyAdmin ? 'status-pill-admin' : ''}">${escapeHtml(statusLabel)}</span>
                ${buttonMarkup}
                ${removeMarkup}
            </div>
        </article>
    `;
}

function isGrantedAdminProfile(profile, state) {
    const uid = profile.uid || profile.id;
    return (state.grantedAdmins || []).some((entry) => (entry.uid || entry.id) === uid);
}

function isBootstrapAdminEmail(email) {
    const configuredAdminEmails = (appConfig.adminEmails || []).map((entry) => entry.trim().toLowerCase());
    return configuredAdminEmails.includes((email || '').trim().toLowerCase());
}

function isBlockedUserProfile(profile, state) {
    const uid = profile.uid || profile.id;
    return (state.blockedUsers || []).some((entry) => (entry.uid || entry.id) === uid);
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

function buildAdminCard(entry) {
    const household = buildHouseholdName(entry);
    const guestCount = entry.guestCount && entry.guestCount !== '0' ? entry.guestCount : '--';
    const childrenCount = entry.childrenCount && entry.childrenCount !== '0' ? entry.childrenCount : '0';
    const status = entry.attending === 'yes' ? 'Attending' : 'Declines';
    const submittedLabel = entry.updatedAt ? 'Updated' : 'Submitted';

    return `
        <article class="admin-entry">
            <div class="admin-entry-header">
                <div>
                    <span class="detail-badge">${escapeHtml(status)}</span>
                    <h4>${escapeHtml(household)}</h4>
                </div>
                <div class="admin-entry-meta">
                    <div>${escapeHtml(entry.email || 'No email provided')}</div>
                    <div>${submittedLabel} ${escapeHtml(formatTimestamp(entry.updatedAt || entry.submittedAt))}</div>
                </div>
            </div>

            <div class="admin-entry-toolbar">
                <p class="admin-entry-toolbar-copy">Record the amount received in the bank account here, or remove this RSVP entirely if it was entered in error.</p>
                <div class="admin-entry-actions">
                    ${buildDonationForm(entry)}
                    <button type="button" class="danger-button" data-delete-rsvp="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">Delete RSVP</button>
                </div>
            </div>

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

function buildAdminTableRow(entry) {
    const household = buildHouseholdName(entry);
    const status = entry.attending === 'yes' ? 'Attending' : 'Declines';
    const partySize = entry.attending === 'yes'
        ? `${getAdultCount(entry)} adults, ${getChildCount(entry)} children`
        : '--';
    const accommodation = entry.accommodationInterest
        ? `${capitalize(entry.accommodationInterest)}${entry.accommodationCount ? ` (${entry.accommodationCount})` : ''}`
        : '--';

    return `
        <tr>
            <td class="admin-table-guest">
                <strong>${escapeHtml(household)}</strong>
                <div class="admin-table-meta">${escapeHtml(entry.email || 'No email provided')}</div>
            </td>
            <td>${escapeHtml(status)}</td>
            <td>${escapeHtml(partySize)}</td>
            <td>${escapeHtml(accommodation)}</td>
            <td>${buildDonationForm(entry)}</td>
            <td>${escapeHtml(formatTimestamp(entry.updatedAt || entry.submittedAt))}</td>
            <td>
                <div class="admin-table-actions">
                    <button type="button" class="danger-button" data-delete-rsvp="${escapeHtml(entry.id)}" data-household="${escapeHtml(household)}">Delete</button>
                </div>
            </td>
        </tr>
    `;
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

function showSuccessMessage(elements, message) {
    elements.successMessageText.textContent = message;
    elements.successMessage.classList.remove('hidden');
    elements.successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideSuccessMessage(elements) {
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

function friendlyErrorMessage(error) {
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
        return 'Access was denied by the database rules. Check the Firestore rules and your admin setup.';
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
