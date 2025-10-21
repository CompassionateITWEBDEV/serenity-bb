# Google Analytics & Search Console Integration Setup

## 🎯 Overview
This guide will help you complete the integration of Google Analytics and Google Search Console with your Serenity Rehabilitation Center website.

## 📊 Google Analytics Setup

### ✅ Current Status
- **Measurement ID**: `G-MPEKC1KKWR`
- **Property**: src.health
- **Account**: Serenity (364174369)
- **Website**: https://serenity-b9.onrender.com

### 🔧 Configuration Steps

1. **Environment Variables** (Already configured):
   ```bash
   NEXT_PUBLIC_GA_ID=G-MPEKC1KKWR
   ```

2. **Features Enabled**:
   - ✅ Page view tracking
   - ✅ Event tracking (contact forms)
   - ✅ IP anonymization
   - ✅ Enhanced measurement
   - ✅ Real-time reporting

## 🔍 Google Search Console Setup

### 📋 Required Steps

1. **Go to Google Search Console**: https://search.google.com/search-console
2. **Add Property**:
   - Click "Add Property"
   - Select "URL prefix"
   - Enter: `https://serenity-b9.onrender.com`
3. **Verify Ownership**:
   - Choose "HTML tag" method
   - Copy the verification code
   - Add to your `.env.local` file:
     ```bash
     NEXT_PUBLIC_GSC_VERIFICATION=your_verification_code_here
     ```

### 🔧 Implementation

The verification meta tag will be automatically added to your website:
```html
<meta name="google-site-verification" content="your_verification_code_here" />
```

## 📈 SEO Enhancements

### ✅ Implemented Features

1. **Sitemap**: `/sitemap.xml`
   - Updated with production domain
   - Includes all major pages
   - Proper priority and change frequency

2. **Robots.txt**: `/robots.txt`
   - Allows all crawlers
   - Points to sitemap

3. **Meta Tags**:
   - Canonical URLs
   - Robot directives
   - Google-specific meta tags

4. **Structured Data**: Ready for implementation

## 🧪 Testing & Verification

### Google Analytics Testing

1. **Real-time Reports**:
   - Go to GA4 → Reports → Realtime
   - Visit your website
   - Check for active users

2. **Browser Console**:
   - Open DevTools (F12)
   - Look for gtag calls
   - Check Network tab for GA requests

3. **Google Tag Assistant**:
   - Install Chrome extension
   - Visit your website
   - Verify GA4 tag firing

### Google Search Console Testing

1. **Verification**:
   - Submit sitemap: `/sitemap.xml`
   - Check coverage reports
   - Monitor indexing status

2. **URL Inspection**:
   - Test individual pages
   - Check for crawl errors
   - Verify mobile usability

## 📊 Expected Results

### Google Analytics
- **Page Views**: Tracked automatically
- **Events**: Contact form submissions
- **User Behavior**: Enhanced measurement data
- **Real-time**: Live user activity

### Google Search Console
- **Indexing**: Pages being indexed
- **Performance**: Search query data
- **Coverage**: Crawl error monitoring
- **Enhancements**: Core Web Vitals

## 🚀 Next Steps

1. **Add Google Search Console verification code** to `.env.local`
2. **Deploy to production** with updated environment variables
3. **Submit sitemap** in Google Search Console
4. **Monitor both dashboards** for data collection
5. **Set up goals and conversions** in Google Analytics

## 🔧 Troubleshooting

### Common Issues

1. **No data in GA4**:
   - Check if GA_ID is correct
   - Verify website is live
   - Check browser console for errors

2. **Search Console not verified**:
   - Ensure verification code is correct
   - Check meta tag is in <head>
   - Wait 24-48 hours for verification

3. **Sitemap not found**:
   - Verify sitemap.xml is accessible
   - Check robots.txt points to sitemap
   - Ensure proper XML format

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify environment variables
3. Test on production domain
4. Check Google's documentation

---

**Last Updated**: October 21, 2025
**Status**: Google Analytics ✅ | Search Console ⏳ (needs verification code)
