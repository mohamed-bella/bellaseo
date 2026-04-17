interface ArticleSchemaInput {
  title: string;
  content: string;
  meta_description?: string;
  created_at?: string;
  published_url?: string;
  featured_image_url?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

function extractFAQs(html: string): FAQItem[] {
  const faqs: FAQItem[] = [];

  // Match FAQ sections: h2/h3 question followed by p answer
  const sectionPattern = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, '').trim();
    const answer = match[2].replace(/<[^>]*>/g, '').trim();

    // Only include if looks like a question (ends with ? or starts with common Q words)
    if (
      question.endsWith('?') ||
      /^(what|how|why|when|where|which|who|can|is|are|do|does|will|should)/i.test(question)
    ) {
      if (question.length > 10 && answer.length > 20) {
        faqs.push({ question, answer });
      }
    }
  }

  return faqs.slice(0, 10); // Max 10 FAQ items
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function generateSchemaMarkup(article: ArticleSchemaInput): string {
  const schemas: object[] = [];

  // Article schema
  const articleSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description || stripHtml(article.content).substring(0, 160),
    datePublished: article.created_at || new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Editorial Team',
    },
  };

  if (article.published_url) articleSchema.url = article.published_url;
  if (article.featured_image_url) {
    articleSchema.image = {
      '@type': 'ImageObject',
      url: article.featured_image_url,
    };
  }

  schemas.push(articleSchema);

  // FAQ schema if FAQs detected
  const faqs = extractFAQs(article.content);
  if (faqs.length >= 2) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  // HowTo detection: look for ordered list with 3+ steps after a "how to" heading
  const howToMatch = article.content.match(/<h[12][^>]*>.*?how to.*?<\/h[12]>/i);
  if (howToMatch) {
    const listMatch = article.content.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (listMatch) {
      const steps = [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          text: m[1].replace(/<[^>]*>/g, '').trim(),
        }))
        .filter(s => s.text.length > 10);

      if (steps.length >= 3) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: article.title,
          step: steps,
        });
      }
    }
  }

  return schemas
    .map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
    .join('\n');
}

export function injectSchemaIntoContent(content: string, article: ArticleSchemaInput): string {
  const schema = generateSchemaMarkup(article);
  return schema + '\n' + content;
}
