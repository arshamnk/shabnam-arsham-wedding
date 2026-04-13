// RSVP Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('rsvpForm');
    const attendingRadios = document.querySelectorAll('input[name="attending"]');
    const guestCountGroup = document.getElementById('guestCountGroup');
    const childrenGroup = document.getElementById('childrenGroup');
    const guestNamesGroup = document.getElementById('guestNamesGroup');
    const childrenAgesGroup = document.getElementById('childrenAgesGroup');
    const dietaryGroup = document.getElementById('dietaryGroup');
    const accessibilityGroup = document.getElementById('accessibilityGroup');
    const accommodationInterestGroup = document.getElementById('accommodationInterestGroup');
    const accommodationCountGroup = document.getElementById('accommodationCountGroup');
    const songRequestGroup = document.getElementById('songRequestGroup');
    const successMessage = document.getElementById('successMessage');
    const guestCountField = document.getElementById('guestCount');
    const childrenCountField = document.getElementById('childrenCount');
    const guestNamesField = document.getElementById('guestNames');
    const childrenAgesField = document.getElementById('childrenAges');
    const dietaryField = document.getElementById('dietary');
    const accessibilityField = document.getElementById('accessibility');
    const accommodationInterestFields = document.querySelectorAll('input[name="accommodationInterest"]');
    const accommodationCountField = document.getElementById('accommodationCount');
    const songRequestField = document.getElementById('songRequest');

    function setGroupVisibility(group, isVisible) {
        group.style.display = isVisible ? 'block' : 'none';
    }

    function updateGuestDetailsRequirements() {
        const guestCount = parseInt(guestCountField.value, 10);
        const childrenCount = parseInt(childrenCountField.value, 10);
        const hasAdditionalGuests = guestCount > 1 || childrenCount > 0;

        guestNamesField.required = hasAdditionalGuests;
        childrenAgesField.required = childrenCount > 0;
    }

    function updateAccommodationRequirements() {
        const selectedAccommodation = document.querySelector('input[name="accommodationInterest"]:checked');
        const mayNeedAccommodation = selectedAccommodation &&
            (selectedAccommodation.value === 'yes' || selectedAccommodation.value === 'maybe');

        setGroupVisibility(accommodationCountGroup, Boolean(mayNeedAccommodation));
        accommodationCountField.required = Boolean(mayNeedAccommodation);

        if (!mayNeedAccommodation) {
            accommodationCountField.value = '';
        }
    }

    function resetAttendingDetails() {
        guestCountField.value = '1';
        childrenCountField.value = '0';
        guestNamesField.value = '';
        childrenAgesField.value = '';
        dietaryField.value = '';
        accessibilityField.value = '';
        accommodationCountField.value = '';
        songRequestField.value = '';

        accommodationInterestFields.forEach(field => {
            field.checked = false;
            field.required = false;
        });
    }

    function updateAttendingFields(isAttending) {
        setGroupVisibility(guestCountGroup, isAttending);
        setGroupVisibility(childrenGroup, isAttending);
        setGroupVisibility(guestNamesGroup, isAttending);
        setGroupVisibility(childrenAgesGroup, isAttending);
        setGroupVisibility(dietaryGroup, isAttending);
        setGroupVisibility(accessibilityGroup, isAttending);
        setGroupVisibility(accommodationInterestGroup, isAttending);
        setGroupVisibility(songRequestGroup, isAttending);

        guestCountField.required = isAttending;
        dietaryField.required = isAttending;
        accommodationInterestFields.forEach(field => {
            field.required = isAttending;
        });

        if (isAttending) {
            updateGuestDetailsRequirements();
            updateAccommodationRequirements();
            return;
        }

        guestNamesField.required = false;
        childrenAgesField.required = false;
        accommodationCountField.required = false;
        setGroupVisibility(accommodationCountGroup, false);
        resetAttendingDetails();
    }

    // Show/hide additional fields based on attendance selection
    attendingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateAttendingFields(this.value === 'yes');
        });
    });

    guestCountField.addEventListener('change', updateGuestDetailsRequirements);
    childrenCountField.addEventListener('change', updateGuestDetailsRequirements);
    accommodationInterestFields.forEach(field => {
        field.addEventListener('change', updateAccommodationRequirements);
    });

    // Smooth scroll for RSVP button
    document.querySelector('.cta-button').addEventListener('click', function(e) {
        e.preventDefault();
        const rsvpSection = document.getElementById('rsvp');
        rsvpSection.scrollIntoView({ behavior: 'smooth' });
    });

    // Form submission handling
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Collect form data
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            attending: document.querySelector('input[name="attending"]:checked').value,
            guestCount: guestCountField.value,
            childrenCount: childrenCountField.value,
            guestNames: guestNamesField.value,
            childrenAges: childrenAgesField.value,
            dietary: dietaryField.value,
            accessibility: accessibilityField.value,
            accommodationInterest: (document.querySelector('input[name="accommodationInterest"]:checked') || {}).value || '',
            accommodationCount: accommodationCountField.value,
            songRequest: songRequestField.value,
            message: document.getElementById('message').value,
            timestamp: new Date().toISOString()
        };

        // Log to console (in production, this would be sent to a server)
        console.log('RSVP Submission:', formData);

        // Store in localStorage for demonstration purposes
        const existingRSVPs = JSON.parse(localStorage.getItem('rsvps') || '[]');
        existingRSVPs.push(formData);
        localStorage.setItem('rsvps', JSON.stringify(existingRSVPs));

        // Hide form and show success message
        form.style.display = 'none';
        successMessage.style.display = 'block';

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Optional: Reset form after a delay if you want to allow multiple submissions
        setTimeout(() => {
            form.reset();
        }, 1000);
    });

    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe sections for animation
    document.querySelectorAll('.story, .details, .rsvp').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });

    const selectedAttending = document.querySelector('input[name="attending"]:checked');
    updateAttendingFields(selectedAttending ? selectedAttending.value === 'yes' : false);
});

// View stored RSVPs (for demonstration - can be accessed via browser console)
function viewRSVPs() {
    const rsvps = JSON.parse(localStorage.getItem('rsvps') || '[]');
    console.log('Total RSVPs:', rsvps.length);
    console.table(rsvps);
    return rsvps;
}

// Clear all RSVPs (for demonstration - can be accessed via browser console)
function clearRSVPs() {
    localStorage.removeItem('rsvps');
    console.log('All RSVPs cleared');
}

console.log('Wedding Website loaded! To view RSVPs, type: viewRSVPs()');
