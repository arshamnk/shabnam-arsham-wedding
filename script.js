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
    const songRequestGroup = document.getElementById('songRequestGroup');
    const giftNoteGroup = document.getElementById('giftNoteGroup');
    const successMessage = document.getElementById('successMessage');
    const guestCountField = document.getElementById('guestCount');
    const childrenCountField = document.getElementById('childrenCount');
    const guestNamesField = document.getElementById('guestNames');
    const childrenAgesField = document.getElementById('childrenAges');
    const dietaryField = document.getElementById('dietary');

    function updateGuestDetailsRequirements() {
        const guestCount = parseInt(guestCountField.value, 10);
        const childrenCount = parseInt(childrenCountField.value, 10);
        const hasAdditionalGuests = guestCount > 1 || childrenCount > 0;

        guestNamesField.required = hasAdditionalGuests;
        childrenAgesField.required = childrenCount > 0;
    }

    // Show/hide additional fields based on attendance selection
    attendingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                guestCountGroup.style.display = 'block';
                childrenGroup.style.display = 'block';
                guestNamesGroup.style.display = 'block';
                childrenAgesGroup.style.display = 'block';
                dietaryGroup.style.display = 'block';
                accessibilityGroup.style.display = 'block';
                songRequestGroup.style.display = 'block';
                giftNoteGroup.style.display = 'block';
                guestCountField.required = true;
                dietaryField.required = true;
                updateGuestDetailsRequirements();
            } else {
                guestCountGroup.style.display = 'none';
                childrenGroup.style.display = 'none';
                guestNamesGroup.style.display = 'none';
                childrenAgesGroup.style.display = 'none';
                dietaryGroup.style.display = 'none';
                accessibilityGroup.style.display = 'none';
                songRequestGroup.style.display = 'none';
                giftNoteGroup.style.display = 'none';
                guestCountField.required = false;
                guestNamesField.required = false;
                childrenAgesField.required = false;
                dietaryField.required = false;
            }
        });
    });

    guestCountField.addEventListener('change', updateGuestDetailsRequirements);
    childrenCountField.addEventListener('change', updateGuestDetailsRequirements);

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
            accessibility: document.getElementById('accessibility').value,
            songRequest: document.getElementById('songRequest').value,
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
    document.querySelectorAll('.story, .details, .rsvp, .travel').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
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
