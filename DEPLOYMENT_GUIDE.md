# PreciseCalcs Tools - Deployment & Embedding Guide

## 🚀 Deployment to Vercel

### Prerequisites
- Vercel account (free tier works)
- GitHub repository connected

### Steps

1. **Push to GitHub**
   - Use the "Save to GitHub" button in Emergent
   - Or manually push your code

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project:
     ```
     Framework Preset: Create React App
     Root Directory: frontend
     Build Command: yarn build
     Output Directory: build
     Install Command: yarn install
     ```
   - Click "Deploy"

3. **Configure Domain (Optional)**
   - In Vercel project settings → Domains
   - Add your custom domain (e.g., tools.precisecalcs.com)

---

## 📦 Embedding on WordPress

### Method 1: Direct iframe Embed (Simplest)

Add this to your WordPress page/post HTML:

```html
<iframe 
  src="https://your-vercel-app.vercel.app/binary-translator" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
</iframe>
```

### Method 2: Script Embed (Recommended)

Add this to your WordPress page/post HTML:

```html
<div id="precisecalcs-tool"></div>
<script src="https://your-vercel-app.vercel.app/embed.js?tool=binary-translator"></script>
```

**Benefits:**
- Cleaner integration
- Auto-resizing
- Better SEO
- Easier to maintain

### Method 3: WordPress Shortcode (Advanced)

Create a custom shortcode in your theme's `functions.php`:

```php
function precisecalcs_tool_shortcode($atts) {
    $atts = shortcode_atts(array(
        'tool' => 'binary-translator',
        'height' => '900px'
    ), $atts);
    
    $url = 'https://your-vercel-app.vercel.app/' . esc_attr($atts['tool']);
    $height = esc_attr($atts['height']);
    
    return '<iframe src="' . $url . '" width="100%" height="' . $height . '" frameborder="0" style="border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);"></iframe>';
}
add_shortcode('precisecalcs', 'precisecalcs_tool_shortcode');
```

Then use in WordPress:
```
[precisecalcs tool="binary-translator" height="900px"]
```

---

## 🛠️ Available Tools

### Current Tools
- **Binary Translator** (`/binary-translator`)
  - Full-featured text ↔ binary/hex/octal/decimal converter
  - Supports ASCII, Latin-1, UTF-8, UTF-16 LE, UTF-32
  - Real-time conversion, copy buttons, sample texts

### Adding More Tools

To add a new tool:

1. Create tool directory:
   ```bash
   mkdir -p /app/frontend/src/tools/YourTool
   ```

2. Create component:
   ```jsx
   // /app/frontend/src/tools/YourTool/YourTool.jsx
   import React from 'react';
   import './YourTool.css';
   
   const YourTool = () => {
     return <div>Your tool here</div>;
   };
   
   export default YourTool;
   ```

3. Add route in `/app/frontend/src/App.js`:
   ```jsx
   import YourTool from './tools/YourTool/YourTool';
   
   // Add to routes:
   <Route path="/your-tool" element={<YourTool />} />
   ```

4. Add to tools list in `App.js`:
   ```jsx
   {
     name: 'Your Tool Name',
     path: '/your-tool',
     description: 'Tool description',
     icon: '🔧',
   }
   ```

---

## 🎨 Customization

### Color Scheme
The app uses your PreciseCalcs color palette:
- Primary: `#c8522a` (orange)
- Background: `#f8f9fa`
- Card: `#ffffff`
- Text: `#000000`, `#666666`

To modify colors, edit:
- `/app/frontend/src/tools/BinaryTranslator/BinaryTranslator.css`
- `/app/frontend/src/App.css`

### Branding
Update the landing page in:
- `/app/frontend/src/App.js` (ToolsLanding component)

---

## 🔍 Testing Locally

```bash
cd /app/frontend
yarn install
yarn start
```

Access at: `http://localhost:3000`

---

## 📊 URLs After Deployment

- Landing page: `https://your-app.vercel.app/`
- Binary Translator: `https://your-app.vercel.app/binary-translator`
- Embed script: `https://your-app.vercel.app/embed.js`

---

## 🐛 Troubleshooting

### Tool not loading on WordPress
- Check browser console for errors
- Ensure your WordPress theme allows iframes
- Try adding to a full-width page template

### Styling issues
- WordPress themes may add CSS that conflicts
- Add `!important` to iframe styles if needed
- Use Method 2 (Script Embed) for better isolation

### CORS errors
- Vercel automatically handles CORS
- No additional configuration needed

---

## 📝 Support

For issues or questions:
1. Check browser console for errors
2. Verify Vercel deployment succeeded
3. Test the tool directly (not embedded) first

---

## ✅ Next Steps

1. Deploy to Vercel
2. Test the binary translator tool
3. Embed on your WordPress site
4. Add more tools as needed!

Your tools are production-ready and scalable! 🎉
