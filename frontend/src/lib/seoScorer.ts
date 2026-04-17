export interface SeoCheck {
  id: string;
  label: string;
  pass: boolean;
  maxScore: number;
  earned: number;
  detail: string;
}

export interface SeoScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  checks: SeoCheck[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function keywordDensity(text: string, keyword: string): number {
  if (!keyword || !text) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const kw = keyword.toLowerCase();
  const matches = words.filter(w => w.includes(kw)).length;
  return words.length > 0 ? (matches / words.length) * 100 : 0;
}

function getH1s(html: string): string[] {
  return [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => stripHtml(m[1]));
}

function getH2s(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => stripHtml(m[1]));
}

function getH3s(html: string): string[] {
  return [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi)].map(m => stripHtml(m[1]));
}

function getImages(html: string): { hasAlt: boolean }[] {
  return [...html.matchAll(/<img([^>]*)>/gi)].map(m => ({
    hasAlt: /alt=["'][^"']+["']/i.test(m[1]),
  }));
}

export function scoreSeo(
  title: string,
  content: string,
  metaDescription: string,
  keyword: string
): SeoScore {
  const plainText = stripHtml(content);
  const wordCount = countWords(plainText);
  const h1s = getH1s(content);
  const h2s = getH2s(content);
  const h3s = getH3s(content);
  const images = getImages(content);
  const density = keywordDensity(plainText, keyword);
  const kw = (keyword || '').toLowerCase();

  const checks: SeoCheck[] = [
    // Keyword in title (15)
    (() => {
      const pass = kw.length > 0 && title.toLowerCase().includes(kw);
      return {
        id: 'kw_title',
        label: 'Keyword in title',
        pass,
        maxScore: 15,
        earned: pass ? 15 : 0,
        detail: pass ? `"${keyword}" found in title` : `"${keyword}" missing from title`,
      };
    })(),

    // H1 structure (10)
    (() => {
      const pass = h1s.length === 1;
      return {
        id: 'h1_structure',
        label: 'Single H1 tag',
        pass,
        maxScore: 10,
        earned: pass ? 10 : h1s.length === 0 ? 0 : 5,
        detail: h1s.length === 0 ? 'No H1 found' : h1s.length === 1 ? 'Exactly 1 H1 ✓' : `${h1s.length} H1 tags found (should be 1)`,
      };
    })(),

    // H2 count >= 3 (10)
    (() => {
      const pass = h2s.length >= 3;
      const earned = Math.min(10, Math.round((h2s.length / 3) * 10));
      return {
        id: 'h2_count',
        label: 'H2 subheadings (3+)',
        pass,
        maxScore: 10,
        earned: pass ? 10 : earned,
        detail: `${h2s.length} H2 tags found${h3s.length > 0 ? ` + ${h3s.length} H3` : ''}`,
      };
    })(),

    // Keyword density 0.5–2.5% (20)
    (() => {
      const pass = density >= 0.5 && density <= 2.5;
      const tooLow = density < 0.5;
      const earned = pass ? 20 : tooLow ? Math.round((density / 0.5) * 10) : density > 4 ? 0 : 10;
      return {
        id: 'kw_density',
        label: 'Keyword density (0.5–2.5%)',
        pass,
        maxScore: 20,
        earned,
        detail: `${density.toFixed(2)}% ${tooLow ? '(too low)' : density > 2.5 ? '(too high — may be stuffing)' : '✓'}`,
      };
    })(),

    // Meta description (10)
    (() => {
      const len = (metaDescription || '').length;
      const pass = len >= 130 && len <= 160;
      const earned = len === 0 ? 0 : pass ? 10 : len < 50 ? 2 : 5;
      return {
        id: 'meta_length',
        label: 'Meta description length (130–160)',
        pass,
        maxScore: 10,
        earned,
        detail: len === 0 ? 'No meta description' : `${len} chars ${pass ? '✓' : len < 130 ? '(too short)' : '(too long)'}`,
      };
    })(),

    // Keyword in meta (10)
    (() => {
      const pass = kw.length > 0 && (metaDescription || '').toLowerCase().includes(kw);
      return {
        id: 'kw_meta',
        label: 'Keyword in meta description',
        pass,
        maxScore: 10,
        earned: pass ? 10 : 0,
        detail: pass ? 'Keyword present in meta ✓' : 'Keyword missing from meta',
      };
    })(),

    // Image alt tags (10)
    (() => {
      if (images.length === 0) {
        return { id: 'img_alts', label: 'Image alt tags', pass: false, maxScore: 10, earned: 3, detail: 'No images found' };
      }
      const covered = images.filter(i => i.hasAlt).length;
      const pass = covered === images.length;
      return {
        id: 'img_alts',
        label: 'Image alt tags',
        pass,
        maxScore: 10,
        earned: Math.round((covered / images.length) * 10),
        detail: `${covered}/${images.length} images have alt text`,
      };
    })(),

    // Word count >= 800 (15)
    (() => {
      const pass = wordCount >= 800;
      const earned = pass ? 15 : Math.round(Math.min(14, (wordCount / 800) * 15));
      return {
        id: 'word_count',
        label: 'Word count (800+)',
        pass,
        maxScore: 15,
        earned,
        detail: `${wordCount.toLocaleString()} words${pass ? ' ✓' : ' (too short)'}`,
      };
    })(),
  ];

  const total = checks.reduce((sum, c) => sum + c.earned, 0);
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';
  const color = total >= 85 ? '#22c55e' : total >= 70 ? '#84cc16' : total >= 55 ? '#f59e0b' : total >= 40 ? '#f97316' : '#ef4444';

  return { total, grade, color, checks };
}
