# Wedding Website

A beautiful and elegant wedding website with RSVP functionality.

## Features

- 🎨 Beautiful, responsive design with elegant typography
- 💌 RSVP form with validation
- 📱 Mobile-friendly layout
- ✨ Smooth animations and transitions
- 📍 Wedding details and travel information
- 💾 Local storage for RSVP data (for demonstration)

## Testing Locally

To test the website on your local machine:

1. Open the `index.html` file in your web browser:
   - Double-click the file, or
   - Right-click and choose "Open with" your preferred browser, or
   - Drag and drop the file into a browser window

2. The website will load and you can:
   - Browse through all sections
   - Test the RSVP form
   - Check responsive design by resizing your browser window

## Customization

You can easily customize the website by editing:

- **Names & Date**: Edit `index.html` - look for "Sarah & Michael" and "June 15, 2026"
- **Story**: Update the "Our Story" section text
- **Event Details**: Modify ceremony times and locations
- **Colors**: Edit the CSS variables in `styles.css` (lines 10-17)
- **Photos**: Replace the hero image URL in `styles.css` (line 36)

## RSVP Data

For demonstration purposes, RSVP submissions are stored in your browser's local storage. To view submitted RSVPs:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Type: `viewRSVPs()`

To clear stored RSVPs:
- Type in console: `clearRSVPs()`

## Next Steps for Production

When you're ready to deploy:

1. **Domain & Hosting**: Consider services like:
   - Netlify (free tier, easy deployment)
   - Vercel (free tier, great performance)
   - GitHub Pages (free, good for static sites)
   - Traditional hosting: Bluehost, SiteGround, etc.

2. **Backend for RSVPs**: Set up a service to collect RSVPs:
   - Formspree (simple form backend)
   - Google Forms integration
   - Custom backend with Node.js/PHP
   - Services like RSVPify or Joy

3. **Custom Domain**: Register a domain:
   - Google Domains
   - Namecheap
   - GoDaddy
   - Consider: yournames.com or weddingsarahandmichael.com

4. **Email Collection**: Connect form to email service or database

## File Structure

```
wedding-website/
├── index.html      # Main HTML structure
├── styles.css      # All styling and animations
├── script.js       # Form functionality and interactions
└── README.md       # This file
```

Enjoy building your perfect wedding website! 💕
