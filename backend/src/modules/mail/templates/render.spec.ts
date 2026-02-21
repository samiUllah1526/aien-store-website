import { escapeHtml, replacePlaceholders, renderMjmlTemplate } from './render';

describe('render', () => {
  describe('escapeHtml', () => {
    it('escapes & < > " \'', () => {
      expect(escapeHtml('a & b < c > d " e \' f')).toBe(
        'a &amp; b &lt; c &gt; d &quot; e &#39; f',
      );
    });

    it('handles empty and non-string', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as unknown as string)).toBe('null');
    });
  });

  describe('replacePlaceholders', () => {
    it('replaces {{key}} with escaped value', () => {
      const out = replacePlaceholders('Hello {{name}}', { name: '<b>X</b>' });
      expect(out).toBe('Hello &lt;b&gt;X&lt;/b&gt;');
    });

    it('inserts raw value for keys ending with _html', () => {
      const out = replacePlaceholders('Body: {{content_html}}', {
        content_html: '<p>Safe</p>',
      });
      expect(out).toBe('Body: <p>Safe</p>');
    });
  });

  describe('renderMjmlTemplate', () => {
    it('returns html and text for order-status-change', () => {
      const result = renderMjmlTemplate('order-status-change', {
        customerName: 'Jane',
        orderId: 'ord-123',
        status: 'SHIPPED',
        statusUpdatedAt: '2025-01-15',
        companyName: 'Store',
      });

      expect(result.html).toContain('<!doctype html>');
      expect(result.html).toContain('Jane');
      expect(result.html).toContain('ord-123');
      expect(result.text).toContain('Jane');
    });
  });
});
