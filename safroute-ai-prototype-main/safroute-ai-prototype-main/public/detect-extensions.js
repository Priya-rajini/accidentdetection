/**
 * Browser Extension Detection Script
 * 
 * Run this in your browser console (F12) to detect extension-injected elements
 * 
 * Usage: Copy and paste this entire script into the browser console
 */

(function detectExtensions() {
  console.log('%c🔍 Browser Extension Detection', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('='.repeat(50));
  
  const results = {
    extensionElements: [],
    extensionIframes: [],
    suspiciousClasses: [],
    suspiciousIds: [],
    extensionScripts: []
  };
  
  // 1. Find elements with extension-related attributes
  const extensionElements = document.querySelectorAll('[data-extension-id], [class*="extension"], [id*="extension"]');
  extensionElements.forEach(el => {
    results.extensionElements.push({
      element: el,
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
    });
  });
  
  // 2. Find extension iframes
  const extensionIframes = document.querySelectorAll('iframe[src*="extension://"], iframe[src*="chrome-extension://"], iframe[src*="moz-extension://"]');
  extensionIframes.forEach(iframe => {
    results.extensionIframes.push({
      src: iframe.src,
      id: iframe.id,
      className: iframe.className
    });
  });
  
  // 3. Find suspicious class names
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ');
      classes.forEach(cls => {
        if (cls.includes('extension') || cls.includes('browser-extension') || cls.includes('heart-icon') || cls.includes('lovable')) {
          if (!results.suspiciousClasses.includes(cls)) {
            results.suspiciousClasses.push(cls);
          }
        }
      });
    }
  });
  
  // 4. Find suspicious IDs
  allElements.forEach(el => {
    if (el.id && (el.id.includes('extension') || el.id.includes('heart-icon') || el.id.includes('lovable'))) {
      if (!results.suspiciousIds.includes(el.id)) {
        results.suspiciousIds.push(el.id);
      }
    }
  });
  
  // 5. Check for extension scripts
  const scripts = document.querySelectorAll('script[src*="extension://"], script[src*="chrome-extension://"], script[src*="moz-extension://"]');
  scripts.forEach(script => {
    results.extensionScripts.push({
      src: script.src,
      id: script.id
    });
  });
  
  // 6. Check for heart icons specifically
  const heartIcons = document.querySelectorAll('svg[class*="heart"], svg[id*="heart"], img[src*="heart"], [class*="heart-icon"], [id*="heart-icon"]');
  const heartResults = [];
  heartIcons.forEach(el => {
    heartResults.push({
      element: el,
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      computedStyle: window.getComputedStyle(el).display
    });
  });
  
  // Print results
  console.log('\n📊 Detection Results:\n');
  
  if (results.extensionElements.length > 0) {
    console.warn(`⚠️ Found ${results.extensionElements.length} extension-related elements:`);
    results.extensionElements.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.tagName}`, item);
    });
  } else {
    console.log('✅ No extension-related elements found');
  }
  
  if (results.extensionIframes.length > 0) {
    console.warn(`⚠️ Found ${results.extensionIframes.length} extension iframes:`);
    results.extensionIframes.forEach((item, idx) => {
      console.log(`  ${idx + 1}.`, item);
    });
  } else {
    console.log('✅ No extension iframes found');
  }
  
  if (results.suspiciousClasses.length > 0) {
    console.warn(`⚠️ Found ${results.suspiciousClasses.length} suspicious class names:`);
    results.suspiciousClasses.forEach(cls => console.log(`  - ${cls}`));
  }
  
  if (results.suspiciousIds.length > 0) {
    console.warn(`⚠️ Found ${results.suspiciousIds.length} suspicious IDs:`);
    results.suspiciousIds.forEach(id => console.log(`  - ${id}`));
  }
  
  if (heartResults.length > 0) {
    console.warn(`\n❤️ Found ${heartResults.length} heart-related elements:`);
    heartResults.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.tagName}`, item);
      console.log(`     Display: ${item.computedStyle}`);
    });
  } else {
    console.log('✅ No heart icons found in DOM');
  }
  
  if (results.extensionScripts.length > 0) {
    console.warn(`⚠️ Found ${results.extensionScripts.length} extension scripts:`);
    results.extensionScripts.forEach((item, idx) => {
      console.log(`  ${idx + 1}.`, item);
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  const totalIssues = results.extensionElements.length + results.extensionIframes.length + heartResults.length;
  if (totalIssues > 0) {
    console.warn(`⚠️ Total issues found: ${totalIssues}`);
    console.log('\n💡 Recommendations:');
    console.log('  1. Disable browser extensions one by one');
    console.log('  2. Test in Incognito/Private mode');
    console.log('  3. Test in a different browser');
    console.log('  4. Clear browser cache and reload');
  } else {
    console.log('✅ No extension interference detected!');
  }
  
  return results;
})();


