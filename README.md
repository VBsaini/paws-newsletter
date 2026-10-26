# PAWS Newsletter Studio

A browser-based newsletter editor with the PAWS cream-and-peach design, paw-print backgrounds, a live preview and downloadable email files. No API key, account, server or build step is needed. PDF.js is bundled locally; no third-party CDN is required.

## Host on GitHub Pages

1. Create a GitHub repository, for example `paws-newsletter-studio`.
2. Upload the **contents of this folder** to the repository root. `index.html`, `app.js`, `style.css`, `newsletter.js`, `pdf-import.js`, `sample.json`, `assets/` and `vendor/` must all be included.
3. In the repository, open **Settings → Pages**. Under Build and deployment, choose **Deploy from a branch**, select your branch (usually `main`) and **/(root)**, then save.
4. Open the GitHub Pages URL shown there after deployment completes. Project subfolder URLs are supported because all assets use relative paths.

The `.nojekyll` file keeps the upload a plain static site. The optional `.openai/` folder is only for preview tooling and can be omitted from GitHub.

## Use the studio

- **Manual:** expand a story to edit its title, subtitle, text and photo. Use `**bold text**` for emphasis and a blank line between paragraphs. Add, duplicate, remove or reorder stories.
- **PDF:** select **Import PDF**. Text, headings and photos are extracted in your browser. Review the detected stories, then replace the current stories or append them. Editing imported content works exactly like manual content.
- **PDF limitations:** this is layout-based extraction, not AI rewriting or OCR. The included September content report is the reference format. Tables, columns, forwarded-email printouts, very unusual typography, encrypted files and image-only scans can need manual corrections. Scanned pages are retained as page images with editable empty text. Source text, dates, counts and photo placement must be reviewed. PDF imports stop at the donation appeal so banking/footer details stay under your control. Photos are extracted from page renderings; multiple photos in a story may become a collage.
- Change the edition, email subject and preview text in **Newsletter details**.
- Update the logo, colours and paw visibility in **Design & branding**. Backgrounds can be changed per story.
- Verify donation and footer details before every campaign.

## Export

- **HTML preview:** standalone HTML containing the images. Open offline to review; use your browser’s Print command for PDF. Some print dialogs have a “Background graphics” checkbox that must be enabled for the paws to print.
- **Email draft (.eml):** includes HTML, a plain-text version and CID-embedded images. Open in a compatible desktop email client; handling as an editable draft varies by client. Sender and recipients are unset.
- **Email platform kit (.zip):** HTML with relative images, an images folder, an EML, plain text, instructions and an editable project. Import the HTML and images into your email service, or upload images and replace the relative paths with the service’s hosted URLs. Configure any campaign footer through your email platform. Send a test email; backgrounds and layout vary by email client.
- **Editable project (.json):** complete content and images for backup or opening on another device.

The studio never sends emails. Downloading HTML does not host its images for a campaign.

## Saving & privacy

Drafts save in this browser’s IndexedDB. PDF and photo files are processed locally and are not uploaded to an application server. Automatic saving does not sync between browsers, devices or domains, and clearing site data removes it. Keep downloaded project backups. Private/incognito browsers and full storage may prevent automatic saving; the status at the top reports this.

GitHub hosts the **app source and bundled sample content** publicly when you use a public repository. Your locally imported PDFs/drafts are not added to the repository. Do not commit private reports or projects unintentionally. This app contains no API keys, analytics or external scripts.

## Local development

Use any static HTTP server; opening `index.html` directly with a `file://` URL will not work with JavaScript modules and PDF workers.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The sample newsletter comes from the supplied September 2026 report. Design assets come from the supplied PAWS reference.

## Dependencies

PDF.js (`pdfjs-dist` 5.6.205), bundled under `vendor/pdfjs/`, Apache License 2.0; its original LICENSE is included. Other application code uses browser-native APIs. A modern browser is required.
