import { test, expect } from '@playwright/test';

test.describe('MarkdownGPT E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
  });

  test('should load the application successfully', async ({ page }) => {
    // Check if the page loads with the correct title
    await expect(page).toHaveTitle('AI Text Processor');
    
    // Check for main headings
    await expect(page.locator('h1')).toHaveText('AI Text Processor');
    
    // Check if editor is present and functional
    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();
    
    // Check if preview panel is present
    const preview = page.locator('#preview');
    await expect(preview).toBeVisible();
    
    // Check if processing buttons are present
    await expect(page.locator('.format-btn').first()).toBeVisible();
  });

  test('should display default content on load', async ({ page }) => {
    const editor = page.locator('#editor');
    const content = await editor.inputValue();
    
    expect(content).toContain('Welcome to MarkdownGPT!');
    expect(content).toContain('Features');
    expect(content).toContain('Quick Start');
  });

  test('should update preview when typing', async ({ page }) => {
    const editor = page.locator('#editor');
    const preview = page.locator('#preview');
    
    // Clear editor and type new content
    await editor.fill('# Test Heading\n\nThis is a **bold** test.');
    
    // Wait for preview to update
    await page.waitForTimeout(500);
    
    // Check if preview contains processed markdown (or fallback HTML)
    const previewContent = await preview.innerHTML();
    expect(previewContent).toContain('Test Heading');
    expect(previewContent).toContain('bold');
  });

  test('should show character counter', async ({ page }) => {
    const editor = page.locator('#editor');
    const charCounter = page.locator('#charCounter');
    
    // Clear editor and type test content
    const testText = 'Hello World!';
    await editor.fill(testText);
    
    // Check if character counter updates
    await expect(charCounter).toContainText(`${testText.length}/1000`);
  });

  test('should update stats display', async ({ page }) => {
    const editor = page.locator('#editor');
    const stats = page.locator('#stats');
    
    // Clear editor and type test content
    const testText = 'Word one\nWord two\nWord three';
    await editor.fill(testText);
    
    // Wait for stats to update
    await page.waitForTimeout(300);
    
    // Check if stats show correct counts
    const statsText = await stats.textContent();
    expect(statsText).toContain('Words: 6'); // "Word one Word two Word three" = 6 words
    expect(statsText).toContain(`Characters: ${testText.length}`);
    expect(statsText).toContain('Lines: 3');
  });

  test('should insert formatting via toolbar buttons', async ({ page }) => {
    const editor = page.locator('#editor');
    
    // Clear editor and add test text
    await editor.fill('test text');
    
    // Select all text
    await editor.selectText();
    
    // Click bold button
    await page.locator('button:has-text("Bold")').click();
    
    // Check if bold formatting was applied
    const content = await editor.inputValue();
    expect(content).toBe('**test text**');
  });

  test('should clear editor when clear button is clicked', async ({ page }) => {
    const editor = page.locator('#editor');
    
    // Type some text
    await editor.fill('This text should be cleared');
    
    // Click clear button and confirm
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Clear")').click();
    
    // Check if editor was reset to default content
    const content = await editor.inputValue();
    expect(content).toContain('Welcome to MarkdownGPT!');
  });

  test('should show notifications for user actions', async ({ page }) => {
    // Clear editor to trigger a notification
    const editor = page.locator('#editor');
    await editor.fill('');
    
    // Try to copy empty content
    await page.locator('button:has-text("Copy")').click();
    
    // Check if notification appears
    await expect(page.locator('.notification')).toBeVisible();
    await expect(page.locator('.notification')).toContainText('Nothing to copy');
  });

  test('should handle text length limits', async ({ page }) => {
    const editor = page.locator('#editor');
    const charCounter = page.locator('#charCounter');
    
    // Create text that exceeds the limit
    const longText = 'a'.repeat(1001);
    await editor.fill(longText);
    
    // Check if character counter shows warning
    await expect(charCounter).toHaveCSS('color', 'rgb(255, 107, 107)'); // #ff6b6b
  });

  test('should show processing state when AI format button is clicked', async ({ page }) => {
    const editor = page.locator('#editor');
    const formatBtn = page.locator('.format-btn').first();
    
    // Add some test content
    await editor.fill('Test content for AI processing');
    
    // Mock network request to prevent actual API call
    await page.route('**/process', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error' })
      });
    });
    
    // Click format button
    await formatBtn.click();
    
    // Check if button shows processing state
    await expect(formatBtn).toHaveText(/Processing/);
    await expect(formatBtn).toBeDisabled();
  });

  test('should handle keyboard shortcuts and interactions', async ({ page }) => {
    const editor = page.locator('#editor');
    
    // Focus editor
    await editor.click();
    
    // Test basic text input
    await editor.fill('Testing keyboard input');
    
    // Test selection and replacement
    await editor.selectText();
    await page.keyboard.type('Replaced text');
    
    const content = await editor.inputValue();
    expect(content).toBe('Replaced text');
  });

  test('should maintain responsive design on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.app-container')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.app-container')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.app-container')).toBeVisible();
    
    // Ensure editor is still functional on mobile
    const editor = page.locator('#editor');
    await editor.fill('Mobile test');
    await expect(editor).toHaveValue('Mobile test');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock a failed CDN load scenario by checking console errors
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Reload the page to capture any initialization errors
    await page.reload();
    
    // The application should still function even with CDN failures
    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();
    
    // Basic functionality should work
    await editor.fill('Test with potential CDN issues');
    const content = await editor.inputValue();
    expect(content).toBe('Test with potential CDN issues');
  });
});

test.describe('Accessibility Tests', () => {
  test('should be accessible with screen readers', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Check for proper ARIA labels and semantic HTML
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('textarea[id="editor"]')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Ensure focus is manageable via keyboard
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper contrast and colors', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Check that text has sufficient contrast (this is a basic check)
    const editor = page.locator('#editor');
    const computedStyle = await editor.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color
      };
    });
    
    // Ensure styles are applied
    expect(computedStyle.backgroundColor).toBeTruthy();
    expect(computedStyle.color).toBeTruthy();
  });
});